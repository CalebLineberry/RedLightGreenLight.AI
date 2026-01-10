import { pgTable, text, uuid, timestamp, doublePrecision, index, unique } from "drizzle-orm/pg-core";

// ---------------------------
// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});



// ---------------------------
// Reports table (one-to-many with User)
export const reports = pgTable("reports", {
  reportID: uuid("report_id").primaryKey().defaultRandom(),
  userID: text("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  name: text("name"),
});

// ---------------------------
// Tickers table
export const tickers = pgTable("tickers", {
  ticker: text("ticker").primaryKey(),
  company: text("company"),
  industry: text("industry"),
  exchange: text("exchange"),
  rawScore: doublePrecision("raw_score").notNull(),
  cik: text("cik").notNull().unique(),
  lastSync: timestamp("last_sync").defaultNow(),
});

// ---------------------------
// ReportedTickers table (many-to-many)
import { uniqueIndex } from "drizzle-orm/pg-core";

export const reportedTickers = pgTable(
  "reported_tickers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tickerSymbol: text("ticker_symbol")
      .notNull()
      .references(() => tickers.ticker),
    reportID: uuid("report_id")
      .notNull()
      .references(() => reports.reportID),
  },
  (table) => ({
    reportTickerUnique: uniqueIndex("reported_tickers_report_symbol_uq").on(
      table.reportID,
      table.tickerSymbol
    ),
  })
);


// user picks up to 2 reports to track
//Join table between users and reports
export const trackedReports = pgTable(
  "tracked_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userID: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reportID: uuid("report_id").notNull().references(() => reports.reportID, { onDelete: "cascade" }),
  },
  (t) => ({
    // don't allow the same report to be tracked twice by the same user
    userReportUnique: unique("tracked_reports_user_report_unique").on(t.userID, t.reportID),

    // common access path: "get tracked reports for user"
    userIdx: index("tracked_reports_user_idx").on(t.userID),

    // common access path: "get tracked users for report" (optional but often useful)
    reportIdx: index("tracked_reports_report_idx").on(t.reportID),
  })
);


