import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickers } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const industriesRows = await db
    .selectDistinct({ industry: tickers.industry })
    .from(tickers)
    .where(sql`
      ${tickers.industry} is not null
      and ${tickers.industry} <> ''
      and lower(${tickers.industry}) not in ('n/a', 'na', 'none', 'unknown')
    `)
    .orderBy(tickers.industry);

  const exchangesRows = await db
    .selectDistinct({ exchange: tickers.exchange })
    .from(tickers)
    .where(sql`
      ${tickers.exchange} is not null
      and ${tickers.exchange} <> ''
      and lower(${tickers.exchange}) not in ('n/a', 'na', 'none', 'unknown')
    `)
    .orderBy(tickers.exchange);

  return NextResponse.json({
    industries: industriesRows.map((r) => r.industry),
    exchanges: exchangesRows.map((r) => r.exchange),
  });
}
