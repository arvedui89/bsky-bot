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

  if (!post || !post.text) {
    console.log("Brak treści do opublikowania. Przerywam.");
    return;
  }

  const { text, images } = post;
  console.log("Publikuję post z treścią i zdjęciami:", { text, images });

  await Bot.run(() => Promise.resolve({ text, images }), { dryRun: false });
  console.log(`[${new Date().toISOString()}] Opublikowano: "${text}"`);
})();
