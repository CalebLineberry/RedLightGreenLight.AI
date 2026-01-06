ALTER TABLE "tickers" ADD COLUMN "yh_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tickers" ADD COLUMN "needs_update" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tickers" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "tickers" ADD CONSTRAINT "tickers_yh_url_unique" UNIQUE("yh_url");