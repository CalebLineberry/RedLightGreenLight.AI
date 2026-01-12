import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import GenerateReportsClient from "./GenerateReportsClient";

import { db } from "@/db";
import { reports } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export default async function Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const myReports = await db
    .select({ id: reports.reportID, name: reports.name })
    .from(reports)
    .where(eq(reports.userID, userId))
    .orderBy(desc(reports.createdAt))
    .limit(50);

  return <GenerateReportsClient reports={myReports} />;
}
