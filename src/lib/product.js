import * as cheerio from "cheerio";

function toIsoDate(text) {
  const m = text && text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseLeadingYen(text) {
  const m = text && text.match(/(\d[\d,]*)\s*円/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

// Collects all dt/dd pairs from every dl.t-c-detail-about-information__data
// block on the page (the page renders more than one such block) into a
// single key(dt text) -> cheerio($dd) lookup.
function collectDlPairs($) {
  const pairs = {};
  $("dl.t-c-detail-about-information__data").each((_, dlEl) => {
    const children = $(dlEl).children().toArray();
    for (let i = 0; i < children.length; i++) {
      if (children[i].tagName === "dt") {
        const key = $(children[i]).text().trim();
        const ddEl = children[i + 1];
        if (ddEl && ddEl.tagName === "dd") {
          pairs[key] = $(ddEl);
        }
      }
    }
  });
  return pairs;
}

function parseProductJsonLd($) {
  let product = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    try {
      const data = JSON.parse($(el).contents().text());
      if (data && data["@type"] === "Product") product = data;
    } catch {
      // ignore malformed JSON-LD blocks
    }
  });
  return product;
}

function parseProductPage(html, { uuid, lightNovelType }) {
  const $ = cheerio.load(html);
  const pairs = collectDlPairs($);
  const jsonLd = parseProductJsonLd($);

  const seriesDd = pairs["シリーズ"];
  const seriesLink = seriesDd ? seriesDd.find("a").first() : null;
  const seriesFullText = seriesLink && seriesLink.length
    ? seriesLink.text().trim()
    : seriesDd
    ? seriesDd.text().trim()
    : "";
  const seriesHref = seriesLink ? seriesLink.attr("href") : null;
  const seriesId = seriesHref
    ? (seriesHref.match(/series\/(\d+)\//) || [])[1] ?? null
    : null;
  const seriesName = seriesFullText.replace(/（[^）]*）\s*$/, "").trim();

  const labelDd = pairs["レーベル"];
  const label = labelDd
    ? (labelDd.find("a").first().text().trim() || labelDd.text().trim())
    : null;

  const publisherDd = pairs["出版社"];
  const publisher =
    (publisherDd && publisherDd.text().trim()) ||
    (jsonLd && jsonLd.brand && jsonLd.brand.name) ||
    null;

  const staffDd = pairs["著者"];
  const staff = [];
  if (staffDd) {
    staffDd.find("li").each((_, li) => {
      const text = $(li).text().trim();
      const m = text.match(/^(.*?)\(([^)]*)\)\s*$/);
      if (m) {
        staff.push({ name: m[1].trim(), role: m[2].trim() });
      } else if (text) {
        staff.push({ name: text, role: null });
      }
    });
  }

  const saleDate = toIsoDate(pairs["配信開始日"] ? pairs["配信開始日"].text().trim() : "");
  const originalPublicationDate = toIsoDate(
    pairs["底本発行日"] ? pairs["底本発行日"].text().trim() : ""
  );

  const priceBeforeTax = parseLeadingYen(
    $(".t-c-product-action-parts-price__tax").first().text()
  );
  const priceAfterTaxFromDom = parseLeadingYen(
    $(".t-c-product-action-parts-price__value").first().text() + "円"
  );
  const priceAfterTax =
    (jsonLd && jsonLd.offers && Number(jsonLd.offers.price)) ||
    priceAfterTaxFromDom ||
    null;

  const reservationText = $(".t-c-book-cover-main__count.--reserve em")
    .first()
    .text()
    .trim();
  const reservationNumber = reservationText
    ? Number(reservationText.replace(/[^\d]/g, "")) || 0
    : 0;

  const titleName = (jsonLd && jsonLd.name) || $("title").text().trim();
  const synopsis = (jsonLd && jsonLd.description) || null;

  return {
    productUuid: uuid,
    titleName,
    lightNovelType,
    publisher,
    priceBeforeTax,
    priceAfterTax,
    synopsis,
    originalPublicationDate,
    saleDate,
    staff,
    seriesId,
    seriesName,
    label,
    reservationNumber,
  };
}

export { parseProductPage };
