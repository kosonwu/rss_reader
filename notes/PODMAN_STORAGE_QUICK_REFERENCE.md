# ⚡ Podman PostgreSQL 數據存儲位置 - 快速參考

## 🎯 一句話答案

你的 `rss_db` 數據存儲在：
```
~/.local/share/containers/storage/volumes/postgres_data/_data
```

或從 Windows 訪問：
```
\\wsl.localhost\Ubuntu\home\<username>\.local\share\containers\storage\volumes\postgres_data\_data
```

---

## 🔍 查詢命令

### 查看 Volume 位置
```powershell
podman volume inspect postgres_data
```

你會看到：
```json
"Mountpoint": "/home/username/.local/share/containers/storage/volumes/postgres_data/_data"
```

### 查看容器 Mount 信息
```powershell
podman inspect rss_postgres | findstr -A 10 "Mounts"
```

---

## 📁 存儲結構

```
postgres_data Volume（命名 Volume）
    ↓
.local/share/containers/storage/volumes/postgres_data/_data/
    ├─ PG_VERSION           ← PostgreSQL 版本
    ├─ base/                ← 數據庫目錄
    │   ├─ 16386/           ← rss_db 數據庫（OID=16386）
    │   │   ├─ 其他表文件...
    │   │   └─ tracked_entities（表數據）
    │   └─ ... 其他數據庫
    ├─ global/              ← 全局對象
    ├─ pg_wal/              ← 預寫日誌
    └─ ... 其他 PostgreSQL 系統文件
```

---

## 💡 關鍵信息

| 項目 | 值 |
|------|-----|
| Volume 名稱 | `postgres_data` |
| Volume 驅動 | `local` |
| 數據位置 | `/home/<user>/.local/share/containers/storage/volumes/postgres_data/_data` |
| Windows 路徑 | `\\wsl.localhost\Ubuntu\home\<user>\.local\share\containers\storage\volumes\postgres_data\_data` |
| 容器內路徑 | `/var/lib/postgresql/data` |
| 數據持久化 | ✅ 容器停止時保留 |

---

## 🎯 實用操作

### 進入 PostgreSQL 查詢數據庫 OID
```powershell
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "SELECT datname, oid FROM pg_database WHERE datname = 'rss_db';"
```

### 從 Windows 複製備份
```powershell
podman cp rss_postgres:/var/lib/postgresql/data C:\backup\
```

### 查看 Volume 大小
```powershell
podman run --rm -v postgres_data:/data busybox du -sh /data
```

### 列出所有 Volume
```powershell
podman volume ls
```

### 查看 PostgreSQL 數據文件詳情
```powershell
podman exec rss_postgres ls -lah /var/lib/postgresql/data
```

---

## 📊 數據文件目錄

一旦你知道 `rss_db` 的 OID（例如 16386），數據文件在：
```
postgres_data/_data/base/16386/

包含：
- 表數據文件
- 索引文件
- 統計信息
```

---

## 🔄 備份和恢復

### 快速備份整個 Volume
```powershell
podman run --rm -v postgres_data:/data -v C:\backup:/backup busybox tar czf /backup/postgres_backup.tar.gz -C /data .
```

### 備份特定數據庫
```powershell
podman exec rss_postgres pg_dump -U rss_user -d rss_db > C:\backup\rss_db_backup.sql
```

### 恢復數據庫
```powershell
cat C:\backup\rss_db_backup.sql | podman exec -i rss_postgres psql -U rss_user -d rss_db
```

---

## ⚠️ 重要事項

- ✅ 數據存儲在命名 Volume，容器刪除後數據仍保留
- ✅ 不要直接編輯 PostgreSQL 數據文件
- ✅ 定期備份數據
- ✅ Volume 可以從 Windows 訪問，但不要直接修改
- ❌ 不要直接刪除 `postgres_data` 文件夾（會丟失數據）

---

## 🎯 三種訪問方式

### 1. 通過 SQL 工具（推薦）
```
DBeaver / SQuirreL / psql
    ↓
連接到 localhost:5432
    ↓
執行 SQL 查詢
```

### 2. 通過 Podman 命令
```
podman exec -it rss_postgres bash
    ↓
查看 /var/lib/postgresql/data
```

### 3. 直接文件訪問（謹慎）
```
\\wsl.localhost\Ubuntu\home\<user>\.local\share\containers\storage\volumes\postgres_data\_data
    ↓
查看原始文件（不要編輯！）
```

---

## 💾 快速檢查清單

- [ ] 我知道數據存儲在 `postgres_data` volume
- [ ] 我可以用 `podman volume inspect postgres_data` 查詢位置
- [ ] 我知道容器內路徑是 `/var/lib/postgresql/data`
- [ ] 我可以從 Windows 訪問數據（但不會編輯）
- [ ] 我知道容器停止時數據保留在 volume
- [ ] 我已經備份過我的數據（或知道如何備份）

---

## 📞 快速命令速查

```powershell
# 查詢 volume
podman volume inspect postgres_data

# 進入容器
podman exec -it rss_postgres bash

# 查看數據位置和大小
podman exec rss_postgres du -sh /var/lib/postgresql/data

# 查詢數據庫 OID
podman exec -it rss_postgres psql -U rss_user -d rss_db -c "SELECT datname, oid FROM pg_database WHERE datname = 'rss_db';"

# 列出所有 volume
podman volume ls

# 查詢 volume 詳細信息
podman volume inspect postgres_data --format='{{.Mountpoint}}'
```

---

**你的所有 RSS 數據安全地儲存在這個 Podman volume 中！**

