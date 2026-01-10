import { NextResponse } from "next/server";
import { db } from "@/db";
import { tickers } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  // Industries: pick one value per lower(industry), ordered alphabetically by lower(industry)
  const industriesRows = await db.execute(sql`
    select distinct on (lower(${tickers.industry}))
      ${tickers.industry} as industry
    from ${tickers}
    where ${tickers.industry} is not null
      and ${tickers.industry} <> ''
      and lower(${tickers.industry}) not in ('n/a', 'na', 'none', 'unknown')
    order by lower(${tickers.industry}) asc, ${tickers.industry} asc
  `);

  // Exchanges
  const exchangesRows = await db.execute(sql`
    select distinct on (lower(${tickers.exchange}))
      ${tickers.exchange} as exchange
    from ${tickers}
    where ${tickers.exchange} is not null
      and ${tickers.exchange} <> ''
      and lower(${tickers.exchange}) not in ('n/a', 'na', 'none', 'unknown')
    order by lower(${tickers.exchange}) asc, ${tickers.exchange} asc
  `);

  // drizzle db.execute returns { rows: [...] } in many setups
  const industries =
    (industriesRows as any).rows?.map((r: any) => r.industry) ??
    (industriesRows as any).map?.((r: any) => r.industry) ??
    [];

  const exchanges =
    (exchangesRows as any).rows?.map((r: any) => r.exchange) ??
    (exchangesRows as any).map?.((r: any) => r.exchange) ??
    [];

  return NextResponse.json({ industries, exchanges });
}
