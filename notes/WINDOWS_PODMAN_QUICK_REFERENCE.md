# ⚡ Windows Podman + pgvector 快速參考

## 🎯 前置要求檢查清單

- [ ] Windows 10 版本 1903+ 或 Windows 11
- [ ] 至少 4GB 可用磁碟空間
- [ ] 管理員權限
- [ ] 網路連接

---

## 🚀 快速 5 步啟動

### Step 1: 啟用 WSL2（在 PowerShell 管理員中）
```powershell
wsl --install
# 然後重新啟動電腦
```

### Step 2: 安裝 Podman Desktop
訪問：https://podman-desktop.io/downloads  
下載並執行 Windows 安裝檔

### Step 3: 建立目錄和檔案
```
C:\dev\rss-reader\docker\podman-compose.yml
```

### Step 4: 啟動容器
```powershell
cd C:\dev\rss-reader\docker
podman-compose up -d
```

### Step 5: 啟用 pgvector
```powershell
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## 📄 podman-compose.yml 完整檔案

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg17
    container_name: rss_postgres
    environment:
      POSTGRES_USER: rss_user
      POSTGRES_PASSWORD: rss_password
      POSTGRES_DB: rss_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rss_user -d rss_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

---

## 📋 檢查清單

- [ ] WSL2 已安裝（`wsl --list -v`）
- [ ] Podman Desktop 已安裝並運行
- [ ] `podman --version` 有輸出
- [ ] `podman-compose.yml` 已建立
- [ ] `podman-compose up -d` 執行成功
- [ ] `podman ps` 可以看到 rss_postgres 容器
- [ ] `.env.local` 包含 `DATABASE_URL="postgresql://rss_user:rss_password@localhost:5432/rss_db"`
- [ ] `npx drizzle-kit push` 執行成功
- [ ] Python 連接測試成功

---

## 🔑 連接憑證

```
Host: localhost
Port: 5432
Database: rss_db
Username: rss_user
Password: rss_password
```

---

## 🔗 連接字串

```
postgresql://rss_user:rss_password@localhost:5432/rss_db
```

---

## 🛠️ 常用命令

```powershell
# 查看容器狀態
podman ps

# 進入 PostgreSQL
podman exec -it rss_postgres psql -U rss_user -d rss_db

# 查看日誌
podman logs rss_postgres

# 停止容器
podman-compose down

# 重新啟動
podman-compose restart

# 刪除所有（警告：失去所有數據）
podman-compose down -v

# 檢查 Podman 狀態
podman info
```

---

## 🐘 PostgreSQL 常用 SQL

```sql
-- 啟用 pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 檢查擴展
\dx

-- 建立表
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  title TEXT,
  embedding vector(1536)
);

-- 插入資料
INSERT INTO items (title, embedding) VALUES 
  ('item1', '[0.1, 0.2, ...]'::vector);

-- 相似度搜尋（cosine distance）
SELECT id, title, embedding <-> '[0.15, 0.25, ...]' AS distance
FROM items
ORDER BY distance
LIMIT 5;

-- 建立索引
CREATE INDEX embedding_idx ON items USING hnsw (embedding vector_cosine_ops);
```

---

## 🐍 Python 連接範例

```python
import psycopg2

# 連接
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="rss_db",
    user="rss_user",
    password="rss_password"
)

# 執行查詢
with conn.cursor() as cur:
    cur.execute("SELECT version();")
    print(cur.fetchone())

conn.close()
```

---

## 🔍 排除故障

| 問題 | 解決方案 |
|------|---------|
| `command not found: podman` | 重新打開 PowerShell 或重新啟動電腦 |
| `Connection refused` | 檢查 `podman ps` 是否有運行的容器 |
| `password authentication failed` | 檢查 `.env.local` 與 `podman-compose.yml` 是否一致 |
| Port 5432 被佔用 | 修改 podman-compose.yml 中的 ports |
| WSL2 性能差 | 調整 `.wslconfig` 中的記憶體設定 |

---

## 📊 資源使用

- **磁碟空間**：~1-2 GB（含 Podman 映像）
- **記憶體**：~200-400 MB（可調整）
- **CPU**：閒置時基本不占用

---

## ✨ Podman 優勢

✅ **完全免費**（無商業許可費用）  
✅ **開源**（Red Hat 開發）  
✅ **無 daemon**（更輕量）  
✅ **預設無根**（更安全）  
✅ **Docker 相容**（同樣命令）  

---

## 🚀 驗證設置

```powershell
# 全部執行這些命令，應該都不會報錯

podman ps
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "SELECT version();"
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

✅ 如果都成功，設置完成！

---

## 📚 相關連結

- Podman 官網：https://podman.io/
- Podman Desktop：https://podman-desktop.io/
- pgvector GitHub：https://github.com/pgvector/pgvector
- Drizzle ORM：https://orm.drizzle.team/
- WSL2 文檔：https://docs.microsoft.com/en-us/windows/wsl/

---

## 💾 備份數據庫

```powershell
# 備份
podman exec rss_postgres pg_dump -U rss_user rss_db > backup.sql

# 恢復
cat backup.sql | podman exec -i rss_postgres psql -U rss_user rss_db
```

---

**Podman 是一個免費、開源、輕量的 Docker 替代品 - 特別適合沒有商業授權的開發者！**

