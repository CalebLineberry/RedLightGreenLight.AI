"use client";

import React, { useEffect, useMemo, useState } from "react";
import DualRangeSlider from "@/app/components/ui/DualRangeSlider";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import Link from "next/link";
import AuthBar from "@/app/components/AuthBar";

type ReportListItem = {
  id: string; // report UUID
  name: string | null;
};

function cleanNA(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (s.toLowerCase() === "n/a") return null;
  return s;
}

export default function ReportsPage() {
  // TODO: replace stub with real reports from your DB if/when you wire it up.
  // IMPORTANT: report IDs should be UUID strings (not 1,2,3...).
  const reports: ReportListItem[] = useMemo(
    () => [
      // { id: "7a3c...uuid", name: "Tech Midcap" },
    ],
    []
  );

  const [scoreRange, setScoreRange] = useState<[number, number]>([50, 90]);

  const [industries, setIndustries] = useState<string[]>([]);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // use absolute path so it works from any route depth
        const res = await fetch("/api/tickers/filters", { cache: "no-store" });
        const data = await res.json();

        if (!cancelled) {
          const inds = Array.isArray(data?.industries) ? data.industries : [];
          const exs = Array.isArray(data?.exchanges) ? data.exchanges : [];

          setIndustries(
            inds.map(cleanNA).filter(Boolean) as string[]
          );
          setExchanges(
            exs.map(cleanNA).filter(Boolean) as string[]
          );
        }
      } catch {
        // optional: console.error(e);
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Top Bar */}
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

      {/* Header */}
      <header id="header">
        <div className="container">
          <div id="logo" className="pull-left">
            <h1>
              <Link href="/" className="scrollto">
                RedLight<span>GreenLight</span>
              </Link>
            </h1>
          </div>
        </div>
      </header>

      <div className="w-full pt-10 pb-20 mb-10 text-center">
        <div className="mx-auto w-full max-w-none md:px-48">
          <div className="grid grid-cols-1 md:grid-cols-[420px_1fr_420px] items-stretch">
            {/* Left: Generated */}
            <div className="flex flex-col items-start md:pr-10">
              <h2 className="text-xl font-semibold w-full text-center m-0">
                Generate a Report
              </h2>

              <form
                method="POST"
                action="/api/reports/quick"
                className="w-full max-w-md grid grid-cols-1 gap-4 mt-4"
              >
                {/* Report Name */}
                <div className="flex flex-col space-y-1">
                  <label className="font-medium text-center">Report Name</label>
                  <input
                    className="border rounded p-2 w-full h-10"
                    name="reportName"
                    placeholder="e.g. Tech Midcap"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="font-medium text-center">Industry</label>
                    <select
                      name="industry"
                      className="
                        border rounded p-2 w-full h-10
                        bg-[#11192D] text-white
                        appearance-none
                        focus:outline-none focus:ring-0 focus:border-[#52B788]
                      "
                      disabled={loadingFilters}
                      defaultValue=""
                    >
                      <option value="">
                        {loadingFilters ? "Loading industries..." : "All industries"}
                      </option>

                      {industries.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="font-medium text-center">Exchange</label>
                    <select
                      name="exchange"
                      className="
                        border rounded p-2 w-full h-10
                        bg-[#11192D] text-white
                        appearance-none
                        focus:outline-none focus:ring-0 focus:border-[#52B788]
                      "
                      disabled={loadingFilters}
                      defaultValue=""
                    >
                      <option value="">
                        {loadingFilters ? "Loading exchanges..." : "All exchanges"}
                      </option>

                      {exchanges.map((ex) => (
                        <option key={ex} value={ex}>
                          {ex}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col space-y-2">
                  <label className="font-medium text-center">Score Range</label>

                  <div className="text-center text-sm opacity-80">
                    Score: {scoreRange[0]} → {scoreRange[1]}
                  </div>

                  {/* hidden inputs so the POST form sends the values */}
                  <input type="hidden" name="scoreMin" value={scoreRange[0]} />
                  <input type="hidden" name="scoreMax" value={scoreRange[1]} />

                  <DualRangeSlider
                    value={scoreRange}
                    onChange={setScoreRange}
                    min={0}
                    max={100}
                    step={1}
                  />

                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{scoreRange[0]}</span>
                    <span>{scoreRange[1]}</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button type="submit" className="w-fit">
                    Generate
                  </Button>
                </div>
              </form>
            </div>

            {/* Middle: OR */}
            <div className="hidden md:flex h-full items-center justify-center">
              <span className="text-6xl font-extrabold tracking-widest opacity-60 leading-none">
                OR
              </span>
            </div>

            {/* Right: Custom */}
            <div className="h-full flex flex-col items-center justify-center md:pl-10 m-0">
              <h1 className="text-2xl font-bold text-center">
                Create Your Own Report
              </h1>

              {/* This should create a blank report and redirect to /reports/[reportID] */}
              <form method="POST" action="/api/reports/custom" className="mt-4">
                <Button type="submit" className="w-fit">
                  Create from Scratch
                </Button>
              </form>

              <p className="mt-3 text-xs text-muted-foreground max-w-xs">
                You’ll be able to search by company, ticker, or CIK and add tickers to your
                report from the next page.
              </p>
            </div>
          </div>
        </div>

        {/* Previously generated reports */}
        <div className="border-t pt-6 mt-10">
          <h2 className="text-xl font-semibold mb-4 text-center">Your Reports</h2>

          {reports.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center">
              No saved reports yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reports.map((r) => (
                <Link key={r.id} href={`/reports/${r.id}`} className="no-underline">
                  <Card className="cursor-pointer hover:shadow-lg">
                    <CardContent className="p-4 text-center font-medium">
                      {r.name ?? "Untitled Report"}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer id="footer">
        <div className="container">
          <div className="copyright">
            &copy; Copyright <strong>Room 225</strong>. All Rights Reserved
          </div>
        </div>
      </footer>
    </>
  );
}
