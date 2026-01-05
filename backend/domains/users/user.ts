// backend/domains/users/user.ts
import { Report } from "../reports/report"
export class User {
  constructor(
    public readonly id: string,
    public readonly clerkId: string,
    public readonly email: string,
    public readonly createdAt: Date
  ) {}

  ownsReport(report: Report): boolean {
    return report.userId === this.id
  }
}
