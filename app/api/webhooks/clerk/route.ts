import { Webhook } from "svix";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const payload = await req.text();

  const svix = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  try {
    const event = svix.verify(
      payload,
      Object.fromEntries(req.headers.entries())
    ) as any;

    if (event.type === "user.created") {
      const user = event.data;

      await prisma.user.create({
        data: {
          clerkID: user.id,
          email: user.email_addresses[0].email_address,
        },
      });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Invalid signature", { status: 400 });
  }
}
