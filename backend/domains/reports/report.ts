// backend/domains/reports/report.ts
import { ReportedTicker } from "../tickers/reported_ticker"

export class Report {
  private readonly tickers: ReportedTicker[] = []

  constructor(
    public readonly id: string,
    public readonly userId: string | null,
    public readonly createdAt: Date
  ) {}

  addTicker(ticker: ReportedTicker) {
    this.tickers.push(ticker)
  }

  getTickers(): readonly ReportedTicker[] {
    return this.tickers
  }
}
