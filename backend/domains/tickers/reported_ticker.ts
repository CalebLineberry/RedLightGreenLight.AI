// backend/domains/tickers/reported_ticker.ts
import { Ticker } from "./ticker"

export class ReportedTicker {
  constructor(
    public readonly id: string,
    public readonly reportId: string,
    public readonly ticker: Ticker
  ) {}
}
