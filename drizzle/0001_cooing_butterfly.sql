CREATE TABLE "reported_tickers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker_symbol" text,
	"report_id" uuid
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"report_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickers" (
	"ticker" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"price" double precision NOT NULL,
	"industry" text NOT NULL,
	"exchange" text NOT NULL,
	"logo_url" text NOT NULL,
	"raw_score" double precision NOT NULL,
	"cik" text NOT NULL,
	"last_sync" timestamp DEFAULT now(),
	CONSTRAINT "tickers_company_unique" UNIQUE("company"),
	CONSTRAINT "tickers_cik_unique" UNIQUE("cik")
);
--> statement-breakpoint
ALTER TABLE "reported_tickers" ADD CONSTRAINT "reported_tickers_ticker_symbol_tickers_ticker_fk" FOREIGN KEY ("ticker_symbol") REFERENCES "public"."tickers"("ticker") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reported_tickers" ADD CONSTRAINT "reported_tickers_report_id_reports_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("report_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_ticker_idx" ON "reported_tickers" USING btree ("report_id","ticker_symbol");