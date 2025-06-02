// @ts-ignore 
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

console.log("Loaded ENV:");
console.log("BSKY_HANDLE:", process.env.BSKY_HANDLE);
console.log("BSKY_PASSWORD:", process.env.BSKY_PASSWORD);
console.log("Starting bot…");

import Bot from "./lib/bot.js";
import getPostText from "./lib/getPostText.js";

function normalizeId(id: string | null | undefined): string | null {
  return id ? id.trim().replace(/[\r\n]/g, "") : null;
}

(async () => {
  const post = await getPostText();

  if (!post || !post.text) {
    console.log("Brak treści do opublikowania. Przerywam.");
    return;
  }

  const currentId = normalizeId(post.id);
  const lastId = fs.existsSync(".lastTweet")
    ? normalizeId(fs.readFileSync(path.resolve(".lastTweet"), "utf8"))
    : null;

  if (lastId && currentId && lastId === currentId) {
    console.log(`❌ Ten sam wpis (${currentId}) został już opublikowany. Przerywam.`);
    return;
  }

  const { text, images } = post;
  console.log("✅ Publikuję post z treścią i zdjęciami:", { text, images });

  await Bot.run(() => Promise.resolve({ text, images }), { dryRun: false });
  console.log(`[${new Date().toISOString()}] ✅ Opublikowano: "${text}"`);

  if (currentId) {
    fs.writeFileSync(".lastTweet", currentId, "utf8");
    console.log("💾 Zaktualizowano .lastTweet na:", currentId);
  } else {
    console.warn("⚠️ Brak post.id – nie zapisano .lastTweet");
  }
})();
