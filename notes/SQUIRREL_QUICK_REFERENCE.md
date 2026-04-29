# ⚡ SQuirreL SQL Client + PostgreSQL 快速設置

## 🎯 3 步快速設置（5 分鐘）

### Step 1：下載 PostgreSQL JDBC 驅動
```
訪問：https://jdbc.postgresql.org/download.html
下載：postgresql-42.7.x.jar（或更新版本）
保存位置：記住這個路徑
```

### Step 2：在 SQuirreL 中配置驅動
```
Windows → View Drivers
右鍵 PostgreSQL → Modify Driver
Extra Class Path → Add → 選擇下載的 JAR
List Drivers（自動填充 Class Name）
OK
```

### Step 3：建立連接
```
Windows → View Aliases
右鍵 → Create Alias
填入以下信息：
  Name: LocalPostgres
  Driver: PostgreSQL
  URL: jdbc:postgresql://localhost:5432/rss_db
  User: rss_user
  Password: rss_password
Test → OK
```

✅ **完成！雙擊連接開始查詢。**

---

## 📋 連接信息速查

```
Host:     localhost
Port:     5432
Database: rss_db
User:     rss_user
Password: rss_password
JDBC URL: jdbc:postgresql://localhost:5432/rss_db
```

---

## 🛠️ 排除故障

| 問題 | 解決方案 |
|------|---------|
| PostgreSQL 驅動是紅色 ❌ | 添加 JDBC JAR 到 Extra Class Path，點擊 List Drivers |
| Connection refused | 檢查 `podman ps` 確認容器運行 |
| User does not have privilege | 檢查用戶名和密碼 |
| Driver class not found | 確保 JAR 檔案路徑正確，重啟 SQuirreL |

---

## 🔍 測試連接

在 SQL 編輯器中執行：

```sql
-- 測試連接
SELECT version();

-- 查看所有表
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- 查看 pgvector
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- 查看你的數據
SELECT COUNT(*) FROM tracked_entities;
```

---

## 💾 常用 SQL 語句

### 查詢資料
```sql
-- 列出所有表
\dt

-- 查看表結構
\d tracked_entities

-- 查看表內容
SELECT * FROM tracked_entities LIMIT 10;

-- 查看 embeddings 相似度
SELECT id, title, embedding <-> '[0.1, 0.2, ...]'::vector AS distance
FROM tracked_entities
ORDER BY distance
LIMIT 5;
```

### 插入數據
```sql
INSERT INTO tracked_entities (title, embedding, co_occurrence_count)
VALUES ('test', '[0.1, 0.2, 0.3, ...]'::vector, 1);
```

### 管理
```sql
-- 查看數據庫
\l

-- 連接到特定數據庫
\c rss_db

-- 查看用戶
\du

-- 查看索引
\di
```

---

## 🎨 其他推薦工具

如果你想試試其他免費 GUI：

### **DBeaver Community** ⭐⭐⭐⭐⭐ 推薦
- 更現代的界面
- 更多功能（ER 圖、數據導入導出）
- 下載：https://dbeaver.io/download/

### **pgAdmin 4** ⭐⭐⭐⭐
- PostgreSQL 官方工具
- 強大的 PostgreSQL 特定功能
- 下載：https://www.pgadmin.org/

### **HeidiSQL** ⭐⭐⭐⭐（Windows 專用）
- 輕量級和快速
- 簡潔的界面
- 下載：https://www.heidisql.com/

### **Beekeeper Studio** ⭐⭐⭐⭐⭐
- 現代設計
- 支持多個數據庫
- 下載：https://www.beekeeperstudio.io/

---

## 🚀 下一步

1. **立即配置 SQuirreL**（按上面的 3 步）
2. **下載 JDBC 驅動**（5 分鐘）
3. **建立連接**（2 分鐘）
4. **開始查詢！**（立即）

---

## 📚 相關資源

- [SQuirreL SQL 官網](http://squirrel-sql.sourceforge.net)
- [PostgreSQL JDBC 下載](https://jdbc.postgresql.org/download.html)
- [PostgreSQL 文檔](https://www.postgresql.org/docs/)
- [SQuirreL 文檔](http://squirrel-sql.sourceforge.net/docs.html)

---

**立即開始！SQuirreL SQL Client 是一個優秀的 PostgreSQL 查詢工具。**

