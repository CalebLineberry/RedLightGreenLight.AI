// app/reports/[reportID]/ReportTickerBuilder.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SearchRow = {
  ticker: string;
  company: string | null;
  industry: string | null;
  exchange: string | null;
  rawScore: number | null;
  cik: string | number | null;
};

const MAX_TICKERS = 30;


function cleanNA(v: string | null | undefined) {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (s.toLowerCase() === "n/a") return null;
  return s;
}

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function ReportTickerBuilder({
  reportID,
  onDone,
}: {
  reportID: string;
  onDone?: () => void;
}) {
  const router = useRouter();

  const [industries, setIndustries] = useState<string[]>([]);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [industry, setIndustry] = useState<string>("");
  const [exchange, setExchange] = useState<string>("");

  const [scoreMin, setScoreMin] = useState<number>(0);
  const [scoreMax, setScoreMax] = useState<number>(100);

  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);

  const [results, setResults] = useState<SearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busyTicker, setBusyTicker] = useState<string | null>(null);

  // Load filter options
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/tickers/filters", { cache: "no-store" });
        const data = await res.json();

        if (cancelled) return;

        const inds = Array.isArray(data.industries) ? data.industries : [];
        const exs = Array.isArray(data.exchanges) ? data.exchanges : [];

        setIndustries(
          inds
            .map((x: any) => (typeof x === "string" ? x : ""))
            .map(cleanNA)
            .filter(Boolean) as string[]
        );

        setExchanges(
          exs
            .map((x: any) => (typeof x === "string" ? x : ""))
            .map(cleanNA)
            .filter(Boolean) as string[]
        );
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCount = useMemo(
  () => Object.values(selected).filter(Boolean).length,
  [selected]
    );

    const atLimit = selectedCount >= MAX_TICKERS;
    const [limitMsg, setLimitMsg] = useState<string | null>(null);
    const [loadingSelected, setLoadingSelected] = useState(true);

  useEffect(() => {
  let cancelled = false;

  (async () => {
    setLoadingSelected(true);
    try {
      const res = await fetch(
        `/api/reports/${encodeURIComponent(reportID)}/tickers`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (cancelled) return;

      const tickers: string[] = Array.isArray(data?.tickers) ? data.tickers : [];

      const nextSelected: Record<string, boolean> = {};
      for (const t of tickers) nextSelected[t] = true;

      setSelected(nextSelected);
    } catch {
      // ignore
    } finally {
      if (!cancelled) setLoadingSelected(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [reportID]);


  const hasNonDefaultScore = !(scoreMin === 0 && scoreMax === 100);
  const shouldSearch = Boolean(dq.trim() || industry || exchange || hasNonDefaultScore);

  const searchParams = useMemo(() => {
    const sp = new URLSearchParams();
    if (dq.trim()) sp.set("q", dq.trim());
    if (industry) sp.set("industry", industry);
    if (exchange) sp.set("exchange", exchange);
    sp.set("scoreMin", String(scoreMin));
    sp.set("scoreMax", String(scoreMax));
    sp.set("limit", "20");
    return sp.toString();
  }, [dq, industry, exchange, scoreMin, scoreMax]);

  // Search whenever inputs change
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!shouldSearch) {
        setResults([]);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(`/api/tickers/search?${searchParams}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled) {
          setResults(Array.isArray(data?.results) ? data.results : []);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldSearch, searchParams]);

  async function toggleTicker(ticker: string, nextChecked: boolean) {
    setBusyTicker(ticker);

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(reportID)}/tickers`, {
        method: nextChecked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        console.error("Failed to update report tickers:", res.status, msg);
        setSelected((prev) => ({ ...prev, [ticker]: !nextChecked }));
        return;
      }
      setLimitMsg(null);
      router.refresh();
    } finally {
      setBusyTicker(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Build your report</h2>
      <div className="mt-1 text-xs text-muted-foreground">
        Selected: <span className="font-medium">{selectedCount}</span> / {MAX_TICKERS}
        {loadingSelected ? " (loading…)" : ""}
        </div>

        {(atLimit || limitMsg) && (
        <div
            className={[
            "mt-3 rounded-xl border px-3 py-2 text-sm",
            atLimit
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-red-500/40 bg-red-500/10 text-red-600",
            ].join(" ")}
        >
            <div className="font-semibold">
            {atLimit ? "Max tickers reached" : "Limit reached"}
            </div>
            <div className="text-xs text-muted-foreground">
            {limitMsg ?? `Reports are limited to ${MAX_TICKERS} tickers. Remove one to add another.`}
            </div>
        </div>
        )}


      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-muted-foreground">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company, ticker, or CIK…"
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-[#52B788]"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">
            {searching
              ? "Searching…"
              : shouldSearch
              ? "Showing matches for your filters/search."
              : "Type to search, or set filters to browse."}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Industry</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={loadingFilters}
            className="h-10 w-full rounded-lg border bg-background px-2 text-sm outline-none appearance-none focus:border-[#52B788]"
          >
            <option value="">{loadingFilters ? "Loading…" : "All"}</option>
            {industries.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Exchange</label>
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            disabled={loadingFilters}
            className="h-10 w-full rounded-lg border bg-background px-2 text-sm outline-none appearance-none focus:border-[#52B788]"
          >
            <option value="">{loadingFilters ? "Loading…" : "All"}</option>
            {exchanges.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:max-w-sm">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Score min</label>
          <input
            type="number"
            value={scoreMin}
            onChange={(e) => setScoreMin(Number(e.target.value))}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-[#52B788]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Score max</label>
          <input
            type="number"
            value={scoreMax}
            onChange={(e) => setScoreMax(Number(e.target.value))}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-[#52B788]"
          />
        </div>
      </div>

      {/* ✅ results should show when filters are used too */}
      {shouldSearch ? (
        <div className="mt-4 rounded-xl border bg-background">
          <div className="border-b px-3 py-2 text-xs font-medium">
            Results {results.length ? `(${results.length})` : ""}
          </div>

          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              {searching ? "Searching…" : "No matches."}
            </div>
          ) : (
            <ul className="max-h-80 overflow-auto">
              {results.map((r) => {
                const checked = !!selected[r.ticker];
                const busy = busyTicker === r.ticker;

                // Disable only “adding” when at limit; still allow unchecking/removing
                const disableAdd = atLimit && !checked;

                // final disabled state
                const disabled = busy || disableAdd || loadingSelected;


                return (
                  <li
                    key={r.ticker}
                    className={[
                    "flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-accent/40",
                    disableAdd ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {r.company ?? "—"}{" "}
                        <span className="text-xs text-muted-foreground">• {r.ticker}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {cleanNA(r.industry) ?? "—"}
                        {cleanNA(r.exchange) ? ` • ${r.exchange}` : ""}
                        {r.cik ? ` • CIK ${r.cik}` : ""}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                            const next = e.target.checked;

                            // ✅ If user tries to add #31, prevent and show message
                            if (next && disableAdd) {
                                e.preventDefault();
                                setLimitMsg(`You can only select up to ${MAX_TICKERS} tickers. Remove one to add another.`);
                                return;
                            }

                            setLimitMsg(null);
                            setSelected((prev) => ({ ...prev, [r.ticker]: next }));
                            toggleTicker(r.ticker, next);
                        }}
                        

                      />
                      {busy
                        ? "…"
                        : checked
                        ? "Added"
                        : disableAdd
                        ? "Limit"
                        : "Add"}

                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
