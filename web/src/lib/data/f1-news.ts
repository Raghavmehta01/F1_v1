import { CACHE_TTL } from "@/lib/data/cache";
import { safeFetch } from "@/lib/security";
import { createUpstreamCache } from "@/lib/data/upstream-cache";

const FEED = "https://www.formula1.com/en/latest/all.xml";
const USER_AGENT = "F1_v1/0.1.0 (https://github.com/Raghavmehta01/F1_v1)";
const newsCache = createUpstreamCache("F1News");

export type F1Headline = {
  title: string;
  href: string;
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = block.match(re);
  return m?.[1] ? decodeXml(m[1]) : null;
}

function parseHeadlines(xml: string, limit: number): F1Headline[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  const out: F1Headline[] = [];
  const seen = new Set<string>();

  for (const match of items) {
    const block = match[1] ?? "";
    const title = tag(block, "title");
    const href = tag(block, "link") ?? tag(block, "guid");
    if (!title || !href) continue;
    if (!href.startsWith("https://www.formula1.com/")) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ title, href });
    if (out.length >= limit) break;
  }

  return out;
}

/** Latest official F1.com headlines for the hero pit-wall strip. */
export async function getF1Headlines(limit = 6): Promise<F1Headline[]> {
  const xml = await newsCache.getText(
    FEED,
    () =>
      safeFetch(FEED, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
          "User-Agent": USER_AGENT,
        },
        next: { revalidate: CACHE_TTL.news },
      }),
    { ttlSec: CACHE_TTL.news, staleSec: CACHE_TTL.newsStale },
  );

  return parseHeadlines(xml, limit);
}
