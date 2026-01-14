import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reports, tickers, reportedTickers, users } from "@/db/schema";
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
  const { userId } = await auth();

  if (!userId) {
    // If you prefer redirect instead of JSON:
    // return NextResponse.redirect(new URL("/sign-in", req.url));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const u = await client.users.getUser(userId);
    const email =
    u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
    u.emailAddresses?.[0]?.emailAddress;

    if (!email) return NextResponse.json({ error: "No email found for user" }, { status: 400 });

await db.insert(users).values({ id: userId, email }).onConflictDoUpdate({
  target: users.id,
  set: { email },
});

  const form = await req.formData();

  const reportName = cleanNA(form.get("reportName")) ?? "Generated Report";
  const industry = cleanNA(form.get("industry"));
  const exchange = cleanNA(form.get("exchange"));

  const scoreMin = numOr(form.get("scoreMin"), 0);
  const scoreMax = numOr(form.get("scoreMax"), 100);

  // 1) Create report (owned by the current user)
  const created = await db
    .insert(reports)
    .values({
      name: reportName,
      userID: userId, // ✅ owner
    })
    .returning({ reportID: reports.reportID });

  const reportID = created[0]?.reportID;
  if (!reportID) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }

  // 2) Pick up to 30 tickers that match the filters
  const picked = await db
    .select({ ticker: tickers.ticker })
    .from(tickers)
    .where(
      and(
        industry ? eq(tickers.industry, industry) : undefined,
        exchange ? eq(tickers.exchange, exchange) : undefined,
        sql`${tickers.rawScore} >= ${scoreMin}`,
        sql`${tickers.rawScore} <= ${scoreMax}`
      )
    )
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
  return NextResponse.redirect(new URL(`/reports/${reportID}`, req.url));
}
