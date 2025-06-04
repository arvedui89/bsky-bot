import fs from "fs/promises";
import path from "path";

const LAST_TWEET_FILE = ".lastTweet";
const MAX_TWEETS_TO_CHECK = 10;

export default async function getPostsToPublish(): Promise<Array<{ id: string; text: string; images?: string[] }>> {
  const username = "LFC_pl";
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("Brak tokena TWITTER_BEARER_TOKEN.");
  }

  const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  const userData = await userResp.json();
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

  const tweetsData = await tweetsResp.json();
  const tweets = tweetsData.data || [];
  const mediaIncludes = tweetsData.includes?.media || [];

  let lastPostedId: string | null = null;
  try {
    const savedId = await fs.readFile(path.resolve(LAST_TWEET_FILE), "utf8");
    lastPostedId = savedId.trim();
  } catch {
    console.log("Brak pliku .lastTweet.");
  }

  const posts: Array<{ id: string; text: string; images?: string[] }> = [];

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
      // Warianty testowe — odkomentuj jeden lub połącz oba

      // 1. Zero-width space po linku:
      const modifiedUrl = url.expanded_url + "\u200B";

      // 2. Pusta linia po linku:
      // const modifiedUrl = url.expanded_url + "\n\n";

      // 3. Kombinacja obu:
      const modifiedUrl = url.expanded_url + "\u200B\n\n";

      expandedText = expandedText.replace(url.url, modifiedUrl);
    }

    if (expandedText === null) continue;

    const mediaKeys = tweet.attachments?.media_keys || [];
    const mediaUrls = mediaKeys
      .map((key: string) => mediaIncludes.find((m: any) => m.media_key === key && m.type === "photo")?.url)
      .filter((url: string | undefined): url is string => !!url);

    const finalText = expandedText.trim();

    if (finalText === "" && mediaUrls.length === 0) {
      console.log("❌ Pominięto: pusty tweet bez zdjęć.");
      continue;
    }

    posts.push({ id, text: finalText, images: mediaUrls });
  }

  // Odwracamy kolejność: od najstarszego do najnowszego
  return posts.reverse();
}
