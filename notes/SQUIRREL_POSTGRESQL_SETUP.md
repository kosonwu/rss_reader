# 📊 SQuirreL SQL Client + PostgreSQL 連接指南和工具推薦

## ✅ 好消息！SQuirreL SQL Client 完全可以連接你的 PostgreSQL！

SQuirreL SQL Client 是一個開源、跨平台的 SQL 查詢工具，完全支持 PostgreSQL。你可以繼續使用你習慣的工具。

---

## 📝 SQuirreL SQL Client 連接 PostgreSQL 步驟

### 前置要求
- SQuirreL SQL Client 已安裝
- Java 7 或更新版本
- PostgreSQL JDBC 驅動程式

### Step 1：下載 PostgreSQL JDBC 驅動

PostgreSQL JDBC 驅動需要單獨下載，可以從 https://jdbc.postgresql.org/download.html 取得，推薦使用版本 42.x 或更新版本。

#### 步驟：
1. 訪問：https://jdbc.postgresql.org/download.html
2. 下載最新的 JDBC 42 版本（例如：`postgresql-42.7.x.jar`）
3. **記住下載位置**（你需要在 SQuirreL 中指定它）

---

### Step 2：在 SQuirreL 中配置 PostgreSQL 驅動

#### 2.1 打開 SQuirreL SQL Client

#### 2.2 進入 Drivers 設置
1. 點擊菜單 **Windows** → **View Drivers**
2. 左側窗格會顯示所有已安裝的驅動
3. 查看 **PostgreSQL** 驅動是否存在

#### 2.3 如果 PostgreSQL 驅動前面有紅色 ❌ 符號

說明驅動未正確配置，需要添加 JAR 檔案：

1. **右鍵點擊** PostgreSQL 驅動
2. 選擇 **Modify Driver**
3. 在打開的窗口中，點擊 **Extra Class Path** 標籤
4. 點擊 **Add** 按鈕
5. **選擇你下載的 JDBC JAR 檔案**（例如：`postgresql-42.7.x.jar`）
6. 點擊 **List Drivers** 按鈕，應該會自動填充 **Class Name**
   - 應該顯示：`org.postgresql.Driver`
7. 點擊 **OK** 保存

✅ **PostgreSQL 驅動前面應該現在是綠色 ✓ 符號**

---

### Step 3：建立 PostgreSQL 連接別名

#### 3.1 進入 Aliases 設置
1. 點擊菜單 **Windows** → **View Aliases**
2. 或直接點擊左側的 **Aliases** 標籤

#### 3.2 創建新連接
1. 右鍵點擊 Aliases 面板
2. 選擇 **Create Alias** 或點擊 **+** 按鈕
3. 在打開的對話框中填入以下信息：

```
Alias Name:        LocalPostgres       (或任何描述性名稱)
Driver:            PostgreSQL          (從下拉菜單選擇)
URL:               jdbc:postgresql://localhost:5432/rss_db
User name:         rss_user
Password:          rss_password
```

**詳細說明：**
- **Alias Name**：連接的名稱（你可以自己定義，如 `LocalPostgres`）
- **Driver**：選擇 **PostgreSQL**
- **URL**：`jdbc:postgresql://localhost:5432/rss_db`
  - `localhost`：本地主機
  - `5432`：PostgreSQL 默認端口
  - `rss_db`：你的數據庫名稱（來自 podman-compose.yml）
- **User name**：`rss_user`（來自 podman-compose.yml）
- **Password**：`rss_password`（來自 podman-compose.yml）

#### 3.3 測試連接
1. 點擊 **Test** 按鈕
2. ✅ 應該看到 **"Connection successful"** 或類似的成功訊息

#### 3.4 保存連接
1. 點擊 **OK** 保存這個連接別名

---

### Step 4：連接到數據庫

1. 在 **Aliases** 面板中找到剛剛建立的連接（例如 `LocalPostgres`）
2. **雙擊** 或右鍵選擇 **Connect**
3. ✅ 應該建立連接，左側會顯示數據庫結構

---

### Step 5：使用 SQuirreL 查詢

1. 連接成功後，點擊菜單 **File** → **New SQL Script**
2. 或點擊 **SQL** 標籤
3. 在編輯器中輸入 SQL 查詢，例如：

```sql
-- 查看所有表
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

-- 查看 tracked_entities 表
SELECT * FROM tracked_entities LIMIT 10;

-- 查看 pgvector 擴展
SELECT extname FROM pg_extension WHERE extname = 'vector';
```

4. 點擊 **Execute** 或按 **Ctrl + Enter** 執行
5. 結果會在下面的面板顯示

---

## 📚 推薦的其他免費開源 PostgreSQL GUI 工具

如果你想試試其他工具，這是我的推薦列表：

### 🥇 **Top 1：DBeaver Community（推薦 ⭐⭐⭐⭐⭐）**

**為什麼推薦：**
- DBeaver 是一個受歡迎的數據庫 GUI，具有廣泛的數據庫支持和強大的功能集
- 完全免費的社區版
- 支持 PostgreSQL 和其他 50+ 個數據庫
- 功能豐富：SQL 編輯、數據編輯、ER 圖、數據導入導出等
- 跨平台（Windows、Mac、Linux）

**缺點：**
- Java 應用，有時感覺有點慢
- UI 較為複雜

**下載：** https://dbeaver.io/download/

---

### 🥈 **Top 2：pgAdmin 4（開源官方工具 ⭐⭐⭐⭐）**

**為什麼推薦：**
- PostgreSQL 官方推薦工具
- 完全免費且開源
- pgAdmin 設計專為 PostgreSQL，如果你只需要管理 PostgreSQL 則非常適合
- 可作為桌面應用或網頁版本
- 強大的 PostgreSQL 特定功能

**缺點：**
- 只支持 PostgreSQL（不支持其他數據庫）
- Web 界面可能比較繁瑣

**下載：** https://www.pgadmin.org/

---

### 🥉 **Top 3：HeidiSQL（Windows 專用 ⭐⭐⭐⭐）**

**為什麼推薦：**
- HeidiSQL 是一個受尊重的、成熟的 GUI，用於管理 MySQL、MariaDB、Microsoft SQL 和 PostgreSQL 數據庫
- 輕量級且快速
- Windows 原生應用（感覺不像 Java）
- 簡潔的界面
- 免費且開源

**缺點：**
- 僅限 Windows
- 功能不如 DBeaver 多

**下載：** https://www.heidisql.com/

---

### 其他不錯的工具

#### **Beekeeper Studio（現代設計 ⭐⭐⭐⭐）**
- 簡潔現代的界面
- 支持多個數據庫
- 免費社區版
- 下載：https://www.beekeeperstudio.io/

#### **TablePlus（輕量級 ⭐⭐⭐）**
- 非常輕量和快速
- 支持 PostgreSQL 和其他數據庫
- 免費版本有功能限制
- 下載：https://tableplus.com/

#### **DbVisualizer**（跨平台 ⭐⭐⭐⭐）
- 免費版本可用
- 支持多數據庫
- 穩定可靠
- 下載：https://www.dbvis.com/

---

## 📊 工具對比表

| 工具 | 免費 | 開源 | PostgreSQL 支持 | 多數據庫 | 平台 | UI 現代度 |
|------|------|------|-----------------|---------|------|---------|
| **SQuirreL** | ✅ | ✅ | ✅ | ✅ | 全平台 | ⭐⭐⭐ |
| **DBeaver** | ✅ | ✅ | ✅ | ✅ | 全平台 | ⭐⭐⭐ |
| **pgAdmin 4** | ✅ | ✅ | ✅ | ❌ | 全平台 | ⭐⭐⭐ |
| **HeidiSQL** | ✅ | ✅ | ✅ | ✅ | Windows | ⭐⭐⭐⭐ |
| **Beekeeper** | ✅ | ✅ | ✅ | ✅ | 全平台 | ⭐⭐⭐⭐⭐ |
| **TablePlus** | ⚠️ | ❌ | ✅ | ✅ | 全平台 | ⭐⭐⭐⭐⭐ |

---

## 💡 我的個人建議

基於你的使用情況（開發 RSS 閱讀器項目，習慣 SQuirreL）：

### **保持使用 SQuirreL SQL Client**
✅ 優點：
- 你已經習慣了
- 完全免費開源
- 支持 PostgreSQL 和未來可能的其他數據庫
- 功能完整

### **或試試 DBeaver Community**
✅ 優點：
- 更現代的界面
- 功能更豐富（ER 圖、數據導入導出等）
- 如果你未來需要支持其他數據庫也沒問題

### **偶爾用 pgAdmin 4 進行 PostgreSQL 特定操作**
✅ 優點：
- 一些 PostgreSQL 特定功能（角色管理、備份等）只有 pgAdmin 提供

---

## 🎯 快速開始（使用 SQuirreL）

### 假設你已安裝 SQuirreL SQL Client：

1. **下載 PostgreSQL JDBC 驅動**
   - 訪問：https://jdbc.postgresql.org/download.html
   - 下載：`postgresql-42.7.x.jar`

2. **在 SQuirreL 中配置驅動**
   - Windows → View Drivers
   - 右鍵 PostgreSQL → Modify Driver
   - Extra Class Path → Add → 選擇下載的 JAR
   - 點擊 List Drivers
   - OK

3. **建立連接別名**
   - Windows → View Aliases
   - 右鍵 → Create Alias
   - 填入：
     ```
     Name: LocalPostgres
     Driver: PostgreSQL
     URL: jdbc:postgresql://localhost:5432/rss_db
     User: rss_user
     Password: rss_password
     ```
   - Test 和 OK

4. **雙擊連接，開始查詢！**

---

## 🆘 常見問題

### Q1：運行 SQuirreL 後看到紅色 ❌ 符號在 PostgreSQL 驅動

**A：** 需要添加 JDBC JAR 檔案。按照上面 Step 2 中的步驟，確保：
- 下載了最新的 PostgreSQL JDBC 42 JAR
- 在 Extra Class Path 中添加了 JAR
- 點擊了 List Drivers 按鈕

### Q2：連接測試失敗，看到 "Connection refused"

**A：** 檢查：
1. PostgreSQL 容器是否正在運行
   ```powershell
   podman ps
   ```
2. 確認連接字符串正確
   - 主機：`localhost`
   - 端口：`5432`
   - 數據庫：`rss_db`

### Q3：看到 "User does not have CONNECT privilege"

**A：** 用戶名或密碼錯誤。檢查你的 `podman-compose.yml` 確保憑證正確：
```yaml
POSTGRES_USER: rss_user
POSTGRES_PASSWORD: rss_password
```

### Q4：哪個工具最適合查看表數據？

**A：** 
- **SQuirreL**：很好，但需要手寫 SQL
- **DBeaver**：最好，有視覺化的數據編輯器
- **pgAdmin**：也不錯，有實時編輯功能

---

## 📌 保存的連接信息

為了方便，這是你連接到本地 PostgreSQL 的所有信息：

```
主機：localhost
端口：5432
數據庫：rss_db
用戶：rss_user
密碼：rss_password

JDBC URL：jdbc:postgresql://localhost:5432/rss_db
```

---

## 🚀 下一步

1. **如果你想繼續用 SQuirreL：**
   - 按照上面的步驟配置
   - 下載 JDBC 驅動
   - 建立連接

2. **如果你想試試 DBeaver：**
   - 下載：https://dbeaver.io/download/
   - 安裝後自動支持 PostgreSQL
   - 直接建立新連接，無需手動配置驅動

3. **如果你想用 pgAdmin：**
   - 下載桌面或網頁版本
   - PostgreSQL 官方推薦工具
   - 強大的 PostgreSQL 管理功能

---

## 總結

✅ **SQuirreL SQL Client 完全可以連接你的 PostgreSQL**  
✅ **只需下載 JDBC 驅動並配置**  
✅ **你也可以試試其他現代工具如 DBeaver**  
✅ **所有推薦工具都是免費且開源的**

現在就開始配置吧！有任何問題，告訴我。

