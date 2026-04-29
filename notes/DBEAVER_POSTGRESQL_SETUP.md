# 📊 DBeaver Community + PostgreSQL 完整設置指南

## 🎯 DBeaver 為什麼值得試試

相比 SQuirreL SQL Client：
- ✅ **無需手動下載 JDBC 驅動**（已內置）
- ✅ **更現代的用戶界面**
- ✅ **更強大的功能**（ER 圖、數據導入導出、schema 對比等）
- ✅ **更易於使用**（幾乎 0 配置）
- ✅ **完全免費開源**

---

## 📥 Step 1：下載和安裝 DBeaver Community

### 1.1 訪問官網
訪問：**https://dbeaver.io/download/**

### 1.2 選擇你的平台
選擇 **Windows** 版本（頁面會自動偵測）

### 1.3 下載
點擊 **Download** 按鈕
- 檔案大小：約 200-300 MB
- 檔名：`dbeaver-ce-x.x.x-setup.exe`（Community Edition）

### 1.4 安裝
1. 雙擊下載的 `.exe` 檔案
2. 點擊 **Next** 接受預設選項
3. 選擇安裝位置（預設即可）
4. 如果彈出 UAC 提示，點擊 **是**
5. 等待安裝完成（約 1-2 分鐘）
6. 點擊 **Finish**

✅ **DBeaver 已安裝！**

---

## 🔌 Step 2：建立 PostgreSQL 連接

### 2.1 打開 DBeaver

第一次啟動時，DBeaver 會顯示歡迎頁面。

### 2.2 建立新連接

有三種方式：

**方式 A：使用菜單**
1. 點擊頂部菜單 **Database** → **New Database Connection**

**方式 B：使用快捷鍵**
1. 按 **Ctrl + Alt + Shift + N**

**方式 C：使用圖形界面**
1. 在左側 **Database Navigator** 面板
2. 右鍵點擊空白區域
3. 選擇 **New** → **Database Connection**

### 2.3 選擇 PostgreSQL 驅動

1. 會彈出一個驅動選擇對話框
2. 在搜尋框輸入：**postgres**
3. 選擇 **PostgreSQL**
4. 點擊 **Next**

✅ DBeaver 會自動檢查 PostgreSQL 驅動是否已安裝

---

## ⚙️ Step 3：填入連接詳細信息

### 3.1 連接設置頁面

填入以下信息（根據你的 podman-compose.yml）：

```
Server Host:    localhost
Port:           5432
Database:       rss_db
Username:       rss_user
Password:       rss_password
```

**詳細說明：**

| 欄位 | 值 | 說明 |
|------|-----|------|
| **Server Host** | `localhost` | 本地主機 |
| **Port** | `5432` | PostgreSQL 默認端口 |
| **Database** | `rss_db` | 數據庫名稱 |
| **Username** | `rss_user` | 用戶名 |
| **Password** | `rss_password` | 用戶密碼 |
| **Save password locally** | ✅ 勾選 | 下次免輸入密碼 |

### 3.2 完整截圖參考

```
┌─ Database Connection Settings ─────────────────┐
│                                                 │
│ Connection name: LocalPostgres               │
│                                                 │
│ Server Host:      localhost                   │
│ Port:             5432                        │
│ Database:         rss_db                      │
│ Username:         rss_user                    │
│ Password:         ••••••••••                 │
│ ☑ Save password locally                      │
│                                                 │
│         [Test Connection]  [Next]              │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Step 4：測試連接

### 4.1 點擊 "Test Connection" 按鈕

頁面下方會顯示測試結果：

✅ **成功**
```
[✓] Connected successfully
    PostgreSQL 17.0 (localhost)
```

❌ **失敗** - 常見原因
```
[✗] Unable to connect
    Could not connect to localhost:5432
```

如果連接失敗，檢查：
1. PostgreSQL 容器是否運行
   ```powershell
   podman ps
   ```
   應該看到 `rss_postgres` 容器運行中

2. 確認憑證正確
   - 用戶名：`rss_user`
   - 密碼：`rss_password`
   - 數據庫：`rss_db`

3. 確認端口 5432 未被占用

### 4.2 如果連接成功

✅ 頁面會顯示綠色的成功訊息

點擊 **Finish** 完成設置

---

## 🎨 Step 5：DBeaver 主介面操作

### 5.1 連接已建立

左側 **Database Navigator** 會出現你的連接：
```
📁 LocalPostgres (PostgreSQL 17)
  ├── rss_db
  │   ├── 📁 Schemas
  │   │   ├── public
  │   │   │   ├── Tables
  │   │   │   │   ├── 📊 tracked_entities
  │   │   │   │   ├── 📊 daily_digests
  │   │   │   │   └── ... (其他表)
  │   │   │   ├── Views
  │   │   │   └── Functions
  │   └── System Objects
```

### 5.2 查看表數據

1. **展開左側導航樹**
   - 雙擊連接名稱，或點擊箭頭展開
   - 找到你的表（例如 `tracked_entities`）

2. **查看表內容**
   - 雙擊表名
   - 或右鍵 → **View Data**
   - 右側會顯示表的所有數據

### 5.3 查看表結構

1. 右鍵點擊表名
2. 選擇 **View Properties** 或 **Edit**
3. 可以看到所有欄位、類型、索引等信息

### 5.4 執行 SQL 查詢

#### 方式 1：新建 SQL 腳本
1. 點擊菜單 **File** → **New** → **SQL Script**
2. 或按 **Ctrl + Alt + N**
3. 在編輯器中輸入 SQL 查詢

#### 方式 2：直接在連接上執行
1. 右鍵點擊連接名
2. 選擇 **SQL Editor** → **New SQL Script**

#### 方式 3：直接在表上執行查詢
1. 右鍵點擊表
2. 選擇 **SQL** → **SELECT**
3. DBeaver 會自動生成 SELECT 語句

#### 執行查詢
```sql
-- 查看所有數據
SELECT * FROM tracked_entities LIMIT 10;

-- 查看表結構
\d tracked_entities

-- 查看 pgvector 擴展
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 複雜查詢（embedding 相似度搜尋）
SELECT id, title, embedding <-> '[0.1, 0.2, 0.3]'::vector AS distance
FROM tracked_entities
ORDER BY distance
LIMIT 5;
```

1. 輸入查詢後，按 **Ctrl + Enter** 執行
2. 或點擊工具欄的 **Execute** 按鈕（綠色播放鍵）
3. 結果會在下面的 **Results** 標籤顯示

---

## 💡 DBeaver 的超強功能

### 📊 生成 ER 圖

1. 右鍵點擊 **Schema** 或 **Database**
2. 選擇 **Generate ER Diagram**
3. DBeaver 會自動繪製你的數據庫結構圖

### 📥 數據導出

1. 執行查詢後，在 **Results** 面板
2. 右鍵點擊結果表格
3. 選擇 **Export Data**
4. 選擇格式：CSV、Excel、JSON、XML 等

### 📤 數據導入

1. 右鍵點擊表
2. 選擇 **Import Data**
3. 選擇源檔案（CSV、JSON 等）
4. DBeaver 會協助你導入數據

### 🔍 Schema 對比

1. 連接多個 PostgreSQL 實例
2. 右鍵點擊其中一個 Schema
3. 選擇 **Compare** → **Compare With**
4. DBeaver 會顯示兩個 schema 的差異

### 📋 複製表結構

1. 右鍵點擊表
2. 選擇 **Copy DDL**
3. 可以複製該表的創建語句

### 🔐 權限和角色管理

1. 展開 **Security** 節點
2. 可以查看和編輯用戶、角色、權限等

---

## 🎯 常見操作快速參考

### 查看數據
```
步驟：左側樹 → 展開表 → 雙擊表名 → 在右側看到數據
```

### 執行 SQL 查詢
```
步驟：Ctrl + Alt + N → 輸入 SQL → Ctrl + Enter
```

### 修改數據
```
步驟：在結果表格直接點擊單元格 → 編輯 → 按 Enter 保存
```

### 查看表結構
```
步驟：右鍵表 → Properties / Edit
```

### 導出結果
```
步驟：執行查詢 → 結果右鍵 → Export Data → 選擇格式
```

### 新建表
```
步驟：右鍵 Tables → Create New Table → 填寫結構
```

### 刪除表
```
步驟：右鍵表 → Delete → 確認
```

---

## 🌙 DBeaver 設置和自定義

### 深色模式
1. 點擊菜單 **Window** → **Preferences**
2. 搜尋 **Appearance**
3. 選擇 **Dark** 主題

### 字體大小
1. **Preferences** → **General** → **Appearance** → **Colors and Fonts**
2. 調整 **Text Font** 大小

### 自動連接
1. **Preferences** → **Database** → **General**
2. 勾選 **Auto-connect to default database**
3. 下次啟動 DBeaver 會自動連接

### 格式化 SQL
1. 編輯器中選擇 SQL 代碼
2. 按 **Ctrl + Shift + F**
3. DBeaver 會自動格式化你的 SQL

---

## ✨ 與 SQuirreL 的對比

| 特性 | DBeaver | SQuirreL |
|------|---------|----------|
| **安裝複雜度** | ⭐ 非常簡單 | ⭐⭐⭐ 需要下載 JDBC |
| **UI 現代度** | ⭐⭐⭐⭐⭐ 很現代 | ⭐⭐⭐ 較老舊 |
| **內置功能** | ⭐⭐⭐⭐⭐ 豐富 | ⭐⭐⭐ 基本 |
| **ER 圖生成** | ✅ 自動生成 | ❌ 無 |
| **數據導入導出** | ✅ 多格式支持 | ⚠️ 基本支持 |
| **多數據庫支持** | ✅ 50+ 個數據庫 | ✅ 多個數據庫 |
| **學習曲線** | ⭐ 很陡峭 | ⭐⭐ 中等 |
| **記憶體使用** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 輕量 |

---

## 🚀 DBeaver vs SQuirreL 如何選擇

### **選 DBeaver 如果你：**
- 想要更現代的界面
- 需要 ER 圖和高級功能
- 只想花 5 分鐘設置
- 不介意多點資源使用
- 未來可能用多個數據庫

### **選 SQuirreL 如果你：**
- 習慣 SQuirreL 的操作
- 想要輕量級的工具
- 只需要基本的 SQL 查詢功能
- 資源受限（記憶體有限）

**建議：試試 DBeaver，如果喜歡就用它；不喜歡再回到 SQuirreL。**

---

## 🆘 常見問題

### Q1：安裝後無法找到 PostgreSQL 驅動

**A：** DBeaver 在第一次使用時會自動下載 PostgreSQL 驅動。
- 確保有網路連接
- 等待 1-2 分鐘讓 DBeaver 下載驅動

### Q2：連接測試失敗

**A：** 檢查以下幾點：
1. PostgreSQL 容器是否運行
   ```powershell
   podman ps
   ```
2. 用戶名和密碼是否正確
3. 端口是否正確（默認 5432）
4. 檢查 DBeaver 日誌
   - **Help** → **Show Log**

### Q3：DBeaver 運行很慢

**A：** 可能是因為：
1. 首次加載 schema 比較慢（尤其是大數據庫）
2. 記憶體不足
3. 網路連接慢

**解決方案：**
- 等待首次加載完成
- 增加 DBeaver 的記憶體分配
  - 編輯 `dbeaver.ini`（在安裝目錄）
  - 修改 `-Xmx` 值（例如 `-Xmx2048m`）

### Q4：如何編輯表數據

**A：** 
1. 雙擊表名查看數據
2. 在結果表格中直接點擊單元格編輯
3. 修改後按 **Enter** 保存
4. 或右鍵 → **Edit Row** 進行行級編輯

### Q5：如何備份數據庫

**A：**
1. 右鍵點擊 Database
2. **Backup / Restore** → **Backup**
3. 選擇備份位置
4. DBeaver 會使用 `pg_dump` 進行備份

---

## 💾 有用的快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| **Ctrl + Alt + Shift + N** | 新建數據庫連接 |
| **Ctrl + Alt + N** | 新建 SQL 腳本 |
| **Ctrl + Enter** | 執行 SQL 查詢 |
| **Ctrl + Shift + F** | 格式化 SQL |
| **Ctrl + /**  | SQL 注釋/取消注釋 |
| **Ctrl + Space** | 自動完成 |
| **F5** | 刷新 |
| **F2** | 重命名 |
| **Delete** | 刪除 |

---

## 📚 下一步

### 推薦閱讀
- [DBeaver 官方文檔](https://dbeaver.com/docs/dbeaver/)
- [DBeaver 用戶論壇](https://github.com/dbeaver/dbeaver/discussions)

### 常用操作練習
1. 查看你的 `tracked_entities` 表
2. 執行一個 SELECT 查詢
3. 生成 ER 圖
4. 導出一些數據為 CSV
5. 嘗試修改表數據

---

## 🎉 總結

**DBeaver Community 優勢：**
✅ 無需配置 JDBC 驅動（自動）
✅ 現代漂亮的界面
✅ 功能豐富（ER 圖、導入導出等）
✅ 完全免費開源
✅ 設置時間：**5 分鐘**

**立即開始：**
1. 下載 DBeaver Community（https://dbeaver.io/download/）
2. 安裝（點擊 Next）
3. 新建 PostgreSQL 連接
4. 填入你的連接信息
5. 點擊 Test 和 Finish

享受更好的數據庫管理體驗！

