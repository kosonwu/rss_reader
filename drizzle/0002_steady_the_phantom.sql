CREATE TYPE "public"."feed_language" AS ENUM('en', 'zh-TW');--> statement-breakpoint
ALTER TABLE "feeds" ADD COLUMN "language" "feed_language";