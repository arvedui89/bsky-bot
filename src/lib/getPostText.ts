import fs from "fs";
import path from "path";

export default async function getPostText(): Promise<string | null> {
  const username = "LFC_pl";
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const maxTweetsToCheck = 10;
  const lastTweetFile = path.resolve(".lastTweet");

  if (!bearerToken) {
    throw new Error("Brak tokena dostępu do Twitter API (TWITTER_BEARER_TOKEN).");
  }

  // Pobierz ID użytkownika na podstawie nazwy
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

  // Pobierz najnowsze tweety użytkownika
  const tweetsResp = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxTweetsToCheck}&tweet.fields=referenced_tweets`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!tweetsResp.ok) {
    throw new Error(`Błąd przy pobieraniu tweetów: ${tweetsResp.statusText}`);
  }

  const tweetsData = await tweetsResp.json();
  const tweets = tweetsData.data;

  if (!tweets || tweets.length === 0) {
    console.log("Brak tweetów.");
    return null;
  }

  // Odczytaj ostatnio opublikowany tweet (jeśli istnieje)
  let lastPostedId: string | null = null;
  if (fs.existsSync(lastTweetFile)) {
    lastPostedId = fs.readFileSync(lastTweetFile, "utf-8").trim();
  }

  for (const tweet of tweets) {
    const text = tweet.text;
    const tweetId = tweet.id;

    // Pomijamy jeśli już został opublikowany
    if (tweetId === lastPostedId) {
      console.log("Tweet już opublikowany, pomijam:", tweetId);
      continue;
    }

    // Pomijamy odpowiedzi i retweety
    const isReplyOrRetweet = tweet.referenced_tweets?.some((ref: any) =>
      ["replied_to", "retweeted"].includes(ref.type)
    );
    if (isReplyOrRetweet) {
      console.log("Pomijam odpowiedź lub retweet:", tweetId);
      continue;
    }

    // Pomijamy tweety zawierające linki do Twittera/X
    const urls = text.match(/https?:\/\/[^
\s]+/g);
    if (urls && urls.some((url: string) => url.includes("twitter.com") || url.includes("x.com") || url.includes("t.co"))) {
      console.log("Tweet zawiera link do Twittera/X, pomijam:", tweetId);
      continue;
    }

    // Zapisz ID tego tweeta jako ostatnio opublikowanego
    fs.writeFileSync(lastTweetFile, tweetId);
    return text;
  }

  console.log("Nie znaleziono odpowiedniego tweeta do opublikowania.");
  return null;
}
