"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function RemoveTickerButton(props: {
  reportID: string;
  ticker: string;
}) {
  const { reportID, ticker } = props;
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onRemove() {
    const ok = window.confirm(`Remove ${ticker} from this report?`);
    if (!ok) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/reports/${encodeURIComponent(reportID)}/tickers/${encodeURIComponent(ticker)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to remove ticker");
      }

      router.refresh();
    } catch (e) {
      console.error(e);
      alert(`Could not remove ${ticker}.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-lg border border-red-500/60 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50"
      aria-label={`Remove ${ticker}`}
      title="Remove"
    >
      {loading ? "…" : "✕"}
    </button>
  );
}
