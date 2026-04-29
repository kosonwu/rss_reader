# ⚡ DBeaver + PostgreSQL 快速設置（5 分鐘）

## 🎯 3 步完成安裝和連接

### Step 1：下載並安裝 DBeaver（2 分鐘）

```
1. 訪問：https://dbeaver.io/download/
2. 點擊 Download
3. 執行 .exe 安裝檔
4. 點擊 Next - Next - Finish
```

✅ **DBeaver 已安裝**

---

### Step 2：建立新連接（1 分鐘）

```
Database → New Database Connection
      ↓
選擇 PostgreSQL
      ↓
點擊 Next
```

---

### Step 3：填入連接詳情（1 分鐘）

```
Server Host:    localhost
Port:           5432
Database:       rss_db
Username:       rss_user
Password:       rss_password
☑ Save password locally

[Test Connection]  ✅ 成功！
[Finish]
```

✅ **完成！現在可以使用 DBeaver 了**

---

## 📊 基本操作速查

### 查看表數據
```
左側樹 → 展開表 → 雙擊表名
```

### 執行 SQL 查詢
```
Ctrl + Alt + N → 輸入 SQL → Ctrl + Enter
```

### 導出結果
```
執行查詢 → 結果右鍵 → Export Data → CSV/Excel/JSON
```

### 查看表結構
```
右鍵表 → Properties 或 Edit
```

### 生成 ER 圖
```
右鍵 Schema → Generate ER Diagram
```

---

## 🔑 連接信息

```
Host:        localhost
Port:        5432
Database:    rss_db
Username:    rss_user
Password:    rss_password
```

---

## 🖥️ 常用快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| Ctrl + Alt + Shift + N | 新建連接 |
| Ctrl + Alt + N | 新建 SQL 腳本 |
| Ctrl + Enter | 執行查詢 |
| Ctrl + Shift + F | 格式化 SQL |
| F5 | 刷新 |
| Ctrl + Space | 自動完成 |

---

## 💡 常用 SQL 範例

```sql
-- 查看所有數據
SELECT * FROM tracked_entities LIMIT 10;

-- 統計行數
SELECT COUNT(*) FROM tracked_entities;

-- 查看 pgvector 狀態
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Embedding 相似度搜尋
SELECT id, title, embedding <-> '[0.1, 0.2, 0.3]'::vector AS distance
FROM tracked_entities
ORDER BY distance
LIMIT 5;

-- 查看表結構
SELECT * FROM information_schema.columns WHERE table_name = 'tracked_entities';
```

---

## 🆘 排除故障

| 問題 | 解決方案 |
|------|---------|
| 連接失敗 | 檢查 `podman ps` - 確認 PostgreSQL 容器運行 |
| 密碼錯誤 | 檢查 podman-compose.yml 中的憑證 |
| 驅動未找到 | 等待 1-2 分鐘讓 DBeaver 下載驅動 |
| 運行緩慢 | 首次加載 schema 會比較慢（耐心等待） |

---

## ✨ DBeaver 獨特功能

- 📊 自動生成 ER 圖
- 📥 多格式數據導入
- 📤 多格式數據導出
- 🔐 權限和角色管理
- 🔍 Schema 對比
- 💾 數據庫備份和恢復
- 🎨 語法高亮和自動完成
- 📋 複製表結構

---

## 🚀 下一步

1. ✅ 安裝 DBeaver
2. ✅ 建立 PostgreSQL 連接
3. ✅ 雙擊表查看數據
4. ✅ 試試執行一個 SQL 查詢
5. ✅ 生成 ER 圖看看

---

## 📚 推薦資源

- [DBeaver 官方網站](https://dbeaver.com/)
- [DBeaver 文檔](https://dbeaver.com/docs/dbeaver/)
- [DBeaver 論壇](https://github.com/dbeaver/dbeaver/discussions)

---

**立即開始！DBeaver 是最好的 PostgreSQL GUI 工具之一。**

