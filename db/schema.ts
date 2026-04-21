import { relations, sql } from "drizzle-orm";
import {
    boolean,
    customType,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    real,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// pgvector custom type
// ---------------------------------------------------------------------------

const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
    dataType(config) {
        return `vector(${config?.dimensions ?? 1536})`;
    },
    toDriver(value: number[]): string {
        return JSON.stringify(value);
    },
    fromDriver(value: string): number[] {
        return JSON.parse(value);
    },
});

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const feedFetchStatusEnum = pgEnum("feed_fetch_status", [
    "pending",
    "active",
    "error",
    "paused",
]);

export const contentSourceEnum = pgEnum("content_source", [
    "feed_full",      // RSS 本身有全文
    "extracted",      // trafilatura 萃取成功
    "jina",           // Jina Reader 萃取
    "summary_only",   // 只有摘要，萃取失敗
]);

// 新增：fetch_logs 用的執行狀態
export const fetchLogStatusEnum = pgEnum("fetch_log_status", [
    "success",
    "failed",
    "skipped",          // feed 被 paused 時略過，仍留紀錄
]);

export const embeddingLogStatusEnum = pgEnum("embedding_log_status", [
    "success",
    "failed",
    "skipped",          // 無待處理 items 時略過
]);

export const tagExtractionLogStatusEnum = pgEnum("tag_extraction_log_status", [
    "success",
    "failed",
    "skipped",          // 無待處理 items 時略過
]);

export const nerLogStatusEnum = pgEnum("ner_log_status", [
    "success",
    "failed",
    "skipped",          // 無待處理 items 時略過
]);

export const feedLanguageEnum = pgEnum("feed_language", ["en", "zh-TW"]);

// ---------------------------------------------------------------------------
// feeds  ── 原始設計，不動
// ---------------------------------------------------------------------------

export const feeds = pgTable(
    "feeds",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        url: text("url").notNull().unique(),
        title: text("title"),
        description: text("description"),
        siteUrl: text("site_url"),
        fetchStatus: feedFetchStatusEnum("fetch_status").notNull().default("pending"),
        fetchIntervalMinutes: integer("fetch_interval_minutes").notNull().default(60),
        lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
        lastFetchError: text("last_fetch_error"),
        language: feedLanguageEnum("language"),
        userId: text("user_id"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        index("idx_feeds_fetch_status").on(table.fetchStatus),
        index("idx_feeds_last_fetched_at").on(table.lastFetchedAt),
    ],
);

// ---------------------------------------------------------------------------
// user_subscriptions  ── 原始設計，不動
// ---------------------------------------------------------------------------

export const userSubscriptions = pgTable(
    "user_subscriptions",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: text("user_id").notNull(),
        feedId: uuid("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" }),
        displayName: text("display_name"),
        isActive: boolean("is_active").notNull().default(true),
        subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        uniqueIndex("idx_user_subscriptions_user_feed").on(table.userId, table.feedId),
        index("idx_user_subscriptions_user_id").on(table.userId),
        index("idx_user_subscriptions_feed_id").on(table.feedId),
    ],
);

// ---------------------------------------------------------------------------
// feed_items  ── 修改１：新增 ogImageUrl 欄位
// ---------------------------------------------------------------------------

export const feedItems = pgTable(
    "feed_items",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        feedId: uuid("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" }),
        guid: text("guid").notNull(),
        title: text("title"),
        description: text("description"),
        content: text("content"),
        url: text("url"),
        author: text("author"),
        ogImageUrl: text("og_image_url"),               // ★ 新增：OG Fetcher 填入
        contentSource: contentSourceEnum("content_source"),  // ★ 新增：內容來源
        publishedAt: timestamp("published_at", { withTimezone: true }),
        fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().default(sql`now()`),
        // pgvector embedding 欄位
        embeddingContent: vector("embedding_content", { dimensions: 384 }),   // title + content
        embeddingTitle: vector("embedding_title", { dimensions: 384 }),        // 僅標題
        embeddingModel: text("embedding_model"),                               // 記錄產生時用的模型
        embeddedAt: timestamp("embedded_at", { withTimezone: true }),          // null = 尚未產生
        // KeyBERT 自動萃取標籤
        tags: text("tags").array(),                                            // 萃取出的關鍵字（5–8 個）
        tagsScores: real("tags_scores").array(),                               // 每個關鍵字的相關度分數（0–1）
        tagsModel: text("tags_model"),                                         // 使用的模型名稱
        tagsExtractedAt: timestamp("tags_extracted_at", { withTimezone: true }), // null = 尚未萃取
        // NER 命名實體辨識欄位
        nerEntities: jsonb("ner_entities").$type<{ text: string; type: string }[]>(), // [{text, type}] — 統一 OntoNotes label namespace
        nerModel: text("ner_model"),                                                // "ckip" | "spacy:en_core_web_sm"
        nerExtractedAt: timestamp("ner_extracted_at", { withTimezone: true }),      // null = 尚未萃取
        // display_tags — 由 NER + KeyBERT 計分後合併產出的顯示用標籤
        displayTags: text("display_tags").array(),                                  // 依分數排序的 tag 文字陣列
        displayTagsMeta: jsonb("display_tags_meta").$type<{ tag: string; type: string; score: number }[]>(), // 完整結構（tag, type, score）
        displayTagsUpdatedAt: timestamp("display_tags_updated_at", { withTimezone: true }), // null = 尚未生成
        // 閱讀時間（分鐘）— 由 fetcher 寫入時計算
        readingTimeMinutes: integer("reading_time_minutes").notNull().default(1),
    },
    (table) => [
        uniqueIndex("idx_feed_items_feed_guid").on(table.feedId, table.guid),
        index("idx_feed_items_feed_id").on(table.feedId),
        index("idx_feed_items_published_at").on(table.publishedAt),
        index("idx_feed_items_feed_published").on(table.feedId, table.publishedAt),
        // HNSW vector indexes（已直接建於 DB，drizzle-kit 僅作宣告用）
        index("idx_feed_items_embedding_content").using("hnsw", table.embeddingContent.op("vector_cosine_ops")),
        index("idx_feed_items_embedding_title").using("hnsw", table.embeddingTitle.op("vector_cosine_ops")),
        index("idx_feed_items_embedded_at").on(table.embeddedAt).where(sql`${table.embeddedAt} IS NULL`),
        // KeyBERT 標籤 indexes
        index("idx_feed_items_tags_extracted_at").on(table.tagsExtractedAt).where(sql`${table.tagsExtractedAt} IS NULL`),
        index("idx_feed_items_tags_gin").using("gin", table.tags),
        // NER indexes
        index("idx_feed_items_ner_extracted_at").on(table.nerExtractedAt).where(sql`${table.nerExtractedAt} IS NULL`),
        index("idx_feed_items_ner_entities_gin").using("gin", table.nerEntities),
        // display_tags indexes
        index("idx_feed_items_display_tags_updated_at").on(table.displayTagsUpdatedAt).where(sql`${table.displayTagsUpdatedAt} IS NULL`),
        index("idx_feed_items_display_tags_gin").using("gin", table.displayTags),
    ],
);

// ---------------------------------------------------------------------------
// keywords  ── 原始設計，不動
// ---------------------------------------------------------------------------

export const keywords = pgTable(
    "keywords",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: text("user_id").notNull(),
        keyword: text("keyword").notNull(),
        isCaseSensitive: boolean("is_case_sensitive").notNull().default(false),
        source: text("source").notNull().default("manual"),  // "manual" | "tag"
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        uniqueIndex("idx_keywords_user_keyword").on(table.userId, table.keyword),
        index("idx_keywords_user_id").on(table.userId),
    ],
);

// ---------------------------------------------------------------------------
// fetch_logs  ── 修改２：新增整張表
// ---------------------------------------------------------------------------

export const fetchLogs = pgTable(
    "fetch_logs",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        feedId: uuid("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" }),
        status: fetchLogStatusEnum("status").notNull(),
        articleCount: integer("article_count").notNull().default(0), // 本次新寫入幾筆
        durationMs: integer("duration_ms"),                          // 執行耗時（毫秒）
        errorMessage: text("error_message"),                         // failed 時記錄原因
        runAt: timestamp("run_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        index("idx_fetch_logs_feed_id").on(table.feedId),
        index("idx_fetch_logs_run_at").on(table.runAt),
        index("idx_fetch_logs_feed_run").on(table.feedId, table.runAt),
    ],
);

// ---------------------------------------------------------------------------
// fetch_embedding_logs  ── embedding 批次執行紀錄
// ---------------------------------------------------------------------------

export const fetchEmbeddingLogs = pgTable(
    "fetch_embedding_logs",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        status: embeddingLogStatusEnum("status").notNull(),
        itemsFetched: integer("items_fetched").notNull().default(0),   // 本次撈出的待 embed 數量
        itemsEmbedded: integer("items_embedded").notNull().default(0), // 成功寫入向量的數量
        itemsSkipped: integer("items_skipped").notNull().default(0),   // 因無 title/content 跳過的數量
        itemsRemainingAfter: integer("items_remaining_after"),         // 執行後仍未 embed 的總筆數
        durationMs: integer("duration_ms"),                            // 整批執行耗時（毫秒）
        modelName: text("model_name"),                                 // 使用的 embedding 模型名稱
        errorMessage: text("error_message"),                           // failed 時記錄原因
        runAt: timestamp("run_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        index("idx_fetch_embedding_logs_run_at").on(table.runAt),
        index("idx_fetch_embedding_logs_status").on(table.status),
    ],
);

// ---------------------------------------------------------------------------
// fetch_tag_extraction_logs  ── KeyBERT 標籤萃取批次執行紀錄
// ---------------------------------------------------------------------------

export const fetchTagExtractionLogs = pgTable(
    "fetch_tag_extraction_logs",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        status: tagExtractionLogStatusEnum("status").notNull(),
        itemsFetched: integer("items_fetched").notNull().default(0),   // 本次撈出的待萃取數量
        itemsTagged: integer("items_tagged").notNull().default(0),     // 成功寫入標籤的數量
        itemsSkipped: integer("items_skipped").notNull().default(0),   // 因無 title/content 跳過的數量
        itemsRemainingAfter: integer("items_remaining_after"),         // 執行後仍未萃取的總筆數
        durationMs: integer("duration_ms"),                            // 整批執行耗時（毫秒）
        modelName: text("model_name"),                                 // 使用的模型名稱
        errorMessage: text("error_message"),                           // failed 時記錄原因
        runAt: timestamp("run_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        index("idx_fetch_tag_extraction_logs_run_at").on(table.runAt),
        index("idx_fetch_tag_extraction_logs_status").on(table.status),
    ],
);

// ---------------------------------------------------------------------------
// fetch_ner_logs  ── NER 命名實體辨識批次執行紀錄
// ---------------------------------------------------------------------------

export const fetchNerLogs = pgTable(
    "fetch_ner_logs",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        status: nerLogStatusEnum("status").notNull(),
        itemsFetched: integer("items_fetched").notNull().default(0),     // 本次撈出的待萃取數量
        itemsTagged: integer("items_tagged").notNull().default(0),       // 成功寫入實體的數量
        itemsSkipped: integer("items_skipped").notNull().default(0),     // 因無 content 跳過的數量
        itemsRemainingAfter: integer("items_remaining_after"),           // 執行後仍未萃取的總筆數
        durationMs: integer("duration_ms"),                              // 整批執行耗時（毫秒）
        modelName: text("model_name"),                                   // "ckip" | "spacy:en_core_web_sm"
        errorMessage: text("error_message"),                             // failed 時記錄原因
        runAt: timestamp("run_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        index("idx_fetch_ner_logs_run_at").on(table.runAt),
        index("idx_fetch_ner_logs_status").on(table.status),
    ],
);

// ---------------------------------------------------------------------------
// entity_tag_index  ── 跨文章實體趨勢追蹤
// ---------------------------------------------------------------------------

export const entityTagIndex = pgTable(
    "entity_tag_index",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        entityText: text("entity_text").notNull(),           // 原始文字（保留大小寫）
        entityTextLower: text("entity_text_lower").notNull(), // 小寫正規化版本，供查詢用
        entityType: text("entity_type").notNull(),            // ORG/PRODUCT/PERSON/GPE/LOC/tags
        feedItemId: uuid("feed_item_id").notNull().references(() => feedItems.id, { onDelete: "cascade" }),
        feedId: uuid("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" }), // 反正規化加速查詢
        score: real("score").notNull(),                      // 來自 display_tags_meta 的計算分數
        publishedAt: timestamp("published_at", { withTimezone: true }), // 反正規化自 feed_items
        indexedAt: timestamp("indexed_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        uniqueIndex("idx_entity_tag_index_item_entity").on(table.feedItemId, table.entityTextLower),
        index("idx_entity_tag_index_entity_text").on(table.entityTextLower),
        index("idx_entity_tag_index_entity_type").on(table.entityType),
        index("idx_entity_tag_index_published_at").on(table.publishedAt),
        index("idx_entity_tag_index_entity_trend").on(table.entityTextLower, table.publishedAt),
        index("idx_entity_tag_index_feed_id").on(table.feedId),
    ],
);

// ---------------------------------------------------------------------------
// user_read_items  ── per-user 已讀紀錄
// ---------------------------------------------------------------------------

export const userReadItems = pgTable(
    "user_read_items",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: text("user_id").notNull(),
        feedItemId: uuid("feed_item_id").notNull().references(() => feedItems.id, { onDelete: "cascade" }),
        readAt: timestamp("read_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        uniqueIndex("idx_user_read_items_user_item").on(table.userId, table.feedItemId),
        index("idx_user_read_items_user_id").on(table.userId),
    ],
);

// ---------------------------------------------------------------------------
// user_bookmarks  ── per-user 書籤
// ---------------------------------------------------------------------------

export const userBookmarks = pgTable(
    "user_bookmarks",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: text("user_id").notNull(),
        feedItemId: uuid("feed_item_id").notNull().references(() => feedItems.id, { onDelete: "cascade" }),
        bookmarkedAt: timestamp("bookmarked_at", { withTimezone: true }).notNull().default(sql`now()`),
        removedAt: timestamp("removed_at", { withTimezone: true }), // null = active, non-null = soft deleted
    },
    (table) => [
        uniqueIndex("idx_user_bookmarks_user_item").on(table.userId, table.feedItemId),
        index("idx_user_bookmarks_user_id").on(table.userId),
        index("idx_user_bookmarks_active").on(table.userId).where(sql`${table.removedAt} IS NULL`),
    ],
);

// ---------------------------------------------------------------------------
// user_profiles  ── per-user 興趣側寫（離線批次計算）
// ---------------------------------------------------------------------------

export const userProfiles = pgTable(
    "user_profiles",
    {
        id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: text("user_id").notNull().unique(),
        // 品味向量：bookmarked feed_items 的 embeddingContent 加權平均（384-dim）
        // weight = retention 強度（仍保留 = 1.0 / log(days+1) / 0.1 for <24h removed）
        tasteVector: vector("taste_vector", { dimensions: 384 }),
        // 標籤興趣排行：[{ tag, freq, type }]，依 freq DESC 排列，top-10
        topTags: jsonb("top_tags").$type<{ tag: string; freq: number; type: string }[]>(),
        // 計算此 profile 時使用的 active bookmark 數量（用於判斷 profile 是否有意義）
        bookmarkCount: integer("bookmark_count").notNull().default(0),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        index("idx_user_profiles_user_id").on(table.userId),
        index("idx_user_profiles_updated_at").on(table.updatedAt),
        // HNSW index 供未來 nearest-neighbour 查詢（如：找品味相近的使用者）
        index("idx_user_profiles_taste_vector").using("hnsw", table.tasteVector.op("vector_cosine_ops")),
    ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const feedsRelations = relations(feeds, ({ many }) => ({
    subscriptions: many(userSubscriptions),
    items: many(feedItems),
    fetchLogs: many(fetchLogs),                       // ★ 新增
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
    feed: one(feeds, { fields: [userSubscriptions.feedId], references: [feeds.id] }),
}));

export const feedItemsRelations = relations(feedItems, ({ one, many }) => ({
    feed: one(feeds, { fields: [feedItems.feedId], references: [feeds.id] }),
    readItems: many(userReadItems),
    bookmarks: many(userBookmarks),
}));

export const keywordsRelations = relations(keywords, ({ many: _many }) => ({
    // 關鍵字比對為查詢期即時過濾，無需關聯表
}));

export const fetchLogsRelations = relations(fetchLogs, ({ one }) => ({  // ★ 新增
    feed: one(feeds, { fields: [fetchLogs.feedId], references: [feeds.id] }),
}));

export const userReadItemsRelations = relations(userReadItems, ({ one }) => ({
    feedItem: one(feedItems, { fields: [userReadItems.feedItemId], references: [feedItems.id] }),
}));

export const userBookmarksRelations = relations(userBookmarks, ({ one }) => ({
    feedItem: one(feedItems, { fields: [userBookmarks.feedItemId], references: [feedItems.id] }),
}));