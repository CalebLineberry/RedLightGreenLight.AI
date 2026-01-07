import React from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import Link from "next/link";
import AuthBar from "@/app/components/AuthBar";

export default function ReportsPage() {
  // Stub data for previously generated reports
  const reports = [
    { id: 1, name: "Tech Midcap" },
    { id: 2, name: "Healthcare Largecap" },
    { id: 3, name: "Energy Smallcap" },
    { id: 4, name: "Finance Mixed" },
  ];

  return (
    <>
    {/* Top Bar */}
      <section id="topbar" className="d-none d-lg-block">
        <div className="container clearfix">
          <div className="contact-info float-left">
            <i className="fa fa-envelope-o"></i>{' '}
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
<div className="mx-auto w-full max-w-none px-6 md:px-12">
      
<div className="w-full border-t pt-10">
<div className="grid grid-cols-1 md:grid-cols-[420px_1fr_420px] items-stretch">

    {/* Left: Custom */}
<div className="flex flex-col items-start md:pr-10">
        <h2 className="text-xl font-semibold w-full text-center">Create Your Own Report</h2>

      <form
        method="POST"
        action="/api/reports/custom"
        className="w-full max-w-md grid grid-cols-1 gap-4 mt-4"
      >
        {/* Report Name */}
        <div className="flex flex-col space-y-1">
          <label className="font-medium text-center">Report Name</label>
          <input className="border rounded p-2 w-full h-10" name="reportName" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="font-medium text-center">Industry</label>
            <select className="border rounded p-2 w-full h-10" name="industry">
              ...
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="font-medium text-center">Exchange</label>
            <select className="border rounded p-2 w-full h-10" name="exchange">
              ...
            </select>
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium text-center">Score Range</label>
          <div className="grid grid-cols-2 gap-4">
            <input type="range" name="scoreMin" min="0" max="100" defaultValue="50" />
            <input type="range" name="scoreMax" min="0" max="100" defaultValue="90" />
          </div>
        </div>

        <div className="flex justify-center">
          <Button type="submit" className="w-fit">Generate</Button>
        </div>
      </form>
    </div>

    {/* Middle: OR */}
<div className="hidden md:flex h-full items-center justify-center">
  <span className="text-6xl font-extrabold tracking-widest opacity-60 leading-none">OR</span>
</div>
    {/* Right: Quick Generate */}
<div className="h-full flex flex-col items-center justify-center md:pl-10">
          <h1 className="text-2xl font-bold text-center">Generate a Report</h1>
      <form method="POST" action="/api/reports/quick" className="mt-4">
        <Button type="submit" className="w-fit">Generate for me</Button>
      </form>
    </div>
  </div>
</div>

      {/* Previously generated reports */}
      <div className="border-t pt-6">
        <h2 className="text-xl font-semibold mb-4 text-center">Your Reports</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {reports.map((r) => (
            <form key={r.id} method="GET" action={`/reports/${r.id}`}>
              <Card className="cursor-pointer hover:shadow-lg">
                <CardContent className="p-4 text-center font-medium">
                  {r.name}
                </CardContent>
              </Card>
            </form>
          ))}
        </div>
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
