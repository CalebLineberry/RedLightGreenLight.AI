// app/reports/[reportID]/ReportDetailShell.tsx
"use client";

import React, { useState } from "react";
import ReportTickerBuilder from "./ReportTickerBuilder";

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ReportDetailShell(props: {
  title: string;
  reportID: string;
  isCustomReport: boolean; // kept for compatibility
  children: React.ReactNode;
}) {
  const { title, reportID, children } = props;

  const [editing, setEditing] = useState(false);

  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-center text-2xl font-semibold tracking-tight">
              {title}
            </h1>

            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs hover:bg-accent"
                aria-label="Edit report"
                title="Edit"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center justify-center rounded-lg border px-3 py-1 text-xs font-medium hover:bg-accent"
                aria-label="Done editing"
                title="Done"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* ✅ Keep mounted, just hide/show */}
        <div className={editing ? "mb-6" : "mb-6 hidden"}>
          <ReportTickerBuilder reportID={reportID} onDone={() => setEditing(false)} />

          {/* Optional: a second Done button below the builder (nice UX) */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              Done
            </button>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
