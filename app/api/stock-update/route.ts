import { NextResponse } from "next/server";
import { db } from "@/db"; // your database client
import { tickers } from "@/db/schema"; // your table schema
import { eq } from 'drizzle-orm';

async function fetchTickers() {
  const result = await db.select({ ticker: tickers.ticker }).from(tickers).where(eq(tickers.needsUpdate, true));
  return result.map((row) => row.ticker);
}

async function checkStocks(symbols: string[]) {
  const response = await fetch('https://api.huggingface.co/first-endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbols }),
  });
  const data = await response.json();
  return data.result; // 1 or 0
}

async function getStockScores(symbols: string[]) {
  const response = await fetch('https://api.huggingface.co/second-endpoint', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbols }),
  });
  const data = await response.json();
  return data.scores; // array of floats
}

async function updateStockScores(symbols: string[], scores: number[]) {
  for (let i = 0; i < symbols.length; i++) {
    await db.update(tickers)
      .set({ rawScore: scores[i], needsUpdate: false })
      .where(eq(tickers.ticker, symbols[i]));
  }
}


export async function GET() {
  try {
    const symbols = await fetchTickers();
    if (!symbols.length) return NextResponse.json({ message: "No stocks to update." });

    const checkResult = await checkStocks(symbols);
    if (checkResult !== 1) {
      return NextResponse.json({ message: "Check returned 0, no update." });
    }

    const scores = await getStockScores(symbols);
    await updateStockScores(symbols, scores);

    return NextResponse.json({ message: "Stock scores updated successfully." });
  } catch (error) {
    console.error("Error in stock update:", error);
    return NextResponse.json({ error: "Failed to update stock scores." }, { status: 500 });
  }
}
