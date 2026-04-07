import { relations, sql } from "drizzle-orm";
import {
    boolean,
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
// Enums
// ---------------------------------------------------------------------------

export const feedFetchStatusEnum = pgEnum("feed_fetch_status", [
    "pending",
    "active",
    "error",
    "paused",
]);

// 新增：fetch_logs 用的執行狀態
export const fetchLogStatusEnum = pgEnum("fetch_log_status", [
    "success",
    "failed",
    "skipped",          // feed 被 paused 時略過，仍留紀錄
]);

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
        publishedAt: timestamp("published_at", { withTimezone: true }),
        fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().default(sql`now()`),
    },
    (table) => [
        uniqueIndex("idx_feed_items_feed_guid").on(table.feedId, table.guid),
        index("idx_feed_items_feed_id").on(table.feedId),
        index("idx_feed_items_published_at").on(table.publishedAt),
        index("idx_feed_items_feed_published").on(table.feedId, table.publishedAt),
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

export const feedItemsRelations = relations(feedItems, ({ one }) => ({
    feed: one(feeds, { fields: [feedItems.feedId], references: [feeds.id] }),
}));

export const keywordsRelations = relations(keywords, ({ many: _many }) => ({
    // 關鍵字比對為查詢期即時過濾，無需關聯表
}));

export const fetchLogsRelations = relations(fetchLogs, ({ one }) => ({  // ★ 新增
    feed: one(feeds, { fields: [fetchLogs.feedId], references: [feeds.id] }),
}));