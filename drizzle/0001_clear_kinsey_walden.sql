CREATE TYPE "public"."content_source" AS ENUM('feed_full', 'extracted', 'jina', 'summary_only');--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "content_source" "content_source";