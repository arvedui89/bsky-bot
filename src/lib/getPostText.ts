export default async function getPostText(): Promise<string> {
  const username = "LFC_pl"; // zamień na swoją nazwę, jeśli inna
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
  const latestTweet = tweetsData.data?.[0]?.text;

  if (!latestTweet) {
    throw new Error("Nie znaleziono żadnych tweetów do opublikowania.");
  }

  return latestTweet;
}