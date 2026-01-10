// app/reports/[reportID]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/db";
import { reports, tickers, reportedTickers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

import ReportDetailShell from "./ReportDetailShell";

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

const LOGO_DEV_PUBLIC_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY;

function yahooUrl(ticker: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`;
}

function logoDevUrl(ticker: string) {
  if (!LOGO_DEV_PUBLIC_KEY) return null;

  return `https://img.logo.dev/ticker/${encodeURIComponent(
    ticker
  )}?token=${encodeURIComponent(LOGO_DEV_PUBLIC_KEY)}`;
}


export default async function ReportDetailPage(props: {
  params: Promise<{ reportID: string }>;
}) {
  const { reportID } = await props.params;
  if (!reportID) notFound();

  const reportRow = await db
    .select({
      reportID: reports.reportID,
      name: reports.name,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.reportID, reportID))
    .limit(1);

  const report = reportRow[0];
  if (!report) notFound();

  const rows = await db
    .select({
      ticker: tickers.ticker,
      company: tickers.company,
      industry: tickers.industry,
      exchange: tickers.exchange,
      rawScore: tickers.rawScore,
      cik: tickers.cik,
      lastSync: tickers.lastSync,
    })
    .from(reportedTickers)
    .innerJoin(tickers, eq(reportedTickers.tickerSymbol, tickers.ticker))
    .where(eq(reportedTickers.reportID, report.reportID))
    .orderBy(asc(tickers.ticker))
    .limit(30);

  const title = report.name ?? "Untitled Report";
  const isCustomReport = title.toLowerCase().includes("custom");

  return (
    <ReportDetailShell
      title={title}
      reportID={report.reportID}
      isCustomReport={isCustomReport}
    >
      {rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-center text-sm text-muted-foreground">
          No tickers found for this report.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => {
            const yh = yahooUrl(t.ticker);
            const logo = logoDevUrl(t.ticker);

            return (
              <div
                key={t.ticker}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                    <div
                    className={[
                        "relative h-12 w-12 overflow-hidden rounded-xl",
                        logo ? "" : "border bg-background",
                    ].join(" ")}
                    >
                    {logo ? (
                      <Image
                        src={logo}
                        alt={`${t.company ?? t.ticker} logo`}
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {t.company ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">{t.ticker}</span>
                          {t.exchange ? ` • ${t.exchange}` : ""}
                        </div>
                      </div>

                      <Link
                        href={yh}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg border px-2 py-1 text-xs hover:bg-accent"
                      >
                        Yahoo Finance
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="text-muted-foreground">Industry</div>
                  <div className="text-right">{t.industry ?? "—"}</div>

                  <div className="text-muted-foreground">Exchange</div>
                  <div className="text-right">{t.exchange ?? "—"}</div>

                  <div className="text-muted-foreground">Raw score</div>
                  <div className="text-right">
                    {Number.isFinite(t.rawScore) ? Number(t.rawScore).toFixed(4) : "—"}
                  </div>

                  <div className="text-muted-foreground">CIK</div>
                  <div className="text-right">{t.cik ?? "—"}</div>

                  <div className="text-muted-foreground">Last sync</div>
                  <div className="text-right">{fmtDate(t.lastSync)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ReportDetailShell>
  );
}
