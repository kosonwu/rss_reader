# 📊 Podman PostgreSQL 數據存儲位置詳細說明

## 🎯 簡短答案

你的 PostgreSQL 數據 (`rss_db`) 儲存在：

### **Windows + WSL2 環境**
```
\\wsl.localhost\Ubuntu\home\<username>\.local\share\containers/storage/volumes/postgres_data/_data
```

或更簡單的理解方式：

```
Podman 命名 Volume: postgres_data
    ↓
實際位置（Linux 端 Ubuntu WSL）: /home/<username>/.local/share/containers/storage/volumes/postgres_data/_data
    ↓
Windows 訪問路徑: \\wsl.localhost\Ubuntu\home\<username>\.local\share\containers/storage/volumes/postgres_data/_data
```

---

## 📍 詳細分析

根據你的設置（使用 `podman-compose.yml`），讓我為你分解數據存儲位置：

### 你的 podman-compose.yml 配置
```yaml
volumes:
  postgres_data:
    driver: local
```

當你定義了這個 `postgres_data` 命名 volume 時，Podman 會：

1. **自動建立一個命名 Volume**
   - 名稱：`postgres_data`
   - 驅動類型：`local`（本地存儲）

2. **數據實際位置（在 Linux/WSL 上）**
   ```
   /home/<your_username>/.local/share/containers/storage/volumes/postgres_data/_data
   ```

3. **從 Windows 訪問**
   ```
   \\wsl.localhost\Ubuntu\home\<your_username>\.local\share\containers\storage\volumes\postgres_data\_data
   ```

---

## 🔍 查詢你的具體位置

### Step 1：查看 Volume 詳細信息

在 PowerShell 中執行：

```powershell
podman volume inspect postgres_data
```

✅ 你會看到類似的輸出：

```json
[
  {
    "Name": "postgres_data",
    "Driver": "local",
    "Mountpoint": "/home/yourname/.local/share/containers/storage/volumes/postgres_data/_data",
    "CreatedAt": "2025-04-28T00:00:00.000000000Z",
    "Labels": {},
    "Scope": "local",
    "Options": {},
    "MountCount": 1,
    "NeedsCopyUp": true,
    "NeedsChown": true,
    "LockNumber": 36
  }
]
```

**關鍵信息：**
- `"Name"`: `postgres_data` - 你的 Volume 名稱
- `"Mountpoint"`: `/home/yourname/.local/share/containers/storage/volumes/postgres_data/_data` - **這就是數據的實際位置！**
- `"Driver"`: `local` - 存儲在本地機器

### Step 2：確認 Container 使用的 Volume

執行以下命令查看你的 PostgreSQL 容器：

```powershell
podman inspect rss_postgres
```

在輸出中查找 `Mounts` 部分：

```json
"Mounts": [
  {
    "Type": "volume",
    "Name": "postgres_data",
    "Source": "/home/yourname/.local/share/containers/storage/volumes/postgres_data/_data",
    "Destination": "/var/lib/postgresql/data",
    "Driver": "local",
    "Mode": "z",
    "RW": true,
    "Propagation": ""
  }
]
```

**說明：**
- `"Source"`：**Windows 主機上的實際位置**
- `"Destination"`：容器內部位置（`/var/lib/postgresql/data`）
- 映射關係：`容器內 /var/lib/postgresql/data ← 連接到 → Windows 上的 postgres_data volume`

---

## 📁 詳細的存儲結構

你的數據存儲在下面這個結構中：

```
C:\Users\<YourUsername>\AppData\Local\
    └─ wsl\
        └─ instances\
            └─ Ubuntu\
                └─ rootfs\
                    └─ home\
                        └─ <username>\
                            └─ .local\
                                └─ share\
                                    └─ containers\
                                        └─ storage\
                                            └─ volumes\
                                                └─ postgres_data\  ← 你的 Volume
                                                    └─ _data\       ← 實際數據
                                                        ├─ PG_VERSION
                                                        ├─ base\
                                                        ├─ global\
                                                        ├─ pg_wal\
                                                        ├─ pg_xact\
                                                        └─ ... (PostgreSQL 文件)
```

---

## 🗂️ PostgreSQL 數據文件說明

在 `postgres_data/_data` 目錄中，你會看到：

| 文件/目錄 | 說明 |
|---------|------|
| `PG_VERSION` | PostgreSQL 版本號檔案 |
| `base/` | 數據庫文件目錄（包含你的 `rss_db`） |
| `global/` | 全局對象文件（用戶、角色等） |
| `pg_wal/` | 預寫日誌（Write-Ahead Logs）- 用於恢復 |
| `pg_xact/` | 事務提交日誌 |
| `pg_subtrans/` | 子事務日誌 |
| `pg_tblspc/` | 表空間符號連接 |
| `pg_twophase/` | 兩階段提交相關文件 |
| `postmaster.pid` | PostgreSQL 進程 ID 檔案 |
| `postgresql.conf` | PostgreSQL 配置檔案 |
| `pg_hba.conf` | 主機認證配置檔案 |

---

## 💾 存儲特性

### 🔒 數據持久化
- **容器停止但不刪除**：數據保留在 Volume 中 ✅
- **容器刪除**：數據仍保留在 Volume 中 ✅
- **只有明確刪除 Volume**：數據才會丟失

### 📦 Volume 的好處
```
✅ 容器和數據分離
✅ 容器重建時數據不丟失
✅ 多個容器可共享同一個 Volume
✅ 易於備份和恢復
✅ 性能優於 bind mount
```

---

## 🔐 Windows 訪問數據

### 方式 1：從 Windows 資源管理器訪問

1. 打開 **資源管理器**
2. 在地址欄輸入：
   ```
   \\wsl.localhost\Ubuntu\home\<username>\.local\share\containers\storage\volumes\postgres_data\_data
   ```
3. ✅ 可以看到 PostgreSQL 的所有數據文件

### 方式 2：從 Ubuntu WSL 訪問

在 WSL 終端中：

```bash
cd ~/.local/share/containers/storage/volumes/postgres_data/_data
ls -la
```

✅ 可以看到數據目錄的內容

### 方式 3：從容器內訪問

```powershell
# 進入容器
podman exec -it rss_postgres bash

# 查看數據位置
ls -la /var/lib/postgresql/data
```

---

## 📊 查詢特定數據庫

### 查看 rss_db 的具體位置

PostgreSQL 為每個數據庫分配一個對象識別碼 (OID)：

```powershell
# 進入 PostgreSQL
podman exec -it rss_postgres psql -U rss_user -d rss_db

# 在 PostgreSQL 提示符中執行
postgres=# SELECT datname, oid FROM pg_database WHERE datname = 'rss_db';
```

✅ 輸出類似：
```
 datname | oid
---------+-----
 rss_db  | 16386
```

**數據文件位置：**
```
.../postgres_data/_data/base/16386/

這個目錄下存儲了：
- rss_db 數據庫中所有表的實際數據
- 索引文件
- 統計信息等
```

---

## 🔄 備份和恢復

### 備份整個 Volume

```powershell
# 使用 podman cp 複製數據
podman cp rss_postgres:/var/lib/postgresql/data C:\Users\<YourUsername>\Desktop\postgresql_backup\

# 或壓縮備份
podman run --rm -v postgres_data:/data -v C:\backup:/backup busybox tar czf /backup/postgres_backup.tar.gz -C /data .
```

### 通過 SQL 備份特定數據庫

```powershell
# 進入容器並使用 pg_dump
podman exec rss_postgres pg_dump -U rss_user -d rss_db > C:\Users\<YourUsername>\Desktop\rss_db_backup.sql
```

### 恢復數據庫

```powershell
# 從 SQL 備份恢復
cat C:\Users\<YourUsername>\Desktop\rss_db_backup.sql | podman exec -i rss_postgres psql -U rss_user -d rss_db
```

---

## 🚀 改變數據存儲位置（高級）

如果你想改變數據存儲位置（例如使用外部硬碟），可以：

### 方式 1：使用 Bind Mount（推薦開發環境）

編輯 `podman-compose.yml`：

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    volumes:
      # 改為 Bind Mount - 指向 Windows 路徑
      - C:\Users\<YourUsername>\PostgreSQL_Data:/var/lib/postgresql/data:Z
    # ... 其他配置
```

### 方式 2：使用外部驅動器

```yaml
volumes:
  - E:\Database_Storage:/var/lib/postgresql/data:Z
```

**重要提示：**
- 改變 Volume 映射前，先備份現有數據！
- 新的位置需要有足夠的空間
- 確保路徑有正確的權限

---

## ⚠️ 常見問題

### Q1：我能從 Windows 直接編輯數據文件嗎？
**A：** 不推薦！PostgreSQL 數據文件是二進制格式，需要 PostgreSQL 進程管理。直接編輯會破壞數據庫。使用 SQL 工具（DBeaver、psql）進行所有修改。

### Q2：Volume 佔用多少磁碟空間？
**A：** 執行以下命令查看：
```powershell
podman system df
```

### Q3：能否將 Volume 從一台機器移到另一台機器？
**A：** 可以！備份整個 `postgres_data/_data` 目錄並複製到新機器的 Volume 位置。

### Q4：如何清理 Volume？
**A：** 
```powershell
# 查看所有 Volume
podman volume ls

# 刪除特定 Volume（會丟失數據！）
podman volume rm postgres_data

# 清理未使用的 Volume
podman volume prune
```

### Q5：如何確保數據不會丟失？
**A：**
1. 定期備份（使用 `pg_dump` 或複製 volume）
2. 使用 named volumes（你已經用了）
3. 在外部存儲（USB、雲端）保存備份副本

---

## 📚 總結

| 項目 | 說明 |
|------|------|
| **Volume 名稱** | `postgres_data` |
| **數據位置（Linux）** | `/home/<username>/.local/share/containers/storage/volumes/postgres_data/_data` |
| **Windows 訪問路徑** | `\\wsl.localhost\Ubuntu\home\<username>\.local\share\containers\storage\volumes\postgres_data\_data` |
| **容器內路徑** | `/var/lib/postgresql/data` |
| **數據庫位置** | `postgres_data/_data/base/<OID>/` |
| **持久化** | ✅ 容器停止時數據保留 |
| **備份方式** | pg_dump 或複製 volume 目錄 |
| **存儲驅動** | `local`（本地儲存） |

---

## 🎯 快速查詢命令

```powershell
# 查看 Volume 詳細信息
podman volume inspect postgres_data

# 進入 PostgreSQL 容器
podman exec -it rss_postgres bash

# 查看 rss_db 數據庫 OID
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "SELECT datname, oid FROM pg_database WHERE datname = 'rss_db';"

# 查看 Volume 大小
podman run --rm -v postgres_data:/data busybox du -sh /data

# 列出所有 Volume
podman volume ls

# 從 Windows 備份
podman cp rss_postgres:/var/lib/postgresql/data C:\backup\
```

你的所有 RSS 數據都安全地存儲在這個位置，只要 Volume 存在，數據就不會丟失！

