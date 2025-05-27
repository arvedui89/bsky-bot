// @ts-ignore
import dotenv from "dotenv";
dotenv.config();
console.log('Loaded ENV:');
console.log('BSKY_HANDLE:', process.env.BSKY_HANDLE);
console.log('BSKY_PASSWORD:', process.env.BSKY_PASSWORD);
console.log("Starting bot…");

import Bot from "./lib/bot.js";
import getPostText from "./lib/getPostText.js";

const text = await getPostText();

if (!text) {
  console.log("Brak tekstu do opublikowania. Przerywam.");
  return;
}

await Bot.run(() => Promise.resolve(text), { dryRun: false });

console.log(`[${new Date().toISOString()}] Posted: "${text}"`);
