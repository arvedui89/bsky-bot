// getPostText.ts
import fs from "fs/promises";
import path from "path";

const LAST_TWEET_FILE = ".lastTweet";
const MAX_TWEETS_TO_CHECK = 10;

export default async function getPostText(): Promise<{ text: string, mediaUrls: string[] } | null> {
  const username = "LFC_pl";
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) throw new Error("Brak tokena dostępu do Twitter API (TWITTER_BEARER_TOKEN).");

  const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  const userData = await userResp.json();
  const userId = userData.data?.id;
  if (!userId) throw new Error("Nie znaleziono ID użytkownika Twittera.");

  const tweetsResp = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${MAX_TWEETS_TO_CHECK}&tweet.fields=text,attachments,referenced_tweets,entities&expansions=attachments.media_keys&media.fields=type,url,preview_image_url`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  );
  if (!tweetsResp.ok) {
    const errorBody = await tweetsResp.text();
    throw new Error(`Błąd przy pobieraniu tweetów: ${tweetsResp.statusText}\n${errorBody}`);
  }

  const tweetsData = await tweetsResp.json();
  const tweets = tweetsData.data;
  const mediaMap = new Map<string, any>();
  if (tweetsData.includes?.media) {
    for (const media of tweetsData.includes.media) {
      if (media.type === "photo") {
        mediaMap.set(media.media_key, media);
      }
    }
  }

  if (!tweets || tweets.length === 0) return null;

  let lastPostedId: string | null = null;
  try {
    const savedId = await fs.readFile(path.resolve(LAST_TWEET_FILE), "utf8");
    lastPostedId = savedId.trim();
  } catch {}

  for (const tweet of tweets) {
    const id = tweet.id;
    const originalText = tweet.text || "";

    if (id === lastPostedId) continue;
    if (tweet.referenced_tweets?.some((ref: any) => ref.type === "retweeted")) continue;
    if (originalText.trim().startsWith("@")) continue;

    const expandedUrls: string[] =
      tweet.entities?.urls?.map((u: any) => u.expanded_url) || [];
    if (expandedUrls.some(url => url.includes("twitter.com") || url.includes("x.com"))) continue;

    let finalText = originalText;
    if (tweet.entities?.urls) {
      for (const urlObj of tweet.entities.urls) {
        if (urlObj.url && urlObj.expanded_url) {
          finalText = finalText.replace(urlObj.url, urlObj.expanded_url);
        }
      }
    }

    const mediaUrls: string[] = [];
    if (tweet.attachments?.media_keys) {
      for (const key of tweet.attachments.media_keys) {
        const media = mediaMap.get(key);
        if (media?.url) {
          mediaUrls.push(media.url);
        }
      }
    }

    if (!finalText.trim() && mediaUrls.length > 0) {
      finalText = "[Tweet zawiera tylko media]";
    }
    if (!finalText.trim() && mediaUrls.length === 0) continue;

    await fs.writeFile(path.resolve(LAST_TWEET_FILE), id, "utf8");

    return { text: finalText, mediaUrls };
  }

  return null;
}
