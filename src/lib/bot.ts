import { bskyAccount, bskyService } from "./config.js";
import type {
  AppBskyFeedPost,
  AtpAgentLoginOpts,
  AtpAgentOptions,
} from "@atproto/api";
import { AtpAgent, RichText } from "@atproto/api";

interface BotOptions {
  service: string | URL;
  dryRun: boolean;
}

interface PostContent {
  text: string;
  images?: string[];
}

export default class Bot {
  #agent;

  static defaultOptions: BotOptions = {
    service: bskyService,
    dryRun: false,
  } as const;

  constructor(service: AtpAgentOptions["service"]) {
    this.#agent = new AtpAgent({ service });
  }

  login(loginOpts: AtpAgentLoginOpts) {
    return this.#agent.login(loginOpts);
  }

  async post({ text, images }: PostContent) {
    const richText = new RichText({ text });
    await richText.detectFacets(this.#agent);

    let embed = undefined;

    if (images && images.length > 0) {
      const uploaded = await Promise.all(
        images.map(async (url) => {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const type = response.headers.get("content-type") || "image/jpeg";

          const uploadResp = await this.#agent.uploadBlob(
            new Uint8Array(buffer),
            { encoding: type }
          );

          return {
            image: uploadResp.data.blob,
            alt: "Obrazek z tweeta",
          };
        })
      );

      embed = {
        $type: "app.bsky.embed.images",
        images: uploaded,
      };
    }

    const record: Partial<AppBskyFeedPost.Record> = {
      text: richText.text,
      facets: richText.facets,
      createdAt: new Date().toISOString(),
      embed,
    };

    return this.#agent.post(record);
  }

  static async run(
    getPostContent: () => Promise<PostContent>,
    botOptions?: Partial<BotOptions>
  ) {
    const { service, dryRun } = botOptions
      ? Object.assign({}, this.defaultOptions, botOptions)
      : this.defaultOptions;

    const bot = new Bot(service);
    await bot.login(bskyAccount);

    const { text, images } = await getPostContent();
    const content = { text: text.trim(), images };

    if (!dryRun) {
      await bot.post(content);
    } else {
      console.log("DRY RUN:", content);
    }

    return content.text;
  }
}
