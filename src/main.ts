import getPostsToPublish from "./getPostText.js";
import Bot from "./bot.js";
import { bskyAccount } from "./config.js";
import fs from "fs/promises";
import path from "path";

const LAST_TWEET_FILE = ".lastTweet";

async function main() {
  const posts = await getPostsToPublish();

  if (posts.length === 0) {
    console.log("Brak nowych tweetów do opublikowania.");
    return;
  }

  const bot = new Bot(Bot.defaultOptions.service);
  await bot.login(bskyAccount);

  for (const post of posts) {
    const { id, text, images } = post;
    try {
      const result = await bot.post({ text, images });
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
