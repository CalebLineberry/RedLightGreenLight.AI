// app/reports/[reportID]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { reports, tickers, reportedTickers } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

import ReportDetailShell from "./ReportDetailShell";
import RemoveTickerButton from "./RemoveTickerButton";

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

// --------- NEW: score mapping + color helpers ---------
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Convert rawScore (0..100) -> signed percent (-100..100)
 * rawScore itself is NOT changed—only the displayed value.
 */
function scoreToSignedPercent(rawScore: number) {
  const r = clamp(rawScore, 0, 100);
  return (r - 50) * 2;
}

/**
 * Color ramps:
 * -100 -> darker red
 *  0   -> near-white
 *  100 -> darker green
 *
 * We use HSL and vary saturation/lightness by magnitude.
 */
function signedPercentToColors(pct: number) {
  const p = clamp(pct, -100, 100);
  const t = Math.abs(p) / 100; // 0..1
  const hue = p >= 0 ? 120 : 0; // green or red

  // Near 0 => low saturation + high lightness (whiter)
  // Near extremes => higher saturation + lower lightness (darker)
  const sat = 5 + t * 85; // 5%..90%
  const light = 96 - t * 42; // 96%..54%

  // Subtle fills (works in dark mode too because alpha is low)
  const bg = `hsla(${hue} ${sat}% ${light}% / 0.18)`;
  const border = `hsla(${hue} ${sat}% ${light}% / 0.45)`;
  const text = `hsl(${hue} ${sat}% ${light - 10}%)`;

  return { bg, border, text };
}
// ------------------------------------------------------

export default async function ReportDetailPage(props: {
  params: Promise<{ reportID: string }>;
}) {
  const { userId } = await auth();
  if (!userId) notFound();

  const { reportID } = await props.params;
  if (!reportID) notFound();

  const reportRow = await db
    .select({
      reportID: reports.reportID,
      name: reports.name,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(and(eq(reports.reportID, reportID), eq(reports.userID, userId)))
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

            const raw =
              Number.isFinite(t.rawScore) ? Number(t.rawScore) : null;

            const signed = raw === null ? null : scoreToSignedPercent(raw);
            const colors =
              signed === null
                ? null
                : signedPercentToColors(signed);

            return (
              <div
                key={t.ticker}
                className="rounded-2xl border p-4 shadow-sm"
                style={
                  colors
                    ? {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      }
                    : undefined
                }
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

                  <div className="text-muted-foreground">Score</div>
                  <div
                    className="text-right font-semibold tabular-nums"
                    style={colors ? { color: colors.text } : undefined}
                    title={
                      raw === null
                        ? undefined
                        : `Raw score: ${raw.toFixed(2)} (0–100)`
                    }
                  >
                    {signed === null ? "—" : `${signed.toFixed(2)}%`}
                  </div>

                  <div className="text-muted-foreground">CIK</div>
                  <div className="text-right">{t.cik ?? "—"}</div>

                  <div className="text-muted-foreground">Last sync</div>
                  <div className="text-right">{fmtDate(t.lastSync)}</div>
                </div>

                <div className="mt-3 flex justify-end">
                  <RemoveTickerButton reportID={report.reportID} ticker={t.ticker} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ReportDetailShell>
  );
}
