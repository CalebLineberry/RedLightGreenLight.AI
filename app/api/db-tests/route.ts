import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  await db.insert(users).values({
    clerkId: "test_clerk_id",
    email: "test@example.com",
  });

  return NextResponse.json({ ok: true });
}
