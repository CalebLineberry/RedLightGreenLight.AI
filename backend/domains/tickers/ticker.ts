// backend/domains/tickers/ticker.ts
export class Ticker {
  constructor(
    public readonly symbol: string,
    public readonly company: string,
    public readonly yhURL: string,
    public readonly industry: string,
    public readonly exchange: string,
    public readonly logoURL: string,
    public readonly rawScore: number,
    public readonly cik: string,
    public readonly lastSync: Date,
    public needsUpdate: boolean
  ) {}

  isStale(maxAgeMs: number): boolean {
    return Date.now() - this.lastSync.getTime() > maxAgeMs
  }
}
