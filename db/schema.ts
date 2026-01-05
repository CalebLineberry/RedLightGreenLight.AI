import { pgTable, text, uuid, timestamp, doublePrecision, index } from "drizzle-orm/pg-core";

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
});

// ---------------------------
// Tickers table
export const tickers = pgTable("tickers", {
  ticker: text("ticker").primaryKey(),
  company: text("company").notNull().unique(),
  price: doublePrecision("price").notNull(),
  industry: text("industry").notNull(),
  exchange: text("exchange").notNull(),
  logoURL: text("logo_url").notNull(),
  rawScore: doublePrecision("raw_score").notNull(),
  cik: text("cik").notNull().unique(),
  lastSync: timestamp("last_sync").defaultNow(),
});

// ---------------------------
// ReportedTickers table (many-to-many)
export const reportedTickers = pgTable(
  "reported_tickers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tickerSymbol: text("ticker_symbol").references(() => tickers.ticker),
    reportID: uuid("report_id").references(() => reports.reportID),
  },
  (table) => {
    return {
      reportTickerIdx: index("report_ticker_idx").on(table.reportID, table.tickerSymbol),
    };
  }
);

