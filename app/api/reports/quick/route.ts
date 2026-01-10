// app/api/reports/quick/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { reports, tickers, reportedTickers } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

function cleanNA(v: FormDataEntryValue | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.toLowerCase() === "n/a") return null;
  return s;
}

function numOr(v: FormDataEntryValue | null, fallback: number) {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  const form = await req.formData();

  const reportName = cleanNA(form.get("reportName")) ?? "Generated Report";
  const industry = cleanNA(form.get("industry"));
  const exchange = cleanNA(form.get("exchange"));

  const scoreMin = numOr(form.get("scoreMin"), 0);
  const scoreMax = numOr(form.get("scoreMax"), 100);

  // 1) Create report
  const created = await db
    .insert(reports)
    .values({ name: reportName })
    .returning({ reportID: reports.reportID });

  const reportID = created[0]?.reportID;
  if (!reportID) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }

  // 2) Pick up to 30 tickers that match the filters
  const picked = await db
    .select({
      ticker: tickers.ticker,
    })
    .from(tickers)
    .where(
      and(
        industry ? eq(tickers.industry, industry) : undefined,
        exchange ? eq(tickers.exchange, exchange) : undefined,
        // if rawScore is nullable, you may want to require it:
        sql`${tickers.rawScore} >= ${scoreMin}`,
        sql`${tickers.rawScore} <= ${scoreMax}`
      )
    )
    // You can change this ordering if you want "best first":
    // .orderBy(desc(tickers.rawScore))
    .limit(30);

  // 3) Insert into reportedTickers
  if (picked.length > 0) {
    await db.insert(reportedTickers).values(
      picked.map((p) => ({
        reportID,
        tickerSymbol: p.ticker,
      }))
    );
  }

  // 4) Redirect to the report detail page
  const url = new URL(`/reports/${reportID}`, req.url);
  return NextResponse.redirect(url);
}
