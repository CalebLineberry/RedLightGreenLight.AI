import { NextResponse } from "next/server";
import { Webhook } from "svix"; // npm install svix
import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST(req: Request) {
  try {
    // Raw body text
    const payload = await req.text();

    // Convert headers to a plain object
    const headers = Object.fromEntries(req.headers.entries());

    // Verify Clerk webhook signature
    const svix = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    const event = svix.verify(payload, headers) as any;

    // Only act on new users
    if (event.type === "user.created") {
      const user = event.data;

      // Insert into Drizzle / Supabase
      await db.insert(users).values({
        id: user.id,
        email: user.email_addresses[0].email_address,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return new Response("Invalid signature", { status: 400 });
  }
}
