// Wczytaj .env (działa z ESM)
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

// Reszta dotychczasowego kodu – zostaje tak, jak było
import { env } from "node:process";
import { z } from "zod";
import type { AtpAgentLoginOpts } from "@atproto/api";

// ... i dalszy kod walidujący env przez zod itd.

const envSchema = z.object({
  BSKY_HANDLE: z.string().min(1),
  BSKY_PASSWORD: z.string().min(1),
  BSKY_SERVICE: z.string().min(1).default("https://bsky.social"),
});

const parsed = envSchema.parse(env);

export const bskyAccount: AtpAgentLoginOpts = {
  identifier: parsed.BSKY_HANDLE,
  password: parsed.BSKY_PASSWORD,
};

export const bskyService = parsed.BSKY_SERVICE;
