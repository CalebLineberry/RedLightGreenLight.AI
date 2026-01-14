"use client";

import React, { useEffect, useState, useMemo, useTransition } from "react";
import DualRangeSlider from "@/app/components/ui/DualRangeSlider";
import { deleteReports, setTrackedReports } from "./actions";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import Link from "next/link";
import AuthBar from "@/app/components/AuthBar";



type ReportListItem = {
  id: string; // report UUID
  name: string | null;
  isTracked: boolean;
};



function cleanNA(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (s.toLowerCase() === "n/a") return null;
  return s;
}

export default function GenerateReportsClient({
  reports: reportItems
}: {
  reports: ReportListItem[];
}) {

  const [scoreRange, setScoreRange] = useState<[number, number]>([50, 90]);

  const [industries, setIndustries] = useState<string[]>([]);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [isPending, startTransition] = useTransition();

const [deleteSelected, setDeleteSelected] = useState<Set<string>>(new Set());

const initialTracked = useMemo(
  () => new Set(reportItems.filter((r) => r.isTracked).map((r) => r.id)),
  [reportItems]
);
const [trackedSelected, setTrackedSelected] = useState<Set<string>>(initialTracked);

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
    <h2 className="text-xl font-semibold mb-2 text-center">Your Reports</h2>

    {/* Action bar */}
    <div className="flex flex-col items-center gap-2 mb-4">
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          onClick={() => {
            const ids = Array.from(deleteSelected);
            if (ids.length === 0) return;

            startTransition(async () => {
              await deleteReports(ids);
              setDeleteSelected(new Set());
            });
          }}
          disabled={isPending || deleteSelected.size === 0}
          className="w-fit"
        >
          {isPending ? "Working..." : `Delete selected (${deleteSelected.size})`}
        </Button>

        <Button
          type="button"
          onClick={() => {
            const ids = Array.from(trackedSelected);
            startTransition(async () => {
              await setTrackedReports(ids);
            });
          }}
          disabled={isPending}
          className="w-fit"
        >
          {isPending ? "Working..." : `Save tracking (${trackedSelected.size}/2)`}
        </Button>
      </div>

      <div className="text-xs opacity-80">
        Track up to <strong>two</strong> reports for updates.
      </div>
    </div>

    {reportItems.length === 0 ? (
      <div className="text-sm text-muted-foreground text-center">
        No saved reports yet.
      </div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportItems.map((r) => {
          const isDeleteChecked = deleteSelected.has(r.id);
          const isTrackedChecked = trackedSelected.has(r.id);
          const trackDisabled = !isTrackedChecked && trackedSelected.size >= 2;

          return (
            <div key={r.id} className="relative">
              {/* Clickable card */}
              <Link href={`/reports/${r.id}`} className="no-underline">
                <Card className="cursor-pointer hover:shadow-lg">
                  <CardContent className="p-4 text-center font-medium">
                    {r.name ?? "Untitled Report"}
                  </CardContent>
                </Card>
              </Link>

              {/* Overlay controls */}
              <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
                {/* Delete */}
                <label
                  className="flex items-center gap-1 text-xs bg-black/60 text-white px-2 py-1 rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isDeleteChecked}
                    onChange={() => {
                      setDeleteSelected((prev) => {
                        const next = new Set(prev);
                        const willBeSelectedForDelete = !next.has(r.id);

                        if (willBeSelectedForDelete) next.add(r.id);
                        else next.delete(r.id);

                        // If we just marked it for delete, ensure it's not tracked
                        if (willBeSelectedForDelete) {
                          setTrackedSelected((prevTracked) => {
                            const nextTracked = new Set(prevTracked);
                            nextTracked.delete(r.id);
                            return nextTracked;
                          });
                        }

                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  Delete
                </label>

                {/* Track */}
                <label
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    trackDisabled ? "bg-black/30 text-white/60" : "bg-black/60 text-white"
                  }`}
                  title={trackDisabled ? "You can only track two reports." : "Track for updates"}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isTrackedChecked}
                    disabled={isDeleteChecked || (!isTrackedChecked && trackedSelected.size >= 2)}
                    onChange={() => {
                      setTrackedSelected((prevTracked) => {
                        // If this report is marked for delete, never allow tracking it
                        if (deleteSelected.has(r.id)) {
                          return prevTracked;
                        }

                        const next = new Set(prevTracked);

                        if (next.has(r.id)) {
                          next.delete(r.id);
                          return next;
                        }

                        if (next.size >= 2) {
                          return next;
                        }

                        next.add(r.id);
                        return next;
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}

                  />
                  Track
                </label>
              </div>
            </div>
          );
        })}
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
);}
