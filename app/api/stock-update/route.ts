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

// Helper to pause execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkStocks(tickerData: TickerData[]): Promise<string[]> {
  const BASE_URL = "https://umwroom225-tokenizer.hf.space";
  const HF_TOKEN = process.env.HF_TOKEN;

  const headers = { Authorization: `Bearer ${HF_TOKEN}` };

  try {
    // --- STEP 1: REQUEST UPGRADE ---
    console.log("Requesting hardware upgrade...");
    const upgradeRes = await fetch(`${BASE_URL}/upgradeTS`, { headers });
    if (!upgradeRes.ok) throw new Error("Upgrade request failed");

    // --- STEP 2: POLL UNTIL READY (The new logic) ---
    console.log("Waiting for Space to restart on new hardware...");
    
    let attempts = 0;
    const maxAttempts = 30; // 30 * 10s = 5 minutes max wait
    let ready = false;

    while (attempts < maxAttempts) {
      try {
        // We wait 10 seconds between checks to give the container time to boot
        await sleep(10000); 

        const statusRes = await fetch(`${BASE_URL}/`, { headers });
        
        if (statusRes.ok) {
          const status = await statusRes.json();
          console.log(`Current Status: ${status.stage} on ${status.hardware}`);

          // We check for BOTH "RUNNING" stage and the correct hardware
          // Note: "cpu-upgrade" is the identifier for the upgraded CPU tier
          if (status.stage === "RUNNING" && status.hardware === "cpu-upgrade") {
            ready = true;
            break; 
          }
        }
      } catch (err) {
        // Fetch errors are expected while the container is down/restarting
        console.log("Space unreachable, retrying...");
      }
      attempts++;
    }

    if (!ready) {
      throw new Error("Timeout: Space failed to restart on upgraded hardware.");
    }

    // --- STEP 3: TOKENIZE ---
    console.log("Hardware ready. Sending tickers...");
    const jsonString = JSON.stringify(tickerData);
    const encodedParams = new URLSearchParams({ jsonTickers: jsonString });

    const tokenRes = await fetch(`${BASE_URL}/tokenize?${encodedParams}`, {
      method: "GET",
      headers,
    });

    if (!tokenRes.ok) {
      throw new Error(`Tokenize failed: ${tokenRes.status}`);
    }

	// Importantly the endpoint creates a set of tickers to actually update, it is returned as json to this typescript
    return await tokenRes.json();

  } catch (error) {
    console.error("Error in checkStocks workflow:", error);
    throw error;

  } finally {
    // --- STEP 4: DOWNGRADE (Always runs) ---
    console.log("Requesting hardware downgrade...");
    try {
      await fetch(`${BASE_URL}/downgradeTS`, { headers });
    } catch (e) {
      console.error("CRITICAL: Failed to downgrade hardware!", e);
    }
  }
}

async function getStockScores(symbols: string[]): Promise<number[]> {
  const BASE_URL = "https://umwroom225-model.hf.space";
  const HF_TOKEN = process.env.HF_TOKEN;

  const headers = {
    Authorization: `Bearer ${HF_TOKEN}`,
    "Content-Type": "application/json",
  };

  try {
    // --- STEP 1: UPGRADE HARDWARE ---
    // Note: Verify if your Python endpoint is named '/upgradeModel', '/upgrade', etc.
    console.log("Requesting Model Space upgrade...");
    const upgradeRes = await fetch(`${BASE_URL}/upgradeModel`, { 
        method: "GET", 
        headers: { Authorization: `Bearer ${HF_TOKEN}` } 
    });
    
    if (!upgradeRes.ok) {
       // Optional: Log but don't crash if it's already upgraded? 
       // For now, we throw error to be safe.
       throw new Error(`Model upgrade failed: ${upgradeRes.status}`);
    }

    // --- STEP 2: POLL UNTIL RUNNING ---
    console.log("Waiting for Model Space to restart...");
    let attempts = 0;
    let ready = false;

    while (attempts < 30) { // 5 minutes max
      await sleep(10000); 
      try {
        const statusRes = await fetch(`${BASE_URL}/`, { 
            method: "GET", 
            headers: { Authorization: `Bearer ${HF_TOKEN}` } 
        });

        if (statusRes.ok) {
          const status = await statusRes.json();
          // Adjust 'gpu-medium' or 'gpu-small' to match your actual hardware target
          if (status.stage === "RUNNING" && status.hardware === "gpu-medium") {
            ready = true;
            break;
          }
        }
      } catch (e) {
        console.log("Model Space unreachable, retrying...");
      }
      attempts++;
    }

    if (!ready) throw new Error("Timeout: Model Space failed to restart.");

    // --- STEP 3: RUN INFERENCE ---
    console.log("Hardware ready. Fetching scores...");
    
    // Using the POST method as defined in your original snippet
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
    return data.scores as number[];

  } catch (error) {
    console.error("Error in getStockScores:", error);
    throw error;

  } finally {
    // --- STEP 4: DOWNGRADE HARDWARE ---
    console.log("Downgrading Model Space...");
    try {
        await fetch(`${BASE_URL}/downgradeModel`, { 
            method: "GET", 
            headers: { Authorization: `Bearer ${HF_TOKEN}` } 
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


export async function GET() {
  try {
    const rawSymbols = await fetchTrackedTickers();

    // Filter out nulls with a type guard so `symbols` has type `string[]`
    const symbols = rawSymbols.filter((s): s is string => s !== null && s !== undefined);

    if (!symbols.length) {
      return NextResponse.json({ message: "No tracked report tickers to update." });
    }


    const checkResult = await checkStocks(symbols);

    if (checkResult !== 1) {
      return NextResponse.json({ message: "Check returned 0, no update." });
    }

    const scores = await getStockScores(symbols);

    // Safety: if HF returns fewer/more scores than symbols, fail loudly.
    if (!Array.isArray(scores) || scores.length !== symbols.length) {
      throw new Error(`HF returned ${scores?.length ?? "unknown"} scores for ${symbols.length} symbols`);
    }

    await updateStockScores(symbols, scores);

    return NextResponse.json({
      message: "Tracked report tickers updated successfully.",
      updated: symbols.length,
    });
  } catch (error) {
    console.error("Error in stock update:", error);
    return NextResponse.json({ error: "Failed to update stock scores." }, { status: 500 });
  }
}
// ...existing code...
