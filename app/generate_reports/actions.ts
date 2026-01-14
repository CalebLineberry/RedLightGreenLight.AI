"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reports, trackedReports } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteReports(reportIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const ids = Array.from(new Set(reportIds)).filter(Boolean);
  if (ids.length === 0) return;

  // Only delete reports owned by the user
  await db
    .delete(reports)
    .where(and(eq(reports.userID, userId), inArray(reports.reportID, ids as any)));

  // trackedReports rows will be removed automatically due to ON DELETE CASCADE on trackedReports.reportID
  revalidatePath("/generate_reports");
}

export async function setTrackedReports(reportIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const ids = Array.from(new Set(reportIds)).filter(Boolean);

  if (ids.length > 2) {
    throw new Error("You can track at most 2 reports.");
  }

  // Ensure the reports belong to the user (prevents tracking someone else’s report)
  if (ids.length > 0) {
    const owned = await db
      .select({ id: reports.reportID })
      .from(reports)
      .where(and(eq(reports.userID, userId), inArray(reports.reportID, ids as any)));

    if (owned.length !== ids.length) {
      throw new Error("One or more selected reports are not owned by you.");
    }
  }

  await db.transaction(async (tx) => {
    // Replace the tracked set for this user
    await tx.delete(trackedReports).where(eq(trackedReports.userID, userId));

    if (ids.length > 0) {
      await tx.insert(trackedReports).values(
        ids.map((rid) => ({
          userID: userId,
          reportID: rid as any, // (uuid typed) - cast keeps TS happy if rid is string
        }))
      );
    }
  });

  revalidatePath("/generate_reports");
}
