// app/api/reports/[reportID]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
  props: { params: Promise<{ reportID: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportID } = await props.params;

  const rows = await db
    .select({ name: reports.name })
    .from(reports)
    .where(and(eq(reports.reportID, reportID), eq(reports.userID, userId)))
    .limit(1);

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ name: rows[0].name ?? "" });
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ reportID: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportID } = await props.params;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) return NextResponse.json("Report name can’t be empty.", { status: 400 });
  if (name.length > 80)
    return NextResponse.json("Report name must be 80 characters or less.", { status: 400 });

  const updated = await db
    .update(reports)
    .set({ name })
    .where(and(eq(reports.reportID, reportID), eq(reports.userID, userId)))
    .returning({ reportID: reports.reportID });

  if (!updated.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
