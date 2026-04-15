CREATE TYPE "public"."ner_log_status" AS ENUM('success', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "fetch_ner_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "ner_log_status" NOT NULL,
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
ALTER TABLE "feed_items" ADD COLUMN "ner_entities" jsonb;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "ner_model" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "ner_extracted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_fetch_ner_logs_run_at" ON "fetch_ner_logs" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "idx_fetch_ner_logs_status" ON "fetch_ner_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_feed_items_ner_extracted_at" ON "feed_items" USING btree ("ner_extracted_at") WHERE "feed_items"."ner_extracted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_feed_items_ner_entities_gin" ON "feed_items" USING gin ("ner_entities");