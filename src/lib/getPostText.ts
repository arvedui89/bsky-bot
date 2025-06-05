import fs from "fs/promises";
import path from "path";

const LAST_TWEET_FILE = ".lastTweet";
const MAX_TWEETS_TO_CHECK = 10;

async function getExternalMetadataFromLink(url: string) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    const html = await res.text();

    const getMeta = (property: string) => {
      const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
      const match = html.match(regex);
      return match ? match[1] : undefined;
    };

    return {
      text,
      external: {
        uri: url,
        title: getMeta("og:title") || getMeta("twitter:title"),
        description: getMeta("og:description") || getMeta("twitter:description"),
        thumbnail: getMeta("og:image") || getMeta("twitter:image"),
      }
    };
  } catch (e) {
    console.warn("❌ Nie udało się pobrać metadanych z linku:", url);
    return undefined;
  }
}

export default async function getPostsToPublish(): Promise<Array<{ id: string; text: string; images?: string[], external?: any }>> {
  const username = "LFC_pl";
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("Brak tokena TWITTER_BEARER_TOKEN.");
  }

  const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  const userData = await userResp.json() as any;
  const userId = userData.data?.id;
  if (!userId) throw new Error("Nie znaleziono ID użytkownika Twittera.");

  const tweetsResp = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${MAX_TWEETS_TO_CHECK}&tweet.fields=text,attachments,referenced_tweets,entities&expansions=attachments.media_keys&media.fields=url,type`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
    }
  );

  if (!tweetsResp.ok) {
    const errorText = await tweetsResp.text();
    throw new Error(`Błąd pobierania tweetów: ${tweetsResp.statusText}\n${errorText}`);
  }

  const tweetsData = await tweetsResp.json() as any;
  const tweets = tweetsData.data || [];
  const mediaIncludes = tweetsData.includes?.media || [];

  let lastPostedId: string | null = null;
  try {
    const savedId = await fs.readFile(path.resolve(LAST_TWEET_FILE), "utf8");
    lastPostedId = savedId.trim();
  } catch {
    console.log("Brak pliku .lastTweet.");
  }

  const posts: Array<{ id: string; text: string; images?: string[], external?: any }> = [];

  for (const tweet of tweets) {
    const id = tweet.id;
    const rawText: string = tweet.text ?? "";

    if (id === lastPostedId) {
      console.log("✅ Zatrzymano na ostatnio opublikowanym tweecie.");
      break;
    }

    if (tweet.referenced_tweets?.some((ref: any) => ref.type === "retweeted")) {
      console.log("❌ Pominięto: retweet.");
      continue;
    }

    if (rawText.trim().startsWith("@")) {
      console.log("❌ Pominięto: odpowiedź.");
      continue;
    }

    const urls = tweet.entities?.urls || [];
    let expandedText: string | null = rawText;

    for (const url of urls) {
      if (url.expanded_url.includes("twitter.com") || url.expanded_url.includes("x.com")) {
        console.log("❌ Pominięto: zawiera link do X/Twittera.");
        expandedText = null;
        break;
      }
      const cleanUrl = url.expanded_url.replace(/^http:\/\//, "https://");
      expandedText = expandedText.replace(url.url, cleanUrl);
    }

    if (expandedText === null) continue;

    const mediaKeys = tweet.attachments?.media_keys || [];
    const mediaUrls = mediaKeys
      .map((key: string) => mediaIncludes.find((m: any) => m.media_key === key && m.type === "photo")?.url)
      .filter((url: string | undefined): url is string => !!url);

    const lastValidUrl = urls.find(
      (u: any) =>
        !u.expanded_url.includes("twitter.com") &&
        !u.expanded_url.includes("x.com") &&
        !u.expanded_url.includes("pic.twitter.com")
    )?.expanded_url?.replace(/^http:\/\//, "https://");

    let finalText = expandedText.trim();

    if (lastValidUrl) {
      const linkRegex = new RegExp(lastValidUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const linkInOwnParagraph = finalText.split("\n").some(line => line.trim() === lastValidUrl);

      if (!linkRegex.test(finalText) || !linkInOwnParagraph) {
        finalText += `\n\n${lastValidUrl}`;
      }
    }

    let external;
    if (lastValidUrl && mediaUrls.length === 0) {
      external = await getExternalMetadataFromLink(lastValidUrl);
    }

    if (finalText === "" && mediaUrls.length === 0 && !external) {
      console.log("❌ Pominięto: pusty tweet bez zdjęć i linków.");
      continue;
    }

    posts.push({ id, text: finalText, images: mediaUrls, external });
  }

  return posts.reverse();
}
