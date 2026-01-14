// app/api/reports/custom/route.ts
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { reports, users } from "@/db/schema";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Fetch email from Clerk so we can populate users.email
  const client = await clerkClient();
  const u = await client.users.getUser(userId);
  const email =
    u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ??
    u.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    return NextResponse.json({ error: "No email found for user" }, { status: 400 });
  }

  // ✅ Ensure user exists (Postgres upsert on email unique)
  await db
    .insert(users)
    .values({ id: userId, email })
    .onConflictDoUpdate({
      target: users.id, // id is PK
      set: { email },
    });

  const created = await db
    .insert(reports)
    .values({
      name: "Custom Report",
      userID: userId, // ✅ now FK will pass because users row exists
    })
    .returning({ reportID: reports.reportID });

  const reportID = created[0]?.reportID;
  if (!reportID) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }

  return NextResponse.redirect(new URL(`/reports/${reportID}`, req.url));
}
