const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterDelay(minMs = 500, maxMs = 1200) {
  return minMs + Math.random() * (maxMs - minMs);
}

async function fetchWithRetry(url, { retries = 3 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoffMs = [2000, 5000, 15000][attempt - 1] ?? 15000;
      await sleep(backoffMs);
    }
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "ja,en;q=0.8",
        },
      });
      if (res.status === 429 || res.status === 503) {
        const retryAfter = Number(res.headers.get("retry-after"));
        if (!Number.isNaN(retryAfter) && retryAfter > 0) {
          await sleep(retryAfter * 1000);
        }
        lastError = new Error(`HTTP ${res.status} for ${url}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return await res.text();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function politeFetch(url, options) {
  await sleep(jitterDelay());
  return fetchWithRetry(url, options);
}

export { politeFetch, fetchWithRetry, sleep, jitterDelay };
