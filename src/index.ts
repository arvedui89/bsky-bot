// @ts-ignore 
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

console.log("Loaded ENV:");
console.log("BSKY_HANDLE:", process.env.BSKY_HANDLE);
console.log("BSKY_PASSWORD:", process.env.BSKY_PASSWORD);
console.log("Starting bot…");

import Bot from "./lib/bot.js";
import getPostText from "./lib/getPostText.js";

(async () => {
  const post = await getPostText();
if (!post || !post.text) return;

const lastId = readLastTweetId()?.trim().replace(/\r|\n/g, "");
const currentId = post.id?.trim().replace(/\r|\n/g, "");

console.log("📂 Odczytany lastTweet ID:", JSON.stringify(lastId));
console.log("🆕 ID aktualnego posta:", JSON.stringify(currentId));

if (lastId === currentId) {
  console.log(`❌ Ten sam wpis (${currentId}) został już opublikowany. Przerywam.`);
  return;
}

  const { text, images } = post;
  console.log("Publikuję post z treścią i zdjęciami:", { text, images });

  await Bot.run(() => Promise.resolve({ text, images }), { dryRun: false });
  console.log(`[${new Date().toISOString()}] Opublikowano: "${text}"`);

  if (post.id) {
    fs.writeFileSync(".lastTweet", post.id, "utf8");
    console.log("Zaktualizowano .lastTweet na:", post.id);
  } else {
    console.warn("⚠️ Brak post.id – nie zapisano .lastTweet");
  }
})();
