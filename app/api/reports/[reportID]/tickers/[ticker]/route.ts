import { NextResponse } from "next/server";
import { db } from "@/db";
import { reportedTickers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ reportID: string; ticker: string }> }
) {
  const { reportID, ticker: rawTicker } = await context.params;

  const ticker = decodeURIComponent(rawTicker);

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
