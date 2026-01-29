// app/api/stock-update/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickers, reportedTickers, trackedReports } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";


async function fetchTrackedTickers() {
  const rows = await db
	.selectDistinct({
	  ticker: tickers.ticker,
	  cik: tickers.cik,
	  lastSync: tickers.lastSync,
	})
	.from(trackedReports)
	.innerJoin(
	  reportedTickers,
	  eq(reportedTickers.reportID, trackedReports.reportID)
	)
	.innerJoin(
	  tickers,
	  eq(tickers.ticker, reportedTickers.tickerSymbol)
	);

  return rows.map((r) => ({
	ticker: r.ticker,
	cik: r.cik,
	// Formats the Date object to MM/DD/YYYY string
	lastSync: r.lastSync 
	  ? new Intl.DateTimeFormat('en-US').format(new Date(r.lastSync)) 
	  : null,
  })).filter(row => row.ticker && row.cik); 
}

type TickerData = {
  ticker: string;
  cik: string;
  lastSync: string | null;
};

function parseTickersFromJsonString(rawText: string): string[] {
  // rawText may be:
  // 1) '["AAPL","MSFT"]'
  // 2) '"[\\"AAPL\\",\\"MSFT\\"]"'   (double-encoded)
  // 3) '"AAPL,MSFT"'				 (string with commas)

  let first: unknown;
  try {
	first = JSON.parse(rawText);
  } catch {
	first = rawText;
  }

  // If it's already an array
  if (Array.isArray(first)) {
	return first.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }

  // If it's a string, it may contain JSON again
  if (typeof first === "string") {
	const s = first.trim();

	// try second JSON parse
	try {
	  const second = JSON.parse(s);
	  if (Array.isArray(second)) {
		return second.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
	  }
	  if (typeof second === "string") {
		return second.split(",").map(t => t.trim()).filter(Boolean);
	  }
	} catch {
	  // not JSON, assume comma-separated
	}

	return s.split(",").map(t => t.trim()).filter(Boolean);
  }

  throw new Error(`Tokenizer returned unexpected payload: ${rawText.slice(0, 200)}`);
}


// Helper to pause execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitUntilTokenizerReady(
  baseUrl: string,
  headers: Record<string, string>,
) {
  const maxAttempts = 60; // 10 minutes
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
	await sleep(10_000);

	try {
	  const res = await fetch(`${baseUrl}/health`, {
		method: "GET",
		headers: { ...headers, Accept: "application/json" },
	  });

	  const text = await res.text().catch(() => "");
	  console.log(
		`[tokenizer probe ${attempt}/${maxAttempts}] status=${res.status} body=${text.slice(0, 120)}`
	  );
	  let data: { ok: boolean } = { ok: false };
	  try {
		    data = JSON.parse(text);
	  } catch (e) {
		    // If text isn't JSON, we ignore the error and data remains {ok: false}
	  }

	  // 2. Check the LOGIC, not just the network status
	  if (res.ok && data.ok === true) {
			  return; // Success!
	  }

	  // 3. Log that we are waiting for status: RUNNING
	  if (res.ok && !data.ok) {
			  console.log(`[tokenizer probe] Reachable, but internal status is NOT ready.`);
	  }
	  if (res.status === 401 || res.status === 403) {
		throw new Error(`Tokenizer auth failed: ${res.status} ${text}`);
	  }
	} catch {
	  console.log(`[tokenizer probe ${attempt}/${maxAttempts}] unreachable`);
	}
  }

  throw new Error("Timeout: tokenizer never became ready.");
}


async function waitUntilModelReady(
  baseUrl: string,
  authHeader: Record<string, string>
) {
  const maxAttempts = 60; // 10 minutes
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
	await sleep(10_000);

	try {
	  const res = await fetch(`${baseUrl}/predict`, {
		method: "POST",
		headers: { ...authHeader, "Content-Type": "application/json" },
		// tiny probe payload just to confirm the container is up
		body: JSON.stringify({ tickers: ["AAPL"] }),
	  });

	  const text = await res.text().catch(() => "");
	  console.log(
		`[model probe ${attempt}/${maxAttempts}] status=${res.status} body=${text.slice(0, 120)}`
	  );

	  let data: { ok: boolean } = { ok: false };
	  try {
		    data = JSON.parse(text);
	  } catch (e) {
		    // If text isn't JSON, we ignore the error and data remains {ok: false}
	  }

	  // 2. Check the LOGIC, not just the network status
	  if (res.ok && data.ok === true) {
			  return; // Success!
	  }

	  // 3. Log that we are waiting for status: RUNNING
	  if (res.ok && !data.ok) {
			  console.log(`[model probe] Reachable, but internal status is NOT ready.`);
	  }
	  // If auth is wrong, don't keep waiting
	  if (res.status === 401 || res.status === 403) {
		throw new Error(`Model auth failed: ${res.status} ${text}`);
	  }
	} catch {
	  console.log(`[model probe ${attempt}/${maxAttempts}] unreachable`);
	}
  }

  throw new Error("Timeout: model never became ready.");
}



async function checkStocks(tickerData: TickerData[]): Promise<string[]> {
  const BASE_URL = "https://umwroom225-tokenizer.hf.space";
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) throw new Error("Missing HF_TOKEN env var");

  const headers = { Authorization: `Bearer ${HF_TOKEN}` };

  try {
	console.log("Requesting hardware upgrade...");
	const upgradeRes = await fetch(`${BASE_URL}/upgradeTS`, {
	  method: "POST",
	  headers: { ...headers, Accept: "application/json" },
	});

	const upgradeText = await upgradeRes.text().catch(() => "");
	if (!upgradeRes.ok) {
	  throw new Error(`Upgrade request failed: ${upgradeRes.status} ${upgradeText}`);
	}

	console.log("Waiting for Space to restart (probing /health)...");
	await waitUntilTokenizerReady(BASE_URL, headers);

	console.log("Hardware ready. Sending tickers...");
	const tokenRes = await fetch(`${BASE_URL}/tokenize`, {
  method: "POST",
  headers: {
	...headers,
	"Content-Type": "application/json",
	Accept: "application/json",
  },
  body: JSON.stringify(tickerData), // <-- send the array directly
});


	const tickersToUpdate = await tokenRes.json();
if (!Array.isArray(tickersToUpdate)) {
  throw new Error(`Unexpected tokenizer response: ${JSON.stringify(tickersToUpdate).slice(0,200)}`);
}

  return tickersToUpdate;

  } finally {
	console.log("Requesting hardware downgrade...");
	try {
	  await fetch(`${BASE_URL}/downgradeTS`, { method: "POST", headers });

	} catch (e) {
	  console.error("CRITICAL: Failed to downgrade hardware!", e);
	}
  }
}


async function getStockScores(symbols: string[]): Promise<number[]> {
  const BASE_URL = "https://umwroom225-model.hf.space";
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) throw new Error("Missing HF_TOKEN env var");

  const authHeader = { Authorization: `Bearer ${HF_TOKEN}` };

  const headers = {
	...authHeader,
	"Content-Type": "application/json",
	"Accept": "application/json",
  };

  try {
	// --- STEP 1: UPGRADE HARDWARE (POST) ---
	console.log("Requesting Model Space upgrade...");
	const upgradeRes = await fetch(`${BASE_URL}/upgradeModel`, {
	  method: "POST",
	  headers: { ...authHeader, "Accept": "application/json" },
	});

	if (!upgradeRes.ok) {
	  const text = await upgradeRes.text().catch(() => "");
	  throw new Error(`Model upgrade failed: ${upgradeRes.status} ${text}`);
	}

	await new Promise(resolve => setTimeout(resolve, 3000)); // Sleeps for 1 second

	// --- STEP 2: WAIT UNTIL READY (probe /predict) ---
	console.log("Waiting for Model Space to be ready (probing /predict)...");
	await waitUntilModelReady(BASE_URL, authHeader);

	// --- STEP 3: RUN INFERENCE ---
	console.log("Model ready. Fetching scores...");
	const response = await fetch(`${BASE_URL}/predict`, {
	  method: "POST",
	  headers,
	  body: JSON.stringify({ tickers: symbols }),
	});

	if (!response.ok) {
	  const text = await response.text().catch(() => "");
	  throw new Error(`HF scores endpoint failed: ${response.status} ${text}`);
	}

	const data = await response.json();

	if (!Array.isArray(data?.scores)) {
	  throw new Error(`Unexpected /predict response shape (missing scores array)`);
	}

	return data.scores as number[];
  } catch (error) {
	console.error("Error in getStockScores:", error);
	throw error;
  } finally {
	// --- STEP 4: DOWNGRADE HARDWARE (POST) ---
	console.log("Downgrading Model Space...");
	try {
	  await fetch(`${BASE_URL}/downgradeModel`, {
		method: "POST",
		headers: { ...authHeader, "Accept": "application/json" },
	  });
	} catch (e) {
	  console.error("CRITICAL: Failed to downgrade Model Space!", e);
	}
  }
}


async function updateStockScores(symbols: string[], scores: number[]) {
  if (symbols.length !== scores.length) {
	throw new Error(`symbols length (${symbols.length}) != scores length (${scores.length})`);
  }
  if (!symbols.length) return;

  // Build CASE statement safely
  const cases = symbols.map((sym, i) => sql`when ${tickers.ticker} = ${sym} then ${scores[i]}`);

  await db
	.update(tickers)
	.set({
	  rawScore: sql`case ${sql.join(cases, sql` `)} else ${tickers.rawScore} end`,
	  lastSync: sql`now()`,
	})
	.where(inArray(tickers.ticker, symbols));
}


export async function GET(req: Request) {
  try {
	// basic cron auth
	const url = new URL(req.url);
	if (url.searchParams.get("secret") !== process.env.CRON_SECRET) {
	  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const tracked = await fetchTrackedTickers();
	if (!tracked.length) {
	  return NextResponse.json({ message: "No tracked report tickers to update." });
	}

	// tokenizer decides which tickers to update
	const tickersToUpdate = await checkStocks(tracked);

	if (!tickersToUpdate.length) {
	  return NextResponse.json({ message: "Tokenizer returned no tickers to update." });
	}

	const scores = await getStockScores(tickersToUpdate);

	if (!Array.isArray(scores) || scores.length !== tickersToUpdate.length) {
	  throw new Error(`HF returned ${scores?.length ?? "unknown"} scores for ${tickersToUpdate.length} symbols`);
	}

	await updateStockScores(tickersToUpdate, scores);

	return NextResponse.json({
	  message: "Tracked report tickers updated successfully.",
	  updated: tickersToUpdate.length,
	});
  } catch (error) {
	console.error("Error in stock update:", error);
	return NextResponse.json({ error: "Failed to update stock scores." }, { status: 500 });
  }
}
