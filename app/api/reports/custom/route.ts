// app/api/reports/custom/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reports } from "@/db/schema";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // or: return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const created = await db
    .insert(reports)
    .values({
      name: "Custom Report",
      userID: userId, // ✅ owner
    })
    .returning({ reportID: reports.reportID });

  const reportID = created[0]?.reportID;
  if (!reportID) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/reports/${reportID}`, req.url));
}
