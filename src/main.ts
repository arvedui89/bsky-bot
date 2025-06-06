import getPostsToPublish from "./lib/getPostText.js";
import Bot from "./lib/bot.js";
import { bskyAccount } from "./lib/config.js";
import fs from "fs/promises";
import path from "path";

const LAST_TWEET_FILE = ".lastTweet";

async function main() {
  const posts = await getPostsToPublish();

  console.log("🔍 Debug postów:", JSON.stringify(posts, null, 2));

  if (posts.length === 0) {
    console.log("Brak nowych tweetów do opublikowania.");
    return;
  }

  const bot = new Bot(Bot.defaultOptions.service);
  await bot.login(bskyAccount);

  for (const post of posts) {
  const { id, text, images, external } = post; // dodaj external tutaj
  try {
    const result = await bot.post({ text, images, external }); // i przekaż dalej
    console.log(`✅ Opublikowano tweet ${id} na Bluesky.`);

    // Zapisz ID ostatniego opublikowanego tweeta
    await fs.writeFile(path.resolve(LAST_TWEET_FILE), id, "utf8");
  } catch (err) {
    console.error(`❌ Błąd przy publikacji tweeta ${id}:`, err);
  }
}
}

main().catch((err) => {
  console.error("❌ Błąd główny:", err);
});
