# 🚀 Windows Podman + PostgreSQL + pgvector 完整資源包

## 📚 你現在擁有的所有資源

### 📖 主要文檔

1. **WINDOWS_PODMAN_SETUP.md** ⭐ 從這裡開始
   - 8 個詳細步驟
   - 完整的圖形說明
   - 常見問題排除

2. **WINDOWS_PODMAN_CHECKLIST.md** ⭐ 邊做邊勾選
   - 逐步驗證清單
   - 每步都有檢查點
   - 幫助你確認沒有遺漏

3. **WINDOWS_PODMAN_QUICK_REFERENCE.md** 🔍 快速查閱
   - 命令速查表
   - SQL 範例
   - Python 連接代碼

4. **PODMAN_VS_DOCKER.md** 💡 背景知識
   - 為什麼選擇 Podman
   - 成本對比
   - 性能分析

---

## 🎯 快速開始流程（5 分鐘總覽）

### 整個安裝分為 3 個主要階段

#### 階段 1：基礎設施（5 分鐘）
```
Step 1: 啟用 WSL2          → 一個命令 + 重啟
Step 2: 安裝 Podman        → 下載 + 點擊安裝
Step 3: 驗證安裝           → 驗證命令
```
**完成後：你有 Linux 容器環境**

#### 階段 2：數據庫設置（15 分鐘）
```
Step 4: 建立目錄結構      → 檔案總管操作
Step 5: 建立 compose 檔    → 複製 YAML 內容
Step 6: 啟動容器          → 一個命令
Step 7: 啟用 pgvector     → SQL 命令
```
**完成後：你有本地 PostgreSQL + pgvector**

#### 階段 3：應用連接（5 分鐘）
```
Step 8: Next.js 配置      → .env 和兩個檔案
Step 9: Python 配置       → 安裝驅動 + 測試連接
```
**完成後：應用完全就位！**

---

## 📖 建議閱讀順序

### 首次安裝：
1. **先讀這個** → WINDOWS_PODMAN_SETUP.md（完整指南）
2. **邊做邊對照** → WINDOWS_PODMAN_CHECKLIST.md（驗證清單）
3. **遇到問題時** → WINDOWS_PODMAN_QUICK_REFERENCE.md（快速查詢）
4. **（可選）瞭解背景** → PODMAN_VS_DOCKER.md（為什麼選擇 Podman）

### 之後日常使用：
- **只需要** WINDOWS_PODMAN_QUICK_REFERENCE.md
- 常用命令都在那裡
- 書籤保存以便隨時查看

---

## ⚡ 最短路徑（完全新手）

### 如果你時間緊張，只需 30 分鐘：

```
第 1 分鐘：  閱讀本文件
第 2 分鐘：  快速讀一遍 WINDOWS_PODMAN_QUICK_REFERENCE.md
第 3-5 分鐘：  開始 WSL2 安裝（邊看 WINDOWS_PODMAN_SETUP.md 的 Step 1）
  ↓
  （10 分鐘等待安裝...）
  ↓
第 15 分鐘： 安裝 Podman Desktop
第 20 分鐘： 建立檔案和啟動容器
第 25 分鐘： 驗證一切工作正常
```

**30 分鐘後，你有完整的 PostgreSQL + pgvector 本地開發環境！**

---

## 🔑 核心概念速懂

### 你將安裝什麼？

```
Your Windows 11 Machine
    ↓
WSL2（免費，Windows 內置）
    ↓ 虛擬 Linux 環境
Podman（免費，開源）
    ↓ 容器管理
PostgreSQL 17 + pgvector
    ↓ 你的本地數據庫
Your Next.js App + Python Worker
    ↓ 連接並使用
```

### 簡單來說：
- **WSL2** = 在 Windows 上運行 Linux（微軟產品，免費）
- **Podman** = Linux 上的容器管理工具（Red Hat，開源）
- **PostgreSQL** = 數據庫（開源）
- **pgvector** = PostgreSQL 擴展，支援 embeddings（開源）

**全部免費，全部開源！**

---

## 💾 檔案清單

在 `C:\dev\rss-reader\docker\` 目錄中，你只需要：

```
docker/
└── podman-compose.yml    ← 唯一需要建立的檔案
```

YAML 內容已包含在所有指南中。

---

## 🔗 外部連結（可後續查詢）

### 官方網站
- **Podman**: https://podman.io/
- **Podman Desktop**: https://podman-desktop.io/
- **PostgreSQL**: https://www.postgresql.org/
- **pgvector**: https://github.com/pgvector/pgvector
- **WSL2**: https://docs.microsoft.com/windows/wsl/

### 文檔
- **Drizzle ORM**: https://orm.drizzle.team/
- **Next.js**: https://nextjs.org/docs
- **psycopg2**: https://www.psycopg.org/

---

## ✅ 預期成果

### 安裝完成後，你將擁有：

1. **本地開發環境**
   - PostgreSQL 17 數據庫
   - pgvector 向量搜尋支援
   - 持久化存儲（重啟後數據不丟失）

2. **零成本**
   - 完全免費（無商業授權費用）
   - 無隱藏費用
   - 全部開源

3. **完全相容**
   - 與生產環境相同的 PostgreSQL
   - 與 Neon 相同的 pgvector
   - 輕鬆遷移到雲端

4. **即用的工具**
   - 命令行訪問（psql）
   - Python 連接器
   - Next.js 集成

---

## 🎯 常見問題快速解答

### Q: 安裝需要多長時間？
**A:** 20-30 分鐘（取決於網速）

### Q: 需要多少磁碟空間？
**A:** 約 1-2 GB（PostgreSQL 映像 ~500MB + 初始數據 ~10MB）

### Q: 需要多少記憶體？
**A:** 
- WSL2 預設：最多 50% 的 Windows 記憶體
- PostgreSQL 容器：通常 200-400 MB
- 可調整（見 WINDOWS_PODMAN_SETUP.md 的優化部分）

### Q: Podman 和 Docker 能混用嗎？
**A:** 可以，但不推薦。建議選一個用。由於你不能用 Docker Desktop，Podman 是唯一選擇。

### Q: 可以直接用 Neon 而不是本地數據庫嗎？
**A:** 可以，但本地開發更快，無延遲。推薦用本地 + 備份到 Neon。

### Q: 如果我之前用過 Docker，會不會很難？
**A:** 不會！命令完全相同。只需改 `docker` → `podman` 和 `docker-compose` → `podman-compose`。

---

## 🚨 重要注意事項

### ⚠️ 安裝前
- [ ] 關閉所有正在運行的容器應用
- [ ] 確保有管理員權限
- [ ] 備份重要數據（不是必需，但安全起見）
- [ ] 確保有網路連接

### ✅ 安裝後
- [ ] 定期備份 PostgreSQL 數據
- [ ] 保留 podman-compose.yml（重啟容器時需要）
- [ ] 監控磁碟使用量
- [ ] 定期更新 Podman Desktop（Settings → Check for updates）

---

## 📞 需要幫助？

### 如果遇到問題，按以下順序：

1. **查詢快速參考**
   - 90% 的問題在 WINDOWS_PODMAN_QUICK_REFERENCE.md 中有答案

2. **檢查日誌**
   ```powershell
   podman logs rss_postgres
   ```

3. **重新啟動容器**
   ```powershell
   podman-compose restart
   ```

4. **清空並重新開始**
   ```powershell
   podman-compose down -v
   podman-compose up -d
   ```

---

## 🎓 建議進階步驟（安裝完成後）

### 優化性能
- [ ] 建立 pgvector 索引（見快速參考中的 SQL 範例）
- [ ] 配置自動備份
- [ ] 調整 WSL2 記憶體設定

### 實踐
- [ ] 在 Next.js 中測試 embedding 查詢
- [ ] 用 Python 生成並插入 embeddings
- [ ] 建立監控和日誌

### 擴展
- [ ] 添加 pgAdmin（PostgreSQL Web UI）
- [ ] 集成 Prisma（另一個 ORM，支援更多功能）
- [ ] 設置自動化備份到雲端

---

## 🎉 你已準備好！

你現在擁有：
- ✅ 詳細的步驟指南
- ✅ 快速參考卡片
- ✅ 驗證清單
- ✅ 故障排除指南
- ✅ 背景知識文件

**沒有理由不開始！**

---

## 🗺️ 文件導航地圖

```
你在這裡 ← 總覽和開始指南
    ↓
    ├─→ WINDOWS_PODMAN_SETUP.md
    │   └─ 第一次詳細閱讀
    │
    ├─→ WINDOWS_PODMAN_CHECKLIST.md
    │   └─ 邊做邊對照
    │
    ├─→ WINDOWS_PODMAN_QUICK_REFERENCE.md
    │   └─ 命令和代碼參考
    │
    └─→ PODMAN_VS_DOCKER.md
        └─ 背景和原理
```

---

## 📝 最後的建議

### 保存這些文件
- 創建書籤：`C:\dev\rss-reader\docker\SETUP_GUIDES\`
- 離線訪問（本地副本）
- 分享給團隊成員（如果有）

### 記住主要命令
```powershell
podman ps                    # 查看容器
podman logs rss_postgres     # 查看日誌
podman exec -it rss_postgres psql -U rss_user -d rss_db  # 進入 DB
podman-compose down          # 停止
podman-compose up -d         # 啟動
```

### 建立快捷方式
在 PowerShell 配置文件中添加別名：
```powershell
Set-Alias pc podman-compose
Set-Alias pex podman exec
```

然後可以用 `pc up -d` 替代 `podman-compose up -d`

---

**準備好了嗎？打開 WINDOWS_PODMAN_SETUP.md，開始你的 Podman 之旅吧！** 🚀

