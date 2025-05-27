export default async function getPostText(): Promise<string | null> {
  const username = "LFC_pl";
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("Brak tokena dostępu do Twitter API (TWITTER_BEARER_TOKEN).");
  }

  const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!userResp.ok) {
    throw new Error(`Błąd przy pobieraniu użytkownika Twittera: ${userResp.statusText}`);
  }

  const userData = await userResp.json();
  const userId = userData.data?.id;

  if (!userId) {
    throw new Error("Nie znaleziono ID użytkownika Twittera.");
  }

  const tweetsResp = await fetch(`https://api.twitter.com/2/users/${userId}/tweets`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!tweetsResp.ok) {
    throw new Error(`Błąd przy pobieraniu tweetów: ${tweetsResp.statusText}`);
  }

  const tweetsData = await tweetsResp.json();
  const tweets = tweetsData.data;

  if (!tweets || tweets.length === 0) {
    throw new Error("Nie znaleziono żadnych tweetów.");
  }

  // Znajdź pierwszy tweet, który NIE zawiera linków do Twittera/X
  const cleanTweet = tweets.find((tweet: any) => {
  const text = tweet.text.trim();

  // Pomijaj odpowiedzi
  if (text.startsWith("@")) return false;

  const urls = text.match(/https?:\/\/[^\s]+/g);

  // Jeśli nie ma linków, tweet jest OK
  if (!urls) return true;

  // Sprawdź, czy żadna z domen nie wskazuje na Twittera/X
  return !urls.some((url: string) =>
    url.includes("t.co") || url.includes("x.com") || url.includes("twitter.com")
  );
});

  if (!cleanTweet) {
    console.log("Brak tweetów bez linków do Twittera/X. Przerywam.");
    return null;
  }

  return cleanTweet.text;
}
