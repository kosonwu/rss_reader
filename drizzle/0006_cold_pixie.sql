ALTER TABLE "feed_items" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "tags_scores" real[];--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "tags_model" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "tags_extracted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_feed_items_tags_extracted_at" ON "feed_items" USING btree ("tags_extracted_at") WHERE "feed_items"."tags_extracted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_feed_items_tags_gin" ON "feed_items" USING gin ("tags");