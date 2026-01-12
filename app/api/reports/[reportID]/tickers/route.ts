import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reports, reportedTickers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type Ctx = { params: Promise<{ reportID: string }> };

const MAX_TICKERS = 30;

async function requireOwnedReport(reportID: string) {
  const { userId } = await auth();
  if (!userId) return { ok: false as const, status: 401, userId: null };

  const owned = await db
    .select({ reportID: reports.reportID })
    .from(reports)
    .where(and(eq(reports.reportID, reportID), eq(reports.userID, userId)))
    .limit(1);

  if (owned.length === 0) return { ok: false as const, status: 404, userId };

  return { ok: true as const, status: 200, userId };
}

export async function POST(req: Request, ctx: Ctx) {
  const { reportID } = await ctx.params;

  if (!reportID) {
    return NextResponse.json({ error: "Missing reportID" }, { status: 400 });
  }

  const authz = await requireOwnedReport(reportID);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "Unauthorized" : "Report not found" },
      { status: authz.status }
    );
  }

  const body = await req.json().catch(() => ({}));
  const ticker = String(body?.ticker ?? "").trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
  }

  // ✅ Enforce max tickers (prevents bypassing the UI)
  const countRows = await db
    .select({ id: reportedTickers.id })
    .from(reportedTickers)
    .where(eq(reportedTickers.reportID, reportID));

  if (countRows.length >= MAX_TICKERS) {
    return NextResponse.json(
      { error: `Max ${MAX_TICKERS} tickers reached. Remove one to add another.` },
      { status: 400 }
    );
  }

  // prevent duplicates (you actually DO have a unique index now, but this is fine)
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

  if (!reportID) {
    return NextResponse.json({ error: "Missing reportID" }, { status: 400 });
  }

  const authz = await requireOwnedReport(reportID);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "Unauthorized" : "Report not found" },
      { status: authz.status }
    );
  }

  const body = await req.json().catch(() => ({}));
  const ticker = String(body?.ticker ?? "").trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker" }, { status: 400 });
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

export async function GET(_req: Request, ctx: Ctx) {
  const { reportID } = await ctx.params;

  if (!reportID) {
    return NextResponse.json({ tickers: [] }, { status: 400 });
  }

  const authz = await requireOwnedReport(reportID);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.status === 401 ? "Unauthorized" : "Report not found" },
      { status: authz.status }
    );
  }

  const rows = await db
    .select({ ticker: reportedTickers.tickerSymbol })
    .from(reportedTickers)
    .where(eq(reportedTickers.reportID, reportID));

  return NextResponse.json({ tickers: rows.map((r) => r.ticker) });
}
