ALTER TABLE "reported_tickers" DROP CONSTRAINT "reported_tickers_report_id_reports_report_id_fk";
--> statement-breakpoint
DROP INDEX "report_ticker_idx";--> statement-breakpoint
ALTER TABLE "reported_tickers" ALTER COLUMN "ticker_symbol" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reported_tickers" ALTER COLUMN "report_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reported_tickers" ADD CONSTRAINT "reported_tickers_report_id_reports_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("report_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reported_tickers_report_symbol_uq" ON "reported_tickers" USING btree ("report_id","ticker_symbol");