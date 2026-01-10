// app/api/reports/custom/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema";

export async function POST(req: Request) {
  const created = await db
    .insert(reports)
    .values({ name: "Custom Report" })
    .returning({ reportID: reports.reportID });

  const reportID = created[0]?.reportID;
  if (!reportID) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/reports/${reportID}`, req.url));
}
