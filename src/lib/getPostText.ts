import fs from "fs/promises";
import path from "path";

const LAST_TWEET_FILE = ".lastTweet";
const MAX_TWEETS_TO_CHECK = 10;

export default async function getPostText(): Promise<string | null> {
  const username = "LFC_pl";
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("Brak tokena dostępu do Twitter API (TWITTER_BEARER_TOKEN).");
  }

  // Krok 1: Pobierz ID użytkownika
  const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!userResp.ok) {
    throw new Error(`Błąd przy pobieraniu użytkownika Twittera: ${userResp.statusText}`);
  }

  const userData = await userResp.json();
  const userId = userData.data?.id;

  if (!userId) {
    throw new Error("Nie znaleziono ID użytkownika Twittera.");
  }

  // Krok 2: Pobierz najnowsze tweety (z tekstem i mediami)
  const tweetsResp = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${MAX_TWEETS_TO_CHECK}&tweet.fields=text,attachments,referenced_tweets&expansions=attachments.media_keys&media.fields=url`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
    }
  );

  if (!tweetsResp.ok) {
    throw new Error(`Błąd przy pobieraniu tweetów: ${tweetsResp.statusText}`);
  }

  const tweetsData = await tweetsResp.json();
  const tweets = tweetsData.data;
  const mediaMap = new Map<string, any>();
  if (tweetsData.includes?.media) {
    for (const media of tweetsData.includes.media) {
      mediaMap.set(media.media_key, media);
    }
  }

  if (!tweets || tweets.length === 0) {
    console.log("Brak tweetów.");
    return null;
  }

  // Krok 3: Odczytaj ID ostatniego opublikowanego tweeta
  let lastPostedId: string | null = null;
  try {
    const savedId = await fs.readFile(path.resolve(LAST_TWEET_FILE), "utf8");
    lastPostedId = savedId.trim();
  } catch {
    // Brak pliku = pierwsze uruchomienie
  }

  // Krok 4: Filtruj i wybierz tweet spełniający warunki
  const suitableTweet = tweets.find((tweet: any) => {
    const text: string = tweet.text || "";
    const id: string = tweet.id;

    // pomiń, jeśli już opublikowano
    if (id === lastPostedId) return false;

    // pomiń retweety
    if (tweet.referenced_tweets?.some((ref: any) => ref.type === "retweeted")) return false;

    // pomiń odpowiedzi
    if (text.trim().startsWith("@")) return false;

    // pomiń tweety z linkami do X/Twittera
    const urls = text.match(/https?:\/\/\S+/g);
    if (urls && urls.some(url =>
      url.includes("twitter.com") || url.includes("x.com") || url.includes("t.co")
    )) {
      return false;
    }

    return true;
  });

  if (!suitableTweet) {
    console.log("Brak tweetów spełniających kryteria.");
    return null;
  }

  // Krok 5: Zapisz ID wybranego tweeta do pliku
  try {
    await fs.writeFile(path.resolve(LAST_TWEET_FILE), suitableTweet.id, "utf8");
    console.log("Zapisano ID tweeta:", suitableTweet.id);
  } catch (err) {
    console.error("Nie udało się zapisać .lastTweet:", err);
  }

  return suitableTweet.text || "[Tweet zawiera tylko media]";
}
