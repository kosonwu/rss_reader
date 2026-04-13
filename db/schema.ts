import { relations, sql } from "drizzle-orm";
import {
    boolean,
    customType,
    index,
    integer,
    pgEnum,
    pgTable,
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
    },
    (table) => [
        uniqueIndex("idx_user_bookmarks_user_item").on(table.userId, table.feedItemId),
        index("idx_user_bookmarks_user_id").on(table.userId),
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