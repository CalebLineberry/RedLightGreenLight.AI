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
function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function scoreToSignedPercent(rawScore: number) {
  const r = clamp(rawScore, 0, 100);
  return (r - 50) * 2; // -100..100
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number // 0..1 (0 = a, 1 = b)
) {
  const tt = clamp(t, 0, 1);
  const r = Math.round(a.r + (b.r - a.r) * tt);
  const g = Math.round(a.g + (b.g - a.g) * tt);
  const bb = Math.round(a.b + (b.b - a.b) * tt);
  return { r, g, b: bb };
}

function rgbToCss(c: { r: number; g: number; b: number }) {
  return `rgb(${c.r} ${c.g} ${c.b})`;
}

/**
 * Blend white with green/red based on signed percent.
 * Example: +29 => 29% green + 71% white
 *          -29 => 29% red   + 71% white
 */
function signedPercentToBlendedBg(pct: number) {
  const p = clamp(pct, -100, 100);
  const w = { r: 255, g: 255, b: 255 };
  const green = { r: 0, g: 160, b: 70 }; // tweak to taste
  const red = { r: 190, g: 0, b: 40 };   // tweak to taste

  const t = Math.abs(p) / 100; // 0..1
  const target = p >= 0 ? green : red;

  // Background is a blend: (1-t)*white + t*target
  const bg = mixRgb(w, target, t);

  // Border: slightly more “toward” the target so it’s visible
  const border = mixRgb(w, target, Math.min(1, t * 1.25));

  return {
    bg: rgbToCss(bg),
    border: rgbToCss(border),
  };
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
        <div className="rounded-2xl border p-6 text-center text-sm text-black">
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

            const blend =
            signed === null ? null : signedPercentToBlendedBg(signed);

            const colors =
              signed === null
                ? null
                : signedPercentToColors(signed);

            return (
  <div
  key={t.ticker}
  className="rounded-2xl border p-4 shadow-sm"
  style={
    blend
      ? {
          backgroundColor: blend.bg,
          borderColor: blend.border,
          color: "#000", // keep all text black
        }
      : { color: "#000" }
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
          <div className="flex h-full w-full items-center justify-center text-xs text-black">
            —
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-black">
              {t.company ?? "—"}
            </div>

            {/* was text-muted-foreground */}
            <div className="text-xs text-black">
              <span className="font-medium text-black">{t.ticker}</span>
              {t.exchange ? ` • ${t.exchange}` : ""}
            </div>
          </div>

          <Link
            href={yh}
            target="_blank"
            rel="noreferrer"
            className="
                shrink-0 rounded-lg border
                border-black bg-white
                px-2 py-1 text-xs
                text-black
                hover:bg-gray-100
            "
            >
            Yahoo Finance
            </Link>

        </div>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
      {/* labels: remove muted */}
      <div className="text-black">Industry</div>
      <div className="text-right text-black">{t.industry ?? "—"}</div>

      <div className="text-black">Exchange</div>
      <div className="text-right text-black">{t.exchange ?? "—"}</div>

      <div className="text-black">Score</div>
      <div
        className="text-right font-semibold tabular-nums text-black"
        title={
          raw === null ? undefined : `Raw score: ${raw.toFixed(2)} (0–100)`
        }
      >
        {signed === null ? "—" : `${signed.toFixed(2)}%`}
      </div>

      <div className="text-black">CIK</div>
      <div className="text-right text-black">{t.cik ?? "—"}</div>

      <div className="text-black">Last sync</div>
      <div className="text-right text-black">{fmtDate(t.lastSync)}</div>
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
