// app/api/tickers/search/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickers } from "@/db/schema";
import { and, or, sql } from "drizzle-orm";

function cleanNA(v: string | null) {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (s.toLowerCase() === "n/a") return null;
  return s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") ?? "").trim();
  const industry = cleanNA(searchParams.get("industry"));
  const exchange = cleanNA(searchParams.get("exchange"));

  const scoreMin = Number(searchParams.get("scoreMin") ?? "0");
  const scoreMax = Number(searchParams.get("scoreMax") ?? "100");
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "20"), 1), 50);

  const hasNonDefaultScore = !(scoreMin === 0 && scoreMax === 100);
  const hasAnyFilter = Boolean(industry || exchange || hasNonDefaultScore);

  // If user typed nothing AND no filters, don't return the world.
  if (!q && !hasAnyFilter) {
    return NextResponse.json({ results: [] });
  }

  const like = `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;

  const where = and(
    // Only apply text matching if q exists
    q
      ? or(
          sql`${tickers.company} ILIKE ${like}`,
          sql`${tickers.ticker} ILIKE ${like}`,
          sql`${tickers.cik}::text ILIKE ${like}`
        )
      : undefined,

    industry ? sql`${tickers.industry} = ${industry}` : undefined,
    exchange ? sql`${tickers.exchange} = ${exchange}` : undefined,

    // score bounds always applied (defaults give full range)
    sql`${tickers.rawScore} >= ${scoreMin}`,
    sql`${tickers.rawScore} <= ${scoreMax}`
  );

  const results = await db
    .select({
      ticker: tickers.ticker,
      company: tickers.company,
      industry: tickers.industry,
      exchange: tickers.exchange,
      rawScore: tickers.rawScore,
      cik: tickers.cik,
    })
    .from(tickers)
    .where(where)
    .limit(limit);

  return NextResponse.json({ results });
}
