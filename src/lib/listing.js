import * as cheerio from "cheerio";
import { politeFetch } from "./http.js";

const SCHEDULE_URL =
  "https://bookwalker.jp/schedule/?qsto=st1&qnot_bnst=1&detail=0&page=";

const GENRE_BY_TAG_CLASS = {
  "a-tag-LN": "ラノベ",
  "a-tag-other": "新文芸",
};

const MAX_PAGES_SAFETY_CAP = 50;

async function crawlSchedulePages({ log = () => {} } = {}) {
  const items = new Map(); // uuid -> genreTag

  for (let page = 1; page <= MAX_PAGES_SAFETY_CAP; page++) {
    const url = `${SCHEDULE_URL}${page}`;
    log(`Fetching schedule page ${page}: ${url}`);
    const html = await politeFetch(url);
    const $ = cheerio.load(html);
    const blocks = $(".m-book-item");

    if (blocks.length === 0) {
      log(`Page ${page} has no items, stopping pagination.`);
      break;
    }

    blocks.each((_, el) => {
      const $el = $(el);
      const genreClass = Object.keys(GENRE_BY_TAG_CLASS).find(
        (cls) => $el.find(`span.${cls}`).length > 0
      );
      if (!genreClass) return; // not ラノベ/新文芸 (e.g. 画集/ゲーム) - skip

      const uuid = $el.find("[data-uuid]").first().attr("data-uuid");
      if (!uuid) return;

      if (!items.has(uuid)) {
        items.set(uuid, GENRE_BY_TAG_CLASS[genreClass]);
      }
    });

    const pageText = $("body").text();
    const lastPageMatch = pageText.match(/(\d+)\s*件目\s*\/\s*全\s*(\d+)\s*件/);
    if (lastPageMatch) {
      const [, upTo, total] = lastPageMatch;
      if (Number(upTo) >= Number(total)) {
        log(`Reached last page (${upTo}/${total} items).`);
        break;
      }
    }
  }

  return [...items.entries()].map(([uuid, genreTag]) => ({
    uuid,
    lightNovelType: genreTag,
  }));
}

export { crawlSchedulePages };
