CREATE TYPE "public"."tag_extraction_log_status" AS ENUM('success', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "fetch_tag_extraction_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "tag_extraction_log_status" NOT NULL,
	"items_fetched" integer DEFAULT 0 NOT NULL,
	"items_tagged" integer DEFAULT 0 NOT NULL,
	"items_skipped" integer DEFAULT 0 NOT NULL,
	"items_remaining_after" integer,
	"duration_ms" integer,
	"model_name" text,
	"error_message" text,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_fetch_tag_extraction_logs_run_at" ON "fetch_tag_extraction_logs" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "idx_fetch_tag_extraction_logs_status" ON "fetch_tag_extraction_logs" USING btree ("status");