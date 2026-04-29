# Windows 上使用 Podman 設置 PostgreSQL + pgvector - 完整指南

## 📋 總覽

本指南會帶你用 Podman Desktop（免費、開源）替代 Docker Desktop，在 Windows 上本地設置 PostgreSQL + pgvector。

**優勢：**
- ✅ 完全免費且開源（無商業許可費用）
- ✅ 無需背景服務程序（更輕量）
- ✅ 預設無根運行（更安全）
- ✅ 與 Docker 命令兼容

預計耗時：**20-25 分鐘**

---

## 🎯 必要條件

- Windows 10 版本 1903 或更新版本（或 Windows 11）
- 至少 4GB 可用磁碟空間
- 管理員權限
- 網路連接

---

## 第 1 步：啟用 WSL2（Windows Subsystem for Linux）

### 1.1 打開 PowerShell（管理員）

1. 按 **Windows 鍵**
2. 搜尋 **PowerShell**
3. 右鍵 → **以系統管理員身份執行**
4. 如果彈出 UAC 提示，點擊 **是**

### 1.2 安裝 WSL2

執行以下命令：
```powershell
wsl --install
```

這會自動：
- 啟用 WSL 功能
- 啟用虛擬機平台
- 下載並安裝 Ubuntu Linux

⏳ **此步驟會下載 ~600MB，請等待完成**

### 1.3 重新啟動電腦

```powershell
Restart-Computer
```

### 1.4 設置 Ubuntu

重新啟動後，Ubuntu 終端會自動打開：
1. 當提示時，輸入你的 **Linux 用戶名**（例如：`rss-dev`）
2. 輸入 **密碼**（不會顯示字符，這很正常）
3. 再次輸入密碼確認

### 1.5 驗證 WSL2 安裝

在 PowerShell 中執行：
```powershell
wsl --list --verbose
```

✅ 應該看到 Ubuntu 且 VERSION 為 2

---

## 第 2 步：安裝 Podman Desktop

### 2.1 下載 Podman Desktop

1. 訪問官方網站：**https://podman-desktop.io/downloads**
2. 下載 **Windows** 版本（.exe 檔案，約 100-150 MB）

### 2.2 安裝 Podman Desktop

1. 雙擊下載的 `.exe` 檔案
2. 點擊 **Next** 接受預設選項
3. 如果彈出 UAC 提示，點擊 **是**
4. 安裝完成後，勾選 **Launch Podman Desktop**
5. 點擊 **Finish**

### 2.3 首次啟動 - 安裝 CLI 工具

Podman Desktop 會提示安裝額外工具：
1. 在歡迎畫面，點擊 **Next**
2. 系統會提示安裝 `kubectl` 和 `compose` CLI
3. 點擊 **Next** 接受安裝
4. ⏳ 等待安裝完成（約 2-3 分鐘）
5. 再次點擊 **Next** 進入 Dashboard

✅ 看到 Dashboard，代表 Podman Desktop 已準備好！

### 2.4 驗證 Podman 安裝

打開 PowerShell 執行：
```powershell
podman --version
```

✅ 應該看到版本號，例如：`podman version 5.x.x`

---

## 第 3 步：建立專案目錄結構

### 3.1 建立目錄

1. 打開 **Windows 檔案總管**
2. 導航到 `C:\`
3. 建立新資料夾：`dev`
4. 進入 `dev` 資料夾，建立：`rss-reader`
5. 進入 `rss-reader` 資料夾，建立：`docker`

**最終路徑：** `C:\dev\rss-reader\docker\`

---

## 第 4 步：建立 docker-compose.yml

### 4.1 建立檔案

1. 打開**記事本**或 **VS Code**
2. 複製以下完整內容：

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

### 4.2 儲存檔案

- [ ] 點擊 **另存新檔**
- [ ] 路徑設為: `C:\dev\rss-reader\docker\`
- [ ] 檔案名稱: `docker-compose.yml` （注意：**podman-compose** 而不是 docker-compose）
- [ ] 檔案類型: **所有檔案 (\*.\*)**
- [ ] 點擊 **儲存**

✅ **確認檔案名稱：docker-compose.yml（不是 .txt）**

---

## 第 5 步：啟動 PostgreSQL 容器

### 5.1 打開 PowerShell

```powershell
# 以系統管理員身份打開 PowerShell
```

### 5.2 導航到 docker 資料夾

```powershell
cd C:\dev\rss-reader\docker
```

驗證你在正確的位置：
```powershell
dir
```

應該看到 `docker-compose.yml` 檔案

### 5.3 啟動容器

```powershell
podman compose up -d
```

✅ 應該看到類似輸出：
```
Creating rss_postgres ... done
```

⏳ **首次執行會比較慢（下載映像，約 5-10 分鐘），請耐心等待...**

### 5.4 驗證容器正在運行

```powershell
podman ps
```

✅ 應該看到類似輸出：
```
CONTAINER ID   IMAGE                      STATUS
abc1234d5e6f   pgvector/pgvector:pg17    Up 2 minutes
```

如果看到 `rss_postgres` 容器且 STATUS 是 "Up"，代表成功！

---

## 第 6 步：啟用 pgvector 擴展

### 6.1 連接到 PostgreSQL

```powershell
podman exec -it rss_postgres psql -U rss_user -d rss_db
```

✅ 應該看到提示符變成：
```
rss_db=#
```

### 6.2 啟用 pgvector 擴展

在 PostgreSQL 提示符中執行：
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

✅ 應該看到：`CREATE EXTENSION`

### 6.3 驗證 pgvector

```sql
\dx
```

✅ 應該在列表中看到 `pgvector`：
```
   Name   | Version |   Schema   |         Description
----------+---------+------------+------------------------------
 pgvector | 0.8.2   | public     | vector data type and ivfflat...
```

### 6.4 退出 PostgreSQL

```sql
\q
```

---

## 第 7 步：設置 Next.js 專案（Drizzle ORM）

### 7.1 安裝依賴

在你的 Next.js 專案根目錄執行：

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit @types/pg
```

### 7.2 建立 .env.local

在你的 Next.js 專案根目錄建立 `.env.local` 檔案：

```env
DATABASE_URL="postgresql://rss_user:rss_password@localhost:5432/rss_db"
```

**確保完全符合密碼和用戶名**（從 docker-compose.yml 複製）

### 7.3 建立 Drizzle 設置

#### 7.3a 建立 lib/db/index.ts

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });
```

#### 7.3b 建立 drizzle.config.ts（在項目根目錄）

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 7.4 推送 Schema

執行：
```bash
npx drizzle-kit push
```

✅ 應該看到成功訊息（例如 `Tables synced`）

---

## 第 8 步：Python 設置（APScheduler）

### 8.1 安裝 PostgreSQL 驅動

```bash
pip install psycopg2-binary
```

### 8.2 測試 Python 連接

建立 `test_db_connection.py`：

```python
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="rss_db",
        user="rss_user",
        password="rss_password"
    )
    print("✅ 連接成功！")
    conn.close()
except Exception as e:
    print(f"❌ 連接失敗：{e}")
```

執行：
```bash
python test_db_connection.py
```

✅ 應該看到 `✅ 連接成功！`

---

## 常用 Podman 命令

### 查看容器狀態

```powershell
podman ps
```

### 查看容器日誌

```powershell
podman logs rss_postgres
```

### 進入 PostgreSQL 命令列

```powershell
podman exec -it rss_postgres psql -U rss_user -d rss_db
```

### 停止容器

```powershell
podman-compose down
```

### 重新啟動容器

```powershell
podman-compose restart
```

### 刪除所有容器和數據（警告：無法恢復！）

```powershell
podman-compose down -v
```

### 檢查 Podman 系統資訊

```powershell
podman info
```

---

## 🆘 常見問題排除

| 問題 | 原因 | 解決方案 |
|------|------|---------|
| `command not found: podman-compose` | podman-compose 未安裝或不在 PATH | 在 Podman Desktop 設定中重新安裝 CLI 工具，或重新啟動 PowerShell |
| `Cannot connect to Podman` | Podman 服務未啟動 | 確保 Podman Desktop 正在運行 |
| `Connection refused - localhost:5432` | 容器未啟動 | 執行 `podman ps` 確認容器狀態，或查看日誌 `podman logs rss_postgres` |
| `password authentication failed` | 密碼不匹配 | 檢查 `.env.local` 和 `docker-compose.yml` 中的密碼是否一致 |
| WSL2 緩慢 | 儲存位置 | 考慮調整 WSL2 配置（見下方優化部分） |

### 檢查日誌

如果容器無法啟動，查看詳細日誌：

```powershell
podman logs rss_postgres
```

---

## ⚙️ WSL2 優化（可選）

如果 WSL2 運行緩慢，編輯 `%UserProfile%\.wslconfig`：

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

然後重新啟動 WSL2：
```powershell
wsl --shutdown
```

---

## 📊 Podman vs Docker 對比

| 特性 | Podman | Docker Desktop |
|------|--------|----------------|
| **許可費用** | 免費（開源） | ✅ 商業授權需費用 |
| **後台服務** | 無（無 daemon） | 有（dockerd） |
| **無根運行** | ✅ 預設 | 需額外配置 |
| **命令相容性** | ✅ 100% 相容 | - |
| **compose 相容性** | ✅ podman-compose | ✅ docker-compose |
| **性能** | 稍快（無 daemon 開銷） | - |

---

## 🚀 下一步

現在你可以：

1. **在 Drizzle Schema 中使用 vector 欄：**
```typescript
import { pgTable, serial, text, vector } from "drizzle-orm/pg-core";

export const feedItems = pgTable("feed_items", {
  id: serial("id").primaryKey(),
  title: text("title"),
  embedding: vector("embedding", { dimensions: 768 }),
});
```

2. **在 Python worker 中生成和查詢 embeddings**

3. **建立向量索引加快查詢：**
```sql
CREATE INDEX ON feed_items USING hnsw (embedding vector_cosine_ops);
```

4. **使用 Podman Desktop GUI 管理容器**

---

## 📚 相關資源

- [Podman 官方文檔](https://podman.io/docs)
- [Podman Desktop 官網](https://podman-desktop.io/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Drizzle ORM](https://orm.drizzle.team/)
- [WSL2 文檔](https://docs.microsoft.com/en-us/windows/wsl/)

---

## 💾 備份你的數據庫

定期備份數據：

```powershell
# 備份
podman exec rss_postgres pg_dump -U rss_user rss_db > backup.sql

# 恢復
cat backup.sql | podman exec -i rss_postgres psql -U rss_user rss_db
```

---

## ✨ 完成！

恭賀！你已在 Windows 上使用 Podman 成功設置了 PostgreSQL + pgvector！

**主要優勢：**
✅ 無商業許可費用  
✅ 完全開源和免費  
✅ 與 Docker 完全相容  
✅ 更輕量的資源使用  

有任何問題，請查閱本指南或提供具體錯誤訊息。

