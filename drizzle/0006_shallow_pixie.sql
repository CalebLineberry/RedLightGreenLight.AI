ALTER TABLE "tickers" DROP CONSTRAINT "tickers_company_unique";--> statement-breakpoint
ALTER TABLE "tickers" DROP CONSTRAINT "tickers_yh_url_unique";--> statement-breakpoint
ALTER TABLE "tickers" ALTER COLUMN "company" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tickers" ALTER COLUMN "yh_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tickers" ALTER COLUMN "industry" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tickers" ALTER COLUMN "exchange" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tickers" ALTER COLUMN "logo_url" DROP NOT NULL;