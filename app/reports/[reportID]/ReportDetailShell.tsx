// app/reports/[reportID]/ReportDetailShell.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthBar from "@/app/components/AuthBar";
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
  isCustomReport: boolean;
  children: React.ReactNode;
}) {
  const { title, reportID, children } = props;
  const [editing, setEditing] = useState(false);

  return (
    <div className="min-h-screen w-full">
      {/* ================= Top Bar ================= */}
      <section id="topbar" className="d-none d-lg-block">
        <div className="container clearfix">
          <div className="contact-info float-left">
            <i className="fa fa-envelope-o"></i>{" "}
            <a href="mailto:redlight.greenlight.ai@gmail.com">
              redlight.greenlight.ai@gmail.com
            </a>
          </div>
          <AuthBar />
        </div>
      </section>

      {/* ================= Unified Header ================= */}
      <header id="header">
        <div className="container">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div id="logo" className="pull-left">
              <h1 className="mb-0">
                <Link href="/" className="scrollto">
                  RedLight<span>GreenLight</span>
                </Link>
              </h1>
            </div>

            {/* Report title + edit controls */}
            <div className="flex items-center gap-3">
              <h2 className="mb-0 text-lg font-semibold truncate max-w-[40vw]">
                {title}
              </h2>

              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center justify-center rounded-md border border-black bg-white px-2 py-1 text-xs text-black hover:bg-gray-100 cursor-pointer"
                  aria-label="Edit report"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center justify-center rounded-md border border-black bg-white px-3 py-1 text-xs font-medium text-black hover:bg-gray-100 cursor-pointer"
                >
                  Done
                </button>              
              )}
              <Link href="/reports" className="ml-2 text-s text-blue-500 hover:underline">
                Back to Reports
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ================= Page Content ================= */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Builder */}
        <div className={editing ? "mb-6" : "mb-6 hidden"}>
          <ReportTickerBuilder
            reportID={reportID}
            onDone={() => setEditing(false)}
          />

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-black bg-white px-3 py-2 text-xs font-medium text-black hover:bg-gray-100"
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
