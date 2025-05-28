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

  // Krok 2: Pobierz najnowsze tweety
  const tweetsResp = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${MAX_TWEETS_TO_CHECK}&tweet.fields=text`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
    }
  );

  if (!tweetsResp.ok) {
    throw new Error(`Błąd przy pobieraniu tweetów: ${tweetsResp.statusText}`);
  }

  const tweetsData = await tweetsResp.json();
  const tweets = tweetsData.data;

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
    // plik może nie istnieć przy pierwszym uruchomieniu — to OK
  }

  // Krok 4: Filtruj i znajdź pierwszy pasujący tweet
  const suitableTweet = tweets.find((tweet: any) => {
    const text: string = tweet.text;
    const id: string = tweet.id;

    if (id === lastPostedId) return false;                // już opublikowany
    if (text.startsWith("RT")) return false;              // retweet
    if (text.trim().startsWith("@")) return false;        // odpowiedź

    const urls = text.match(/https?:\/\/\S+/g);
    if (urls && urls.some(url =>
      url.includes("twitter.com") || url.includes("x.com") || url.includes("t.co")
    )) {
      return false; // zawiera link do X
    }

    return true;
  });

if (!suitableTweet) {
  console.log("Brak tweetów spełniających kryteria.");
  return null;
}

// Krok 5: Zapisz ID tweeta, który zaraz opublikujemy
await fs.writeFile(path.resolve(LAST_TWEET_FILE), suitableTweet.id, "utf8");
console.log("Zapisano ID opublikowanego tweeta:", suitableTweet.id);

return suitableTweet.text;
  
}
