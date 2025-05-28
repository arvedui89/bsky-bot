import fs from "fs/promises";
import path from "path";

const LAST_TWEET_FILE = ".lastTweet";
const MAX_TWEETS_TO_CHECK = 10;

export default async function getPostText(): Promise<{ text: string; images?: string[] } | null> {
  const username = "LFC_pl";
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("Brak tokena dostępu do Twitter API (TWITTER_BEARER_TOKEN).");
  }

  // Krok 1: Pobierz ID użytkownika
  const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  const userData = await userResp.json();
  const userId = userData.data?.id;

  if (!userId) {
    throw new Error("Nie znaleziono ID użytkownika Twittera.");
  }

  // Krok 2: Pobierz najnowsze tweety
  const tweetsResp = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${MAX_TWEETS_TO_CHECK}&tweet.fields=text,attachments,referenced_tweets,entities&expansions=attachments.media_keys&media.fields=url,type`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
    }
  );

  if (!tweetsResp.ok) {
    const errorBody = await tweetsResp.text();
    throw new Error(`Błąd przy pobieraniu tweetów: ${tweetsResp.statusText}\n${errorBody}`);
  }

  const tweetsData = await tweetsResp.json();
  const tweets = tweetsData.data;
  const mediaIncludes = tweetsData.includes?.media || [];

  if (!tweets || tweets.length === 0) {
    console.log("Brak tweetów.");
    return null;
  }

  // Krok 3: Wczytaj ID ostatniego opublikowanego tweeta
  let lastPostedId: string | null = null;
  try {
    const savedId = await fs.readFile(path.resolve(LAST_TWEET_FILE), "utf8");
    lastPostedId = savedId.trim();
  } catch {
    console.log("Brak pliku .lastTweet, to prawdopodobnie pierwsze uruchomienie.");
  }

  // Krok 4: Przejrzyj i wybierz tweet
  for (const tweet of tweets) {
    const text: string = tweet.text || "";
    const id: string = tweet.id;

    console.log("\nTweet ID:", id);
    console.log("Treść:", text.replace(/\s+/g, " ").slice(0, 80) + "...");

    if (id === lastPostedId) {
      console.log("❌ Pominięto: już opublikowany.");
      continue;
    }

    if (tweet.referenced_tweets?.some((ref: any) => ref.type === "retweeted")) {
      console.log("❌ Pominięto: retweet.");
      continue;
    }

    if (text.trim().startsWith("@")) {
      console.log("❌ Pominięto: odpowiedź.");
      continue;
    }

    const expandedUrls: string[] =
      tweet.entities?.urls?.map((u: any) => u.expanded_url) || [];

    if (expandedUrls.some(url =>
      url.includes("twitter.com") || url.includes("x.com")
    )) {
      console.log("❌ Pominięto: zawiera link do X/Twittera.");
      continue;
    }

    // Pobierz media z tweetu
    const mediaKeys = tweet.attachments?.media_keys || [];
    const mediaUrls = mediaKeys
      .map((key: string) =>
        mediaIncludes.find((m: any) => m.media_key === key && m.type === "photo")?.url
      )
      .filter((url: string | undefined): url is string => !!url);

    const finalText = text.trim();

    console.log("✅ Wybrano ten tweet do publikacji.");

    // Krok 5: Zapisz ID tweeta do pliku
    try {
      await fs.writeFile(path.resolve(LAST_TWEET_FILE), id, "utf8");
    } catch (err) {
      console.error("Nie udało się zapisać .lastTweet:", err);
    }

    return { text: finalText, images: mediaUrls };
  }

  console.log("Brak tweetów spełniających kryteria.");
  return null;
}
