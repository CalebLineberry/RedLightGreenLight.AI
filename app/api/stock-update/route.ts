import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickers, reportedTickers, trackedReports } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";


async function fetchTrackedTickers() {
  const rows = await db
    .selectDistinct({ ticker: reportedTickers.tickerSymbol })
    .from(trackedReports)
    .innerJoin(reportedTickers, eq(reportedTickers.reportID, trackedReports.reportID));


  return rows.map((r) => r.ticker).filter(Boolean);
}

async function checkStocks(symbols: string[]) {
  const response = await fetch("https://api.huggingface.co/first-endpoint", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ symbols }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HF check endpoint failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.result as number; // 1 or 0
}

async function getStockScores(symbols: string[]) {
  const response = await fetch("https://api.huggingface.co/second-endpoint", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ symbols }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HF scores endpoint failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.scores as number[]; // array of floats
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