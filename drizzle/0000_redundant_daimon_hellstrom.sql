CREATE TYPE "public"."feed_fetch_status" AS ENUM('pending', 'active', 'error', 'paused');--> statement-breakpoint
CREATE TYPE "public"."fetch_log_status" AS ENUM('success', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "feed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid NOT NULL,
	"guid" text NOT NULL,
	"title" text,
	"description" text,
	"content" text,
	"url" text,
	"author" text,
	"og_image_url" text,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"site_url" text,
	"fetch_status" "feed_fetch_status" DEFAULT 'pending' NOT NULL,
	"fetch_interval_minutes" integer DEFAULT 60 NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_fetch_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feeds_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "fetch_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feed_id" uuid NOT NULL,
	"status" "fetch_log_status" NOT NULL,
	"article_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"keyword" text NOT NULL,
	"is_case_sensitive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feed_item_id" uuid NOT NULL,
	"bookmarked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_read_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feed_item_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feed_id" uuid NOT NULL,
	"display_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetch_logs" ADD CONSTRAINT "fetch_logs_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_feed_item_id_feed_items_id_fk" FOREIGN KEY ("feed_item_id") REFERENCES "public"."feed_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_read_items" ADD CONSTRAINT "user_read_items_feed_item_id_feed_items_id_fk" FOREIGN KEY ("feed_item_id") REFERENCES "public"."feed_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_feed_items_feed_guid" ON "feed_items" USING btree ("feed_id","guid");--> statement-breakpoint
CREATE INDEX "idx_feed_items_feed_id" ON "feed_items" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "idx_feed_items_published_at" ON "feed_items" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_feed_items_feed_published" ON "feed_items" USING btree ("feed_id","published_at");--> statement-breakpoint
CREATE INDEX "idx_feeds_fetch_status" ON "feeds" USING btree ("fetch_status");--> statement-breakpoint
CREATE INDEX "idx_feeds_last_fetched_at" ON "feeds" USING btree ("last_fetched_at");--> statement-breakpoint
CREATE INDEX "idx_fetch_logs_feed_id" ON "fetch_logs" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "idx_fetch_logs_run_at" ON "fetch_logs" USING btree ("run_at");--> statement-breakpoint
CREATE INDEX "idx_fetch_logs_feed_run" ON "fetch_logs" USING btree ("feed_id","run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_keywords_user_keyword" ON "keywords" USING btree ("user_id","keyword");--> statement-breakpoint
CREATE INDEX "idx_keywords_user_id" ON "keywords" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_bookmarks_user_item" ON "user_bookmarks" USING btree ("user_id","feed_item_id");--> statement-breakpoint
CREATE INDEX "idx_user_bookmarks_user_id" ON "user_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_read_items_user_item" ON "user_read_items" USING btree ("user_id","feed_item_id");--> statement-breakpoint
CREATE INDEX "idx_user_read_items_user_id" ON "user_read_items" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_subscriptions_user_feed" ON "user_subscriptions" USING btree ("user_id","feed_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_user_id" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_feed_id" ON "user_subscriptions" USING btree ("feed_id");