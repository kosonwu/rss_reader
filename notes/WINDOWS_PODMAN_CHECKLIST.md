# ✅ Windows Podman + PostgreSQL + pgvector 設置檢查清單

## 📋 前置檢查

- [ ] Windows 10 版本 1903 或更新版本（或 Windows 11）
- [ ] 至少 4GB 可用磁碟空間
- [ ] 管理員權限可用
- [ ] 網路連接正常
- [ ] 沒有 Docker Desktop 或其他容器工具在運行

---

## 第 1 部分：WSL2 安裝和配置

### Step 1.1: 檢查 Windows 版本
- [ ] 按 Windows 鍵，搜尋「關於」
- [ ] 驗證 Windows 版本是 1903 或更新版本

### Step 1.2: 啟用 WSL2
- [ ] 打開 PowerShell（管理員）
- [ ] 執行: `wsl --install`
- [ ] 等待完成（~10 分鐘）
- [ ] **重新啟動電腦**（重要！）

### Step 1.3: 設置 Ubuntu Linux
- [ ] Ubuntu 終端自動打開
- [ ] 輸入用戶名（例如：`rss-dev`）
- [ ] 設置密碼（輸入兩次）
- [ ] 等待初始化完成

### Step 1.4: 驗證 WSL2 安裝
```powershell
wsl --list --verbose
```
- [ ] 看到 Ubuntu 列表
- [ ] VERSION 欄顯示 **2**
- [ ] STATUS 顯示 **Running**

✅ **WSL2 已準備好！**

---

## 第 2 部分：Podman 安裝

### Step 2.1: 下載 Podman Desktop
- [ ] 訪問: https://podman-desktop.io/downloads
- [ ] 選擇 **Windows** 平台
- [ ] 下載 `.exe` 檔案（約 100-150 MB）
- [ ] 等待下載完成

### Step 2.2: 安裝 Podman Desktop
- [ ] 雙擊 `podman-desktop-setup.exe`
- [ ] 接受許可協議
- [ ] 選擇安裝目錄（預設即可）
- [ ] 如果彈出 UAC，點擊 **是**
- [ ] 勾選 **Launch Podman Desktop**
- [ ] 點擊 **Finish**

### Step 2.3: 完成 CLI 工具安裝
Podman Desktop 首次啟動時會自動提示：
- [ ] 看到歡迎畫面
- [ ] 點擊 **Next** 進行下一步
- [ ] 點擊 **Install** 安裝 kubectl 和 compose CLI
- [ ] ⏳ 等待安裝完成（約 2-3 分鐘）
- [ ] 再次點擊 **Next** 進入 Dashboard
- [ ] 看到 **Dashboard** 頁面

✅ **Podman Desktop 已準備好！**

### Step 2.4: 驗證 Podman 安裝
打開 PowerShell（普通用戶）：
```powershell
podman --version
```
- [ ] 看到版本號，例如 `podman version 5.x.x`

✅ **Podman 命令行工具可用！**

---

## 第 3 部分：建立專案目錄和配置

### Step 3.1: 建立目錄結構
- [ ] 打開 Windows 檔案總管
- [ ] 導航到 `C:\`
- [ ] 新增資料夾 `dev`
- [ ] 進入 `dev`，新增資料夾 `rss-reader`
- [ ] 進入 `rss-reader`，新增資料夾 `docker`

**驗證路徑：** `C:\dev\rss-reader\docker\`

### Step 3.2: 建立 podman-compose.yml

#### 3.2a: 開啟記事本或 VS Code
- [ ] 打開記事本或 VS Code
- [ ] 新增檔案

#### 3.2b: 複製配置內容
- [ ] 複製以下完整內容：

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

#### 3.2c: 儲存檔案
- [ ] 點擊 **另存新檔**
- [ ] 選擇位置：`C:\dev\rss-reader\docker\`
- [ ] 檔案名稱：`podman-compose.yml`
- [ ] 檔案類型：**所有檔案 (\*.\*)**
- [ ] 點擊 **儲存**

✅ **驗證檔案名稱不是 podman-compose.yml.txt**

---

## 第 4 部分：啟動 PostgreSQL 容器

### Step 4.1: 打開 PowerShell
- [ ] 按 Windows 鍵 + R
- [ ] 輸入 `powershell` 然後按 Enter
- [ ] 或直接搜尋 PowerShell 並點擊打開

### Step 4.2: 導航到 docker 目錄
```powershell
cd C:\dev\rss-reader\docker
```
- [ ] 執行命令
- [ ] 驗證提示符顯示正確路徑

### Step 4.3: 驗證檔案存在
```powershell
dir
```
- [ ] 看到列表中有 `podman-compose.yml`

### Step 4.4: 啟動容器
```powershell
podman-compose up -d
```
- [ ] 執行命令
- [ ] 看到類似輸出：`Creating rss_postgres ... done`
- [ ] ⏳ 首次可能需要 5-10 分鐘（下載映像）

✅ **容器已啟動！**

### Step 4.5: 驗證容器運行
```powershell
podman ps
```
- [ ] 看到列表
- [ ] 其中有一行包含 `rss_postgres`
- [ ] STATUS 欄顯示 `Up` 和時間（例如 `Up 2 minutes`）

✅ **PostgreSQL 容器正在運行！**

---

## 第 5 部分：啟用 pgvector 擴展

### Step 5.1: 連接到 PostgreSQL
```powershell
podman exec -it rss_postgres psql -U rss_user -d rss_db
```
- [ ] 執行命令
- [ ] 看到提示符變成 `rss_db=#`

### Step 5.2: 建立 pgvector 擴展
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
- [ ] 在 PostgreSQL 提示符執行
- [ ] 看到輸出：`CREATE EXTENSION`

### Step 5.3: 驗證擴展安裝
```sql
\dx
```
- [ ] 執行命令
- [ ] 在列表中看到 `pgvector`
- [ ] 版本號應該是 `0.8.2` 或更新版本

✅ **pgvector 已啟用！**

### Step 5.4: 退出 PostgreSQL
```sql
\q
```
- [ ] 返回 PowerShell 提示符

✅ **PostgreSQL 配置完成！**

---

## 第 6 部分：設置 Next.js 應用

### Step 6.1: 安裝 Node.js 依賴
在你的 Next.js 專案根目錄：
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit @types/pg
```
- [ ] 執行命令
- [ ] 看到 `added X packages` 輸出

### Step 6.2: 建立 .env.local
- [ ] 在 Next.js 專案根目錄建立檔案：`.env.local`
- [ ] 添加內容：
```env
DATABASE_URL="postgresql://rss_user:rss_password@localhost:5432/rss_db"
```
- [ ] 儲存檔案

✅ **驗證與 podman-compose.yml 中的憑證匹配**

### Step 6.3: 建立 lib/db/index.ts
- [ ] 建立目錄結構：`lib/db/`
- [ ] 建立檔案：`index.ts`
- [ ] 複製內容：
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });
```
- [ ] 儲存檔案

### Step 6.4: 建立 drizzle.config.ts（在專案根目錄）
- [ ] 建立檔案：`drizzle.config.ts`
- [ ] 複製內容：
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
- [ ] 儲存檔案

### Step 6.5: 推送 Schema（如果有 schema.ts）
```bash
npx drizzle-kit push
```
- [ ] 執行命令
- [ ] 看到成功訊息（例如 `Tables synced`）

✅ **Next.js 已連接到數據庫！**

---

## 第 7 部分：Python 設置

### Step 7.1: 安裝 PostgreSQL 驅動
```bash
pip install psycopg2-binary
```
- [ ] 執行命令
- [ ] 看到 `Successfully installed` 訊息

### Step 7.2: 測試 Python 連接
- [ ] 建立測試檔案：`test_db_connection.py`
- [ ] 複製內容：
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
- [ ] 執行：`python test_db_connection.py`
- [ ] 看到 `✅ 連接成功！`

✅ **Python 可以連接到數據庫！**

---

## 最終驗證

### 執行全面檢查
```powershell
# 檢查 Podman 狀態
podman ps

# 檢查容器日誌
podman logs rss_postgres

# 檢查 PostgreSQL 版本
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "SELECT version();"

# 檢查 pgvector
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

- [ ] 所有命令都執行成功（無錯誤）
- [ ] 看到版本號和 pgvector 擴展

✅ **完整設置驗證成功！**

---

## 🎉 設置完成標誌

以下全部完成時，設置就完成了：

✅ WSL2 已安裝並運行  
✅ Podman Desktop 已安裝  
✅ `podman --version` 有輸出  
✅ PostgreSQL 容器正在運行  
✅ pgvector 擴展已啟用  
✅ `.env.local` 已建立  
✅ Drizzle 配置完成  
✅ Next.js 可以連接到數據庫  
✅ Python 可以連接到數據庫  

---

## 📊 常用命令快速參考

| 功能 | 命令 |
|------|------|
| 查看容器 | `podman ps` |
| 查看日誌 | `podman logs rss_postgres` |
| 進入 PostgreSQL | `podman exec -it rss_postgres psql -U rss_user -d rss_db` |
| 停止容器 | `podman-compose down` |
| 重啟容器 | `podman-compose restart` |
| 刪除所有數據 | `podman-compose down -v` |
| 備份數據庫 | `podman exec rss_postgres pg_dump -U rss_user rss_db > backup.sql` |
| 恢復數據庫 | `cat backup.sql \| podman exec -i rss_postgres psql -U rss_user rss_db` |

---

## 🆘 如果有問題

1. **查看詳細日誌：**
```powershell
podman logs rss_postgres
```

2. **重新啟動容器：**
```powershell
podman-compose restart
```

3. **檢查連接：**
```powershell
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "SELECT 1;"
```

4. **查看 Podman 系統狀態：**
```powershell
podman info
```

---

## 💡 提示

- **自動啟動：** Podman Desktop 可以設置為開機自動啟動（Settings → Startup）
- **性能：** 如果 WSL2 運行緩慢，調整 `.wslconfig` 中的記憶體設定
- **備份：** 定期備份數據庫（見上方命令）
- **更新：** Podman Desktop 會自動檢查更新

---

**🎉 恭賀！你已成功使用免費的 Podman 設置了完整的 PostgreSQL + pgvector 開發環境！**

