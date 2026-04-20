CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"taste_vector" vector(384),
	"top_tags" jsonb,
	"bookmark_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_updated_at" ON "user_profiles" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_taste_vector" ON "user_profiles" USING hnsw ("taste_vector" vector_cosine_ops);