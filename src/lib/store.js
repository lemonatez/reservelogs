import fs from "node:fs";
import path from "node:path";

const DATA_PATH = path.resolve(process.cwd(), "data", "reservations.json");

function loadData(dataPath = DATA_PATH) {
  if (!fs.existsSync(dataPath)) {
    return { lastUpdated: null, series: [] };
  }
  const raw = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

function saveData(data, dataPath = DATA_PATH) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// Upserts a scraped product into the series/title tree and appends today's
// reservation snapshot. Existing titles not passed in here (already on sale,
// fell off the schedule) are left completely untouched by design.
function upsertTitle(data, parsed, today) {
  const seriesKey = parsed.seriesId ?? `standalone-${parsed.productUuid}`;

  let series = data.series.find((s) => s.seriesId === seriesKey);
  if (!series) {
    series = {
      seriesId: seriesKey,
      seriesName: parsed.seriesName || parsed.titleName,
      label: parsed.label,
      titles: [],
    };
    data.series.push(series);
  } else {
    series.seriesName = parsed.seriesName || series.seriesName;
    series.label = parsed.label || series.label;
  }

  let title = series.titles.find((t) => t.productUuid === parsed.productUuid);
  if (!title) {
    title = {
      productUuid: parsed.productUuid,
      titleName: parsed.titleName,
      lightNovelType: parsed.lightNovelType,
      publisher: parsed.publisher,
      priceBeforeTax: parsed.priceBeforeTax,
      priceAfterTax: parsed.priceAfterTax,
      synopsis: parsed.synopsis,
      originalPublicationDate: parsed.originalPublicationDate,
      saleDate: parsed.saleDate,
      staff: parsed.staff,
      firstSeenDate: today,
      lastSeenOnScheduleDate: today,
      reservationHistory: [],
    };
    series.titles.push(title);
  } else {
    title.titleName = parsed.titleName;
    title.lightNovelType = parsed.lightNovelType;
    title.publisher = parsed.publisher;
    title.priceBeforeTax = parsed.priceBeforeTax;
    title.priceAfterTax = parsed.priceAfterTax;
    title.synopsis = parsed.synopsis;
    title.originalPublicationDate = parsed.originalPublicationDate;
    title.saleDate = parsed.saleDate;
    title.staff = parsed.staff;
    title.lastSeenOnScheduleDate = today;
  }

  const alreadyHasToday = title.reservationHistory.some((h) => h.date === today);
  if (!alreadyHasToday) {
    title.reservationHistory.push({
      date: today,
      reservationNumber: parsed.reservationNumber,
    });
  }

  return data;
}

export { loadData, saveData, upsertTitle, DATA_PATH };
