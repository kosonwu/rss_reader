CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN IF NOT EXISTS "embedding_content" vector(384);--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN IF NOT EXISTS "embedding_title" vector(384);--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN IF NOT EXISTS "embedding_model" text;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN IF NOT EXISTS "embedded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feed_items_embedding_content" ON "feed_items" USING hnsw ("embedding_content" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feed_items_embedding_title" ON "feed_items" USING hnsw ("embedding_title" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feed_items_embedded_at" ON "feed_items" USING btree ("embedded_at") WHERE "feed_items"."embedded_at" IS NULL;
