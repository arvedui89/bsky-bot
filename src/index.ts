// @ts-ignore 
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

console.log("BSKY_HANDLE:", process.env.BSKY_HANDLE);
console.log("Starting bot…");

import Bot from "./lib/bot.js";
import getPostsToPublish from "./lib/getPostText.js";

const normalize = (id: string | number | null | undefined): string =>
  (id ?? "").toString().trim().replace(/[\r\n]/g, "");

(async () => {
  const posts = await getPostsToPublish();

  if (!posts || posts.length === 0) {
    console.log("Brak nowych tweetów do publikacji.");
    return;
  }

  const pathToIdFile = path.resolve(".lastTweet");
  const lastPost = posts[posts.length - 1]; // ostatni z listy = najnowszy tweet, jaki zaraz opublikujemy

  for (const post of posts) {
    console.log("📤 Publikuję tweet:", { id: post.id, text: post.text });

    await Bot.run(() => Promise.resolve({ text: post.text, images: post.images }), { dryRun: false });

    console.log(`[${new Date().toISOString()}] ✅ Opublikowano: "${post.text}"`);
  }

  if (lastPost?.id) {
    fs.writeFileSync(pathToIdFile, normalize(lastPost.id), "utf8");
    console.log("💾 Zaktualizowano .lastTweet na:", lastPost.id);
  } else {
    console.warn("⚠️ Brak ID ostatniego wpisu – nie zapisano .lastTweet");
  }
})();
