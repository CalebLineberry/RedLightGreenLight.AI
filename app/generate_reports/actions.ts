"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reports, trackedReports, reportedTickers } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteReports(reportIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const ids = Array.from(new Set(reportIds)).filter(Boolean);
  if (ids.length === 0) return;

  await db.transaction(async (tx) => {
    // Only delete children for reports owned by this user:
    const owned = await tx
      .select({ id: reports.reportID })
      .from(reports)
      .where(and(eq(reports.userID, userId), inArray(reports.reportID, ids as any)));

    const ownedIds = owned.map((r) => r.id) as any[];
    if (ownedIds.length === 0) return;

    // Delete dependent rows first (prevents FK violations if cascade isn't set everywhere)
    await tx.delete(reportedTickers).where(inArray(reportedTickers.reportID, ownedIds as any));

    // trackedReports is cascade on reportID, but explicit delete is fine too:
    await tx
      .delete(trackedReports)
      .where(and(eq(trackedReports.userID, userId), inArray(trackedReports.reportID, ownedIds as any)));

    // Now delete the reports
    await tx
      .delete(reports)
      .where(and(eq(reports.userID, userId), inArray(reports.reportID, ownedIds as any)));
  });

  revalidatePath("/generate_reports");
}

export async function setTrackedReports(reportIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const ids = Array.from(new Set(reportIds)).filter(Boolean);

  // UX-friendly behavior:
  // - If some ids are stale/deleted/not-owned, we just ignore them.
  // - We still enforce "max 2" on what actually remains.
  let finalIds: string[] = [];

  if (ids.length > 0) {
    const owned = await db
      .select({ id: reports.reportID })
      .from(reports)
      .where(and(eq(reports.userID, userId), inArray(reports.reportID, ids as any)));

    finalIds = owned.map((r) => r.id as any);
  }

  if (finalIds.length > 2) finalIds = finalIds.slice(0, 2);

  await db.transaction(async (tx) => {
    // Replace the tracked set for this user
    await tx.delete(trackedReports).where(eq(trackedReports.userID, userId));

    if (finalIds.length > 0) {
      await tx.insert(trackedReports).values(
        finalIds.map((rid) => ({
          userID: userId,
          reportID: rid as any,
        }))
      );
    }
  });

  revalidatePath("/generate_reports");
}
