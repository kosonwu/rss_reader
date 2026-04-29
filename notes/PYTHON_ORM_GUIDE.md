# 🐍 Python ORM 對比與 RSS 項目最佳實踐

## 🎯 簡短答案

**是的，Python 有多個類似 Drizzle ORM 的套件，並且都支持 pgvector。**

你有以下選擇：
1. **SQLAlchemy 2.0**（最成熟，推薦用於複雜項目）
2. **SQLModel**（最簡潔，推薦用於 FastAPI）
3. **Tortoise ORM**（最現代化，推薦用於異步項目）
4. **Peewee**（最輕量級，推薦用於簡單項目）

---

## 📊 主流 Python ORM 對比

### **功能對比表**

| 特性 | SQLAlchemy 2.0 | SQLModel | Tortoise ORM | Peewee |
|------|---------------|---------|-------------|--------|
| **學習曲線** | ⭐⭐⭐ 陡峭 | ⭐⭐ 中等 | ⭐ 簡單 | ⭐ 簡單 |
| **類型提示** | ✅ 優秀 | ✅⭐ 最佳 | ✅ 優秀 | ⚠️ 有限 |
| **非同步支持** | ✅ 完整 | ✅ 完整 | ✅ 原生 | ⚠️ 有限 |
| **pgvector 支持** | ✅ 完整 | ✅ 完整 | ✅ 完整 | ✅ 支持 |
| **向量相似度搜索** | ✅ 原生 | ✅ 原生 | ✅ 原生 | ✅ 支持 |
| **複雜查詢** | ✅ 優秀 | ✅ 優秀 | ⚠️ 中等 | ⚠️ 有限 |
| **社區支持** | ✅ 最強 | ✅ 強 | ✅ 強 | ⚠️ 中等 |
| **性能** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **生產就緒** | ✅ 完全 | ✅ 完全 | ✅ 完全 | ✅ 完全 |
| **與 Drizzle 相似度** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ |

---

## 🔍 詳細對比

### **1. SQLAlchemy 2.0（最強大）**

#### 優點
```python
# 型別安全 + 全功能
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from pgvector.sqlalchemy import Vector
import numpy as np

class Base(DeclarativeBase):
    pass

class TrackedEntity(Base):
    __tablename__ = "tracked_entities"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    embedding: Mapped[np.ndarray] = mapped_column(Vector(768))
    co_occurrence_count: Mapped[int] = mapped_column(default=0)
```

#### 向量查詢（無需改寫 SQL）
```python
from sqlalchemy import select, func
from sqlalchemy.orm import Session

def find_similar_entities(session: Session, query_embedding: list[float], limit: int = 5):
    # 完全用 Python，無需寫 SQL
    query = (
        select(TrackedEntity)
        .order_by(
            TrackedEntity.embedding.cosine_distance(query_embedding)
        )
        .limit(limit)
    )
    return session.scalars(query).all()

# 也支持其他距離度量
# .l2_distance() / .inner_product() / .max_inner_product()
```

#### 複雜查詢示例
```python
# 混合查詢：結構化 + 向量
query = (
    select(TrackedEntity)
    .where(TrackedEntity.co_occurrence_count > 5)  # 結構化過濾
    .order_by(TrackedEntity.embedding.cosine_distance(query_vec))  # 向量搜索
    .limit(10)
)
```

#### 缺點
- 學習曲線陡峭
- 配置較多

#### 推薦用途
- ✅ 複雜的生產應用
- ✅ 企業級項目
- ✅ 需要完全控制的項目

---

### **2. SQLModel（最簡潔，推薦 ⭐⭐⭐⭐⭐）**

#### 特點
- Pydantic + SQLAlchemy 完美結合
- 最像 Drizzle 的 Python ORM
- 優秀的類型提示和驗證

#### 代碼示例
```python
from sqlmodel import SQLModel, Field, create_engine, Session, select
from pgvector.sqlalchemy import Vector
from typing import Optional
import numpy as np

class TrackedEntity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    embedding: Any = Field(sa_type=Vector(768))
    co_occurrence_count: int = Field(default=0)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

# 查詢
def find_similar_entities(session: Session, query_embedding: list[float], limit: int = 5):
    statement = (
        select(TrackedEntity)
        .order_by(TrackedEntity.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    return session.exec(statement).all()
```

#### 優點
```
✅ 最簡潔的代碼
✅ Pydantic 驗證內置
✅ FastAPI 最佳搭檔
✅ 類型提示最好
✅ 學習曲線平緩
```

#### 缺點
- 社區規模比 SQLAlchemy 小
- 某些高級功能有限

#### 推薦用途
- ✅ FastAPI 項目
- ✅ 現代化 Python 應用
- ✅ 中小型項目
- ✅ 你的 RSS 項目（推薦）

---

### **3. Tortoise ORM（最現代）**

#### 特點
- 異步優先設計
- Django ORM 風格
- 非常簡潔

#### 代碼示例
```python
from tortoise import BaseModel, fields
from tortoise.contrib.pydantic import pydantic_model_creator

class TrackedEntity(BaseModel):
    id = fields.IntField(pk=True)
    title = fields.CharField(max_length=255)
    embedding = fields.JSONField()  # pgvector 支持需要手動配置
    co_occurrence_count = fields.IntField(default=0)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "tracked_entities"

# 異步查詢
async def find_similar_entities(query_embedding: list[float], limit: int = 5):
    # 注：Tortoise 的 pgvector 支持需要額外配置
    entities = await TrackedEntity.filter(
        co_occurrence_count__gte=5
    ).limit(limit)
    return entities
```

#### 優點
- ✅ 最簡潔的 API
- ✅ 異步原生支持
- ✅ 性能最好（Tortoise 基準測試中領先）

#### 缺點
- ⚠️ pgvector 支持需要額外配置
- ⚠️ 社區相對較小

#### 推薦用途
- ✅ 高性能異步應用
- ✅ 實時數據應用
- ⚠️ pgvector 使用不推薦（配置複雜）

---

### **4. Peewee（最輕量）**

#### 特點
- 最簡單的 ORM
- 最少的配置
- 開銷最小

#### 代碼示例
```python
from peewee import Model, IntegerField, CharField, DateTimeField, PostgresqlDatabase
from pgvector.peewee import VectorField
from datetime import datetime

db = PostgresqlDatabase('rss_db', user='rss_user', password='rss_password', host='localhost')

class TrackedEntity(Model):
    id = IntegerField(primary_key=True)
    title = CharField()
    embedding = VectorField(dimensions=768)
    co_occurrence_count = IntegerField(default=0)
    created_at = DateTimeField(default=datetime.now)
    
    class Meta:
        database = db
        table_name = 'tracked_entities'

# 查詢
def find_similar_entities(query_embedding, limit=5):
    query = (
        TrackedEntity
        .select()
        .where(TrackedEntity.co_occurrence_count > 5)
        .order_by(TrackedEntity.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    return list(query)
```

#### 優點
- ✅ 代碼最簡潔
- ✅ 學習時間最短
- ✅ pgvector 支持完整

#### 缺點
- ⚠️ 複雜查詢支持有限
- ⚠️ 類型提示有限
- ⚠️ 異步支持有限

#### 推薦用途
- ✅ 簡單項目
- ✅ 快速原型開發
- ⚠️ 複雜應用不推薦

---

## 🎯 針對你的 RSS 項目

### **推薦方案：SQLModel**

#### 理由
1. **最接近 Drizzle ORM 的體驗**
   - 類型安全 ✅
   - 簡潔聲明式 ✅
   - 無需手寫 SQL ✅

2. **完美支持 pgvector**
   ```python
   from sqlmodel import SQLModel, Field
   from pgvector.sqlalchemy import Vector
   
   class TrackedEntity(SQLModel, table=True):
       id: Optional[int] = Field(default=None, primary_key=True)
       embedding: Any = Field(sa_type=Vector(768))
   ```

3. **適合你的 Next.js 棧**
   - Next.js 用 Drizzle → Python 用 SQLModel
   - 概念一致
   - 學習曲線平緩

4. **與你現有代碼兼容**
   - 直接替代原有 SQL
   - 無需重寫業務邏輯
   - 遷移工作量最小

---

## 💻 遷移示例（SQL → SQLModel）

### **你現在的代碼（SQL）**
```python
# 目前的方式
import psycopg2
from psycopg2.extras import execute_values

conn = psycopg2.connect("dbname=rss_db user=rss_user password=rss_password")
cursor = conn.cursor()

# 查詢相似 entities
query = """
    SELECT id, title, embedding <-> %s AS distance
    FROM tracked_entities
    WHERE co_occurrence_count > %s
    ORDER BY embedding <-> %s
    LIMIT %s
"""
cursor.execute(query, (query_vector, 5, query_vector, 10))
results = cursor.fetchall()
```

### **改用 SQLModel 後**
```python
# 改用 SQLModel 後
from sqlmodel import SQLModel, Field, create_engine, Session, select
from pgvector.sqlalchemy import Vector
from typing import Optional, Any
from datetime import datetime

# 1. 定義模型
class TrackedEntity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    embedding: Any = Field(sa_type=Vector(768))
    co_occurrence_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 2. 查詢（無需寫 SQL）
def find_similar_entities(session: Session, query_vector: list, limit: int = 10):
    statement = (
        select(TrackedEntity)
        .where(TrackedEntity.co_occurrence_count > 5)
        .order_by(TrackedEntity.embedding.cosine_distance(query_vector))
        .limit(limit)
    )
    return session.exec(statement).all()

# 3. 使用
engine = create_engine("postgresql://rss_user:rss_password@localhost/rss_db")
SQLModel.metadata.create_all(engine)

with Session(engine) as session:
    results = find_similar_entities(session, query_vector)
    for entity in results:
        print(f"{entity.title} - Distance: {entity.embedding.cosine_distance(query_vector)}")
```

### **優點對比**
```
SQL 方式:
❌ 需要手寫 SQL
❌ 容易出錯
❌ 難以遷移到 DB2
❌ 無類型檢查

SQLModel 方式:
✅ Python 原生語法
✅ 類型安全
✅ IDE 自動完成
✅ 容易遷移（無需改業務邏輯）
✅ 無需參數手動管理
✅ 自動連接池
```

---

## 🔄 你的 RSS 項目完整架構

### **目前架構**
```
Next.js (Drizzle ORM)
    ↓
Python Worker (psycopg2 直接 SQL)
    ↓
PostgreSQL + pgvector
```

### **改進後的架構**
```
Next.js (Drizzle ORM)
    ↓
Python Worker (SQLModel ORM)  ← 改這裡
    ↓
PostgreSQL + pgvector
```

---

## 📋 遷移計劃（SQLModel）

### **Step 1：安裝依賴**
```bash
pip install sqlmodel
pip install pgvector  # 已有
pip install psycopg[asyncpg]  # 異步驅動（可選）
```

### **Step 2：定義數據模型**
```python
# models.py
from sqlmodel import SQLModel, Field, Column
from pgvector.sqlalchemy import Vector
from typing import Optional, Any
from datetime import datetime

class TrackedEntity(SQLModel, table=True):
    __tablename__ = "tracked_entities"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    alias: list[str] = Field(default=[])
    embedding: Any = Field(sa_type=Vector(768))
    co_occurrence_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DailyDigest(SQLModel, table=True):
    __tablename__ = "daily_digests"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    date: str
    summary: str
    entities: list[str]
    generated_at: datetime = Field(default_factory=datetime.utcnow)
```

### **Step 3：改寫數據訪問層**
```python
# database.py
from sqlmodel import SQLModel, Session, create_engine, select
from typing import Optional, List

DATABASE_URL = "postgresql://rss_user:rss_password@localhost/rss_db"
engine = create_engine(DATABASE_URL, echo=False)

def create_tables():
    SQLModel.metadata.create_all(engine)

# 查詢示例
def find_similar_entities(query_vector: list, limit: int = 5) -> List[TrackedEntity]:
    with Session(engine) as session:
        statement = (
            select(TrackedEntity)
            .order_by(TrackedEntity.embedding.cosine_distance(query_vector))
            .limit(limit)
        )
        return session.exec(statement).all()

# 插入示例
def create_entity(title: str, embedding: list, co_occurrence: int = 0) -> TrackedEntity:
    with Session(engine) as session:
        entity = TrackedEntity(
            title=title,
            embedding=embedding,
            co_occurrence_count=co_occurrence
        )
        session.add(entity)
        session.commit()
        session.refresh(entity)
        return entity

# 更新示例
def update_entity_count(entity_id: int, count: int) -> Optional[TrackedEntity]:
    with Session(engine) as session:
        entity = session.get(TrackedEntity, entity_id)
        if entity:
            entity.co_occurrence_count = count
            session.add(entity)
            session.commit()
            session.refresh(entity)
        return entity
```

### **Step 4：在 APScheduler 中使用**
```python
# digest_pipeline.py
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

def generate_daily_digest():
    # 使用 SQLModel 查詢
    from database import DailyDigest, TrackedEntity, engine
    from sqlmodel import Session, select
    
    with Session(engine) as session:
        # 查詢所有高頻 entities
        statement = select(TrackedEntity).where(
            TrackedEntity.co_occurrence_count > 10
        )
        entities = session.exec(statement).all()
        
        # 生成摘要
        summary = generate_summary(entities)
        
        # 保存到數據庫
        digest = DailyDigest(
            date=datetime.now().strftime("%Y-%m-%d"),
            summary=summary,
            entities=[e.title for e in entities]
        )
        session.add(digest)
        session.commit()

scheduler = BackgroundScheduler()
scheduler.add_job(generate_daily_digest, 'cron', hour=0, minute=0)
scheduler.start()
```

### **Step 5：與 LangChain 集成**
```python
# rag_integration.py
from langchain_community.vectorstores import SQLModel as LangChainSQLModel
from models import TrackedEntity

# SQLModel 與 LangChain 兼容
vector_store = LangChainSQLModel.from_texts(
    texts=entity_texts,
    embedding=embeddings,
    metadatas=metadatas,
    connection_string=DATABASE_URL,
    table_name="tracked_entities"
)

# RAG 查詢
results = vector_store.similarity_search(query, k=5)
```

---

## ✅ 總結

### **為什麼 SQLModel？**

| 方面 | SQL 直接 | SQLModel |
|------|----------|----------|
| **代碼行數** | 更多 | 更少 |
| **安全性** | 容易出錯 | 類型安全 |
| **遷移難度** | 困難 | 簡單 |
| **到 DB2** | 需要改 SQL | 只改驅動 |
| **與 Drizzle 相似度** | 0% | 90% |
| **學習成本** | 中等 | 低 |

### **遷移時間**
- SQLModel 模型定義：1-2 小時
- 改寫數據訪問層：2-4 小時
- 測試和驗證：2-3 小時
- **總計：5-9 小時**

### **下一步**
1. ✅ 安裝 SQLModel
2. ✅ 定義模型
3. ✅ 改寫數據訪問層
4. ✅ 運行測試
5. ✅ 部署到生產

**你會获得：**
- ✅ 無需寫 SQL
- ✅ 類型安全
- ✅ 容易遷移到 DB2
- ✅ 更 Pythonic 的代碼
- ✅ 與 Next.js Drizzle 概念一致

