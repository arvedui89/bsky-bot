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

// Uniwersalna funkcja normalizacji ID
function normalize(id: string | number | null | undefined): string {
  return (id ?? "").toString().trim().replace(/[\r\n]/g, "");
}

(async () => {
  const post = await getPostText();

  if (!post || !post.text) {
    console.log("Brak treści do opublikowania. Przerywam.");
    return;
  }

  const pathToIdFile = path.resolve(".lastTweet");

  const lastId = normalize(fs.existsSync(pathToIdFile) ? fs.readFileSync(pathToIdFile, "utf8") : null);
  const currentId = normalize(post.id);

  // 🔍 Szczegółowe logowanie porównania
  console.log("➡️ current post.id:", JSON.stringify(currentId));
  console.log("➡️ cached lastId:", JSON.stringify(lastId));
  console.log("ℹ️ typeof currentId:", typeof currentId);
  console.log("ℹ️ typeof lastId:", typeof lastId);
  console.log("🧪 Czy identyczne?", currentId === lastId);

  if (currentId === lastId) {
    console.log(`❌ Ten sam wpis (${currentId}) został już opublikowany. Przerywam.`);
    return;
  }

  const { text, images } = post;
  console.log("✅ Publikuję post z treścią i zdjęciami:", { text, images });

  await Bot.run(() => Promise.resolve({ text, images }), { dryRun: false });
  console.log(`[${new Date().toISOString()}] ✅ Opublikowano: "${text}"`);

  if (currentId) {
    fs.writeFileSync(pathToIdFile, currentId, "utf8");
    console.log("💾 Zaktualizowano .lastTweet na:", currentId);
  } else {
    console.warn("⚠️ Brak post.id – nie zapisano .lastTweet");
  }
})();
