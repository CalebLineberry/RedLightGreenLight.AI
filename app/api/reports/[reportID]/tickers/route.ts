// app/api/reports/[reportID]/tickers/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { reportedTickers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type Ctx = { params: Promise<{ reportID: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { reportID } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const ticker = String(body?.ticker ?? "").trim().toUpperCase();

  if (!reportID || !ticker) {
    return NextResponse.json(
      { error: "Missing reportID or ticker" },
      { status: 400 }
    );
  }

  // prevent duplicates (since your index isn't unique)
  const existing = await db
    .select({ id: reportedTickers.id })
    .from(reportedTickers)
    .where(
      and(
        eq(reportedTickers.reportID, reportID),
        eq(reportedTickers.tickerSymbol, ticker)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(reportedTickers).values({
      reportID,
      tickerSymbol: ticker,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { reportID } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const ticker = String(body?.ticker ?? "").trim().toUpperCase();

  if (!reportID || !ticker) {
    return NextResponse.json(
      { error: "Missing reportID or ticker" },
      { status: 400 }
    );
  }

  await db
    .delete(reportedTickers)
    .where(
      and(
        eq(reportedTickers.reportID, reportID),
        eq(reportedTickers.tickerSymbol, ticker)
      )
    );

  return NextResponse.json({ ok: true });
}
