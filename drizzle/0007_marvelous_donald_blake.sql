CREATE TABLE "tracked_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"report_id" uuid NOT NULL,
	CONSTRAINT "tracked_reports_user_report_unique" UNIQUE("user_id","report_id")
);
--> statement-breakpoint
ALTER TABLE "tracked_reports" ADD CONSTRAINT "tracked_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracked_reports" ADD CONSTRAINT "tracked_reports_report_id_reports_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("report_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tracked_reports_user_idx" ON "tracked_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tracked_reports_report_idx" ON "tracked_reports" USING btree ("report_id");--> statement-breakpoint
ALTER TABLE "tickers" DROP COLUMN "needs_update";