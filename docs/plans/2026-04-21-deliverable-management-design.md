# Deliverable Management — Design Document

**Date:** 2026-04-21  
**Status:** Approved

---

## 1. 功能概覽

在 PMS 系統中加入「交付物（Deliverable）」管理能力。Deliverable 是專案產出的具體文件或成果，需要掛載到 Activity（Project / Phase / Task）節點，並支援跨節點共用、動態類型定義、多 Workflow 審核步驟追蹤。

---

## 2. 核心設計決策

| 決策點 | 選擇 | 理由 |
|--------|------|------|
| Type 管理 | 動態（管理員維護）| 可依組織需求彈性擴充 |
| Workflow | 獨立選單維護，多對多掛載 | 一個 WF 可用在多個 Deliverable，反之亦然 |
| 狀態追蹤 | 跟著 Workflow 步驟走 | 每個 Deliverable-Workflow 組合各自追蹤進度 |
| Activity 關聯 | 可直接新建 or 搜尋已存在並掛入 | 支援跨 Project/Phase/Task 共用 |
| Where Used | 獨立 tab，含 hyperlink 導航至 WBS | 完整可追溯性 |

---

## 3. 資料模型

### 3.1 E-R 關係

```
DeliverableType (1) ──< TypeField (N)
DeliverableType (1) ──< Deliverable (N)
Deliverable (1) ──< FieldValue (N)
Deliverable (N) ──< DeliverableWorkflow >── (N) Workflow
Workflow (1) ──< WorkflowStep (N)
DeliverableWorkflow (1) ──< WorkflowLog (N)
Activity [PROJECT|PHASE|TASK] (N) ──< ActivityDeliverable >── (N) Deliverable
```

### 3.2 新增資料表（9 張）

#### `pms_deliverable_types`
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| name | VARCHAR(100) NOT NULL | 類型名稱（如 Report、Spec） |
| description | VARCHAR(500) | 說明 |
| created_at | TIMESTAMP | |

#### `pms_deliverable_type_fields`
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| type_id | BIGINT FK → pms_deliverable_types | |
| field_name | VARCHAR(100) NOT NULL | 欄位標籤 |
| field_type | VARCHAR(20) NOT NULL | TEXT / DATE / SELECT / NUMBER |
| field_options | TEXT | JSON 陣列，SELECT 時的選項 |
| field_order | INT DEFAULT 0 | 顯示順序 |

#### `pms_workflows`
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| name | VARCHAR(100) NOT NULL | Workflow 名稱 |
| description | VARCHAR(500) | |
| created_at | TIMESTAMP | |

#### `pms_workflow_steps`
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| workflow_id | BIGINT FK → pms_workflows | |
| step_name | VARCHAR(100) NOT NULL | 步驟名稱（如 Draft, Review, Approved） |
| step_order | INT NOT NULL | 步驟順序（從 1 開始） |
| description | VARCHAR(500) | |

#### `pms_deliverables`
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| name | VARCHAR(200) NOT NULL | 交付物名稱 |
| type_id | BIGINT FK → pms_deliverable_types | |
| description | TEXT | |
| created_by | BIGINT FK → pms_users | |
| created_at | TIMESTAMP | |

#### `pms_deliverable_field_values`
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| deliverable_id | BIGINT FK → pms_deliverables | |
| field_def_id | BIGINT FK → pms_deliverable_type_fields | |
| field_value | TEXT | |

#### `pms_activity_deliverables`（Activity ↔ Deliverable 多對多）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| target_type | VARCHAR(20) NOT NULL | PROJECT / PHASE / TASK |
| target_id | VARCHAR(100) NOT NULL | Activity 的 ID |
| deliverable_id | BIGINT FK → pms_deliverables | |
| created_at | TIMESTAMP | |
| UNIQUE(target_type, target_id, deliverable_id) | | 防重複 |

#### `pms_deliverable_workflows`（Deliverable ↔ Workflow 多對多 + 進度）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| deliverable_id | BIGINT FK → pms_deliverables | |
| workflow_id | BIGINT FK → pms_workflows | |
| current_step_id | BIGINT FK → pms_workflow_steps NULL | 目前進行到哪步 |
| started_at | TIMESTAMP | |
| UNIQUE(deliverable_id, workflow_id) | | 防重複 |

#### `pms_deliverable_workflow_log`（審核歷程）
| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGSERIAL PK | |
| deliverable_workflow_id | BIGINT FK → pms_deliverable_workflows | |
| step_id | BIGINT FK → pms_workflow_steps | |
| action | VARCHAR(20) NOT NULL | APPROVE / REJECT / START |
| action_by | BIGINT FK → pms_users | |
| action_at | TIMESTAMP | |
| comments | VARCHAR(1000) | |

---

## 4. API 端點設計

### Deliverable Types
- `GET  /api/deliverable-types` — 取得所有類型（含欄位定義）
- `POST /api/deliverable-types` — 新增類型
- `PUT  /api/deliverable-types/{id}` — 更新
- `DELETE /api/deliverable-types/{id}` — 刪除

### Deliverable Type Fields
- `GET  /api/deliverable-types/{typeId}/fields`
- `POST /api/deliverable-types/{typeId}/fields`
- `DELETE /api/deliverable-type-fields/{fieldId}`

### Workflows
- `GET  /api/workflows` — 取得所有 Workflow（含步驟）
- `POST /api/workflows` — 新增
- `PUT  /api/workflows/{id}` — 更新
- `DELETE /api/workflows/{id}` — 刪除

### Workflow Steps
- `POST /api/workflows/{workflowId}/steps`
- `PUT  /api/workflow-steps/{stepId}`
- `DELETE /api/workflow-steps/{stepId}`

### Deliverables
- `GET  /api/deliverables` — 搜尋（支援 keyword）
- `GET  /api/deliverables/{id}` — 取得單筆（含欄位值）
- `POST /api/deliverables` — 新增
- `PUT  /api/deliverables/{id}` — 更新
- `DELETE /api/deliverables/{id}` — 刪除

### Activity-Deliverable Links
- `GET  /api/activity-deliverables?targetType=TASK&targetId=123`
- `POST /api/activity-deliverables` — 掛入（關聯）
- `DELETE /api/activity-deliverables/{id}` — 移除關聯

### Where Used
- `GET  /api/deliverables/{id}/where-used` — 查該 Deliverable 掛在哪些 Activity

### Deliverable Workflows（審核流程）
- `GET  /api/deliverables/{id}/workflows` — 取得此 Deliverable 的所有 Workflow + 進度
- `POST /api/deliverables/{id}/workflows` — 掛入 Workflow
- `DELETE /api/deliverable-workflows/{id}` — 移除 Workflow
- `POST /api/deliverable-workflows/{id}/advance` — 執行審核動作（body: action, comments）

---

## 5. 前端 UI 規劃

### 5.1 新增選單項目（Sidebar）
- Owner 限定：新增 **Workflow Management** (`/workflows`) 頁面
- Owner 限定：**Deliverable Types** 納入 Settings 頁面新 tab，或獨立頁面 (`/deliverable-types`)

### 5.2 Workflow Management 頁面（`/workflows`）
- 左側面板：Workflow 清單（CRUD）
- 右側面板：選中 Workflow 的步驟編輯（排序、新增、刪除）

### 5.3 Deliverable Types 管理（Settings 或獨立頁）
- 類型清單（CRUD）
- 展開時顯示/編輯該類型的自訂欄位（名稱、型別、選項）

### 5.4 TaskDetailView — 新增 Deliverables Tab
- 位置：Details / Team / Files 之後新增第 4 個 tab
- 內容：
  - 工具列：`[+ New]` `[+ Link]` 按鈕
  - 表格：Deliverable 名稱、Type、Workflow 摘要（X/N 步）、操作
  - 點擊列 → 開啟 Deliverable Detail Modal

### 5.5 Deliverable Detail Modal（4 tabs）
1. **Details** — 名稱、描述、Type；Type 自訂欄位動態渲染
2. **Workflow** — 每個掛載的 Workflow 顯示進度條 + 步驟列表，可 Approve/Reject
3. **Files** — 附件上傳（複用現有 AttachmentController，targetType="DELIVERABLE"）
4. **Where Used** — 表格列出所有使用此 Deliverable 的 Activity，含 hyperlink 至 Dashboard WBS

---

## 6. 導航（Where Used → WBS）

Where Used 頁籤中，每個 Activity 列顯示：
- Project Name（可點擊）→ 導向 `/dashboard?projectId={id}`
- Phase Name（若是 PHASE）
- Task Name（若是 TASK）

Dashboard 頁面已支援 URL 參數 `projectId`，點擊後自動選中對應專案，並將 WBS 對焦到對應節點（透過 `selectedActivity` state）。

---

*設計已通過使用者確認，進入實作規劃。*
