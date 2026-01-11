// app/reports/[reportID]/ReportDetailShell.tsx
"use client";

import React, { useState } from "react";
import ReportTickerBuilder from "./ReportTickerBuilder";

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
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
  // keep prop for now so you don't have to refactor other files immediately
  isCustomReport: boolean;
  children: React.ReactNode;
}) {
  const { title, reportID, children } = props;

  // ✅ Any report can be edited; default closed.
  const [editing, setEditing] = useState<boolean>(false);

  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-center text-2xl font-semibold tracking-tight">
              {title}
            </h1>

            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center rounded-lg border px-2 py-1 text-xs hover:bg-accent"
                aria-label="Edit report"
                title="Edit"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* ✅ Keep mounted, just hide/show */}
        <div className={editing ? "mb-6" : "mb-6 hidden"}>
          <ReportTickerBuilder reportID={reportID} onDone={() => setEditing(false)} />
        </div>

        {children}
      </main>
    </div>
  );
}
