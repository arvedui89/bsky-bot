import Parser from "rss-parser";

const parser = new Parser();

export default async function getPostText(): Promise<string> {
  const feed = await parser.parseURL("https://nitter.net/LFC_pl/rss");
  return feed.items?.[0]?.title ?? "Brak nowych tweetów";
}
