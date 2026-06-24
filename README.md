# reservelogs

Daily scraper for BookWalker (https://bookwalker.jp) light novel (ラノベ/新文芸)
pre-order reservation counts. Runs once a day via GitHub Actions cron at
00:30 JST and appends each title's reservation snapshot to a single data
file for time-series analysis.

## How it works

1. Crawls the schedule listing (`/schedule/?qsto=st1&qnot_bnst=1&detail=0`),
   paginating until the last page, collecting every product tagged ラノベ
   or 新文芸 (other tags like 画集/ゲーム that appear on the same filtered
   pages are skipped).
2. Visits each product's detail page and parses: publisher, label, price
   before/after tax, series name, title name, synopsis, product UUID,
   original publication date (底本発行日), sale date (配信開始日), staff
   (author/illustrator/etc.), and today's reservation count.
3. Merges the result into `data/reservations.json`: existing series/titles
   are updated in place, today's reservation count is appended to each
   title's `reservationHistory`, and nothing is ever deleted. Once a title
   goes on sale it simply drops off the schedule list and stops receiving
   new history entries — its past data stays in the file.

## Data file

`data/reservations.json` — single file, grouped by series:

```json
{
  "lastUpdated": "2026-06-24",
  "series": [
    {
      "seriesId": "284993",
      "seriesName": "義妹生活",
      "label": "MF文庫J",
      "titles": [
        {
          "productUuid": "29cbebfb-9871-4ae4-a827-e418a82fbbba",
          "titleName": "義妹生活17【電子特典付き】",
          "lightNovelType": "ラノベ",
          "publisher": "KADOKAWA",
          "priceBeforeTax": 800,
          "priceAfterTax": 880,
          "synopsis": "...",
          "originalPublicationDate": "2026-06-25",
          "saleDate": "2026-06-25",
          "staff": [
            { "name": "三河ごーすと", "role": "著者" },
            { "name": "Hiten", "role": "イラスト" }
          ],
          "firstSeenDate": "2026-06-24",
          "lastSeenOnScheduleDate": "2026-06-24",
          "reservationHistory": [
            { "date": "2026-06-24", "reservationNumber": 8 }
          ]
        }
      ]
    }
  ]
}
```

## Running locally

```
npm install
npm run scrape
```

Crawls sequentially with jittered delays and retry/backoff to stay polite
to the source site; a full run (~200+ products) takes a few minutes.
