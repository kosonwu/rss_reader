CREATE TABLE "entity_tag_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_text" text NOT NULL,
	"entity_text_lower" text NOT NULL,
	"entity_type" text NOT NULL,
	"feed_item_id" uuid NOT NULL,
	"feed_id" uuid NOT NULL,
	"score" real NOT NULL,
	"published_at" timestamp with time zone,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "display_tags" text[];--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "display_tags_meta" jsonb;--> statement-breakpoint
ALTER TABLE "feed_items" ADD COLUMN "display_tags_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entity_tag_index" ADD CONSTRAINT "entity_tag_index_feed_item_id_feed_items_id_fk" FOREIGN KEY ("feed_item_id") REFERENCES "public"."feed_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_tag_index" ADD CONSTRAINT "entity_tag_index_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_entity_tag_index_item_entity" ON "entity_tag_index" USING btree ("feed_item_id","entity_text_lower");--> statement-breakpoint
CREATE INDEX "idx_entity_tag_index_entity_text" ON "entity_tag_index" USING btree ("entity_text_lower");--> statement-breakpoint
CREATE INDEX "idx_entity_tag_index_entity_type" ON "entity_tag_index" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "idx_entity_tag_index_published_at" ON "entity_tag_index" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_entity_tag_index_entity_trend" ON "entity_tag_index" USING btree ("entity_text_lower","published_at");--> statement-breakpoint
CREATE INDEX "idx_entity_tag_index_feed_id" ON "entity_tag_index" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "idx_feed_items_display_tags_updated_at" ON "feed_items" USING btree ("display_tags_updated_at") WHERE "feed_items"."display_tags_updated_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_feed_items_display_tags_gin" ON "feed_items" USING gin ("display_tags");