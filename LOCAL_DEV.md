# 本地開發環境

## 資料庫（PostgreSQL + pgvector）

使用 Podman 容器，設定如下：

| 項目 | 值 |
|---|---|
| 容器名稱 | `rss_db` |
| 使用者 | `rss_user` |
| 密碼 | `rss_password` |
| 資料庫 | `rss_db` |
| Port | `5432` |

---

## 容器管理（PowerShell）

```powershell
# 首次建立容器（只需執行一次）
podman run -d --name rss_db -e POSTGRES_USER=rss_user -e POSTGRES_PASSWORD=rss_password -e POSTGRES_DB=rss_db -p 5432:5432 -v rss_db_data:/var/lib/postgresql/data --restart=unless-stopped pgvector/pgvector:pg17

# 啟動
podman start rss_db

# 停止
podman stop rss_db

# 查看狀態
podman ps

# 進入 psql（互動式 DB shell）
podman exec -it rss_db psql -U rss_user -d rss_db

# 刪除容器（資料保留在 volume）
podman rm rss_db

# 刪除容器 + 資料（完全重置）
podman volume rm rss_db_data
```

---

## Schema 管理（Drizzle）

```powershell
# 套用所有 migration（首次或新增 migration 後執行）
$files = Get-ChildItem ".\drizzle\*.sql" | Sort-Object Name
foreach ($f in $files) { Get-Content $f.FullName | podman exec -i rss_db psql -U rss_user -d rss_db }

# 產生新的 migration（修改 db/schema.ts 後執行）
npx drizzle-kit generate:pg

# 開啟 Drizzle Studio（DB 瀏覽器）
npx drizzle-kit studio
```

---

## 開發伺服器

```powershell
npm run dev    # http://localhost:3000
```
