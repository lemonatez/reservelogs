import { crawlSchedulePages } from "./lib/listing.js";
import { parseProductPage } from "./lib/product.js";
import { loadData, saveData, upsertTitle, DATA_PATH } from "./lib/store.js";
import { politeFetch } from "./lib/http.js";

function todayJst() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA locale formats as YYYY-MM-DD
}

async function main() {
  const today = todayJst();
  console.log(`[scrape] Run date (JST): ${today}`);

  const data = loadData();
  console.log(`[scrape] Loaded existing data: ${data.series.length} series`);

  console.log("[scrape] Crawling schedule listing...");
  const items = await crawlSchedulePages({ log: console.log });
  console.log(`[scrape] Found ${items.length} ラノベ/新文芸 items on schedule.`);

  let success = 0;
  let failed = 0;
  for (const [index, item] of items.entries()) {
    const url = `https://bookwalker.jp/de${item.uuid}/`;
    console.log(`[scrape] (${index + 1}/${items.length}) ${url}`);
    try {
      const html = await politeFetch(url);
      const parsed = parseProductPage(html, item);
      upsertTitle(data, parsed, today);
      success++;
    } catch (err) {
      console.warn(`[scrape] WARN: failed to fetch/parse ${url}: ${err.message}`);
      failed++;
    }
  }

  data.lastUpdated = today;
  saveData(data);
  console.log(
    `[scrape] Done. success=${success} failed=${failed}. Wrote ${DATA_PATH}`
  );
}

main().catch((err) => {
  console.error("[scrape] FATAL", err);
  process.exit(1);
});
