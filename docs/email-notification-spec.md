# Email 通知功能規格文件

## 1. 現有排程狀態判斷規則

### 1.1 Task 狀態指示燈 (StatusService.java)

| 狀態 | 顏色 | 條件 |
|------|------|------|
| 已完成 | BLUE | `actualEndDate` 有值 |
| 準時 | GREEN | 今天 ≤ `plannedEndDate`，或 `plannedEndDate` 為空 |
| 輕微延遲 | YELLOW | 今天超過 `plannedEndDate` **1~3 天** |
| 嚴重延遲 | RED | 今天超過 `plannedEndDate` **4 天以上** |

### 1.2 Phase / Project 狀態
由下層狀態向上聚合：RED > YELLOW > GREEN > BLUE（優先顯示最嚴重）。

---

## 2. Email 通知功能需求

### 2.1 觸發規則（皆限非 Template 專案）

| 規則 ID | 名稱 | 觸發條件 | 收件人 |
|---------|------|----------|--------|
| RULE-1 | 任務即將開始 | 今天 = `plannedStartDate` - 5 天，且任務未完成 | Task Owner |
| RULE-2 | 輕微逾期提醒 | 今天 = `plannedEndDate` + 3 天，且 `actualEndDate` 為空 | Task Owner |
| RULE-3 | 嚴重逾期提醒 | 今天 = `plannedEndDate` + 5 天，且 `actualEndDate` 為空 | Task Owner |

> **Task Owner 定義：** `pms_activity_teams` 中 `target_type='TASK'`、`target_id=taskId`、`responsibility='Owner'` 的 `user_id`，再對應 `pms_users` 取 email。

### 2.2 重複發送防護
- 同一 taskId + ruleId + 觸發日期，僅發送一次。
- 以 `pms_notification_log` 記錄已送出的通知（見 2.4）。

---

## 3. Email Template 設定介面

### 3.1 功能概述
管理員可在「Settings」頁面維護每條規則的 Email 主旨與內文範本。範本支援 **變數替換**（Mustache 風格 `{{variable}}`）。

### 3.2 可用變數

| 變數 | 說明 |
|------|------|
| `{{recipientName}}` | 收件人姓名 |
| `{{taskTitle}}` | 任務名稱 |
| `{{projectName}}` | 所屬專案名稱 |
| `{{phaseName}}` | 所屬 Phase 名稱 |
| `{{plannedStartDate}}` | 計畫開始日 |
| `{{plannedEndDate}}` | 計畫結束日 |
| `{{daysBefore}}` | 距開始幾天（RULE-1 用） |
| `{{daysOverdue}}` | 超過幾天（RULE-2/3 用） |

### 3.3 預設範本

**RULE-1 — 任務即將開始**
- 主旨：`【任務提醒】您的任務「{{taskTitle}}」將於 {{daysBefore}} 天後開始`
- 內文：
  ```
  親愛的 {{recipientName}} 您好，
  
  系統提醒您，任務「{{taskTitle}}」（專案：{{projectName}} / 階段：{{phaseName}}）
  計畫開始日為 {{plannedStartDate}}，距今還有 {{daysBefore}} 天。
  請提前做好準備。
  
  Project Management System
  ```

**RULE-2 — 輕微逾期提醒**
- 主旨：`【逾期提醒】任務「{{taskTitle}}」已超過計畫結束日 {{daysOverdue}} 天`
- 內文：
  ```
  親愛的 {{recipientName}} 您好，
  
  任務「{{taskTitle}}」（專案：{{projectName}} / 階段：{{phaseName}}）
  計畫結束日為 {{plannedEndDate}}，目前已逾期 {{daysOverdue}} 天。
  請盡速更新任務進度或完成日期。
  
  Project Management System
  ```

**RULE-3 — 嚴重逾期提醒**
- 主旨：`【嚴重逾期】任務「{{taskTitle}}」已超過計畫結束日 {{daysOverdue}} 天，請立即處理`
- 內文：同 RULE-2 但語氣更緊急，可加上：`此為第二次提醒，情況嚴重，請立即協調資源處理。`

---

## 4. 資料庫設計

### 4.1 新增 Table：`pms_email_templates`

```sql
CREATE TABLE pms_email_templates (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,   -- Oracle: NUMBER GENERATED ALWAYS AS IDENTITY
    rule_id       VARCHAR(20)  NOT NULL UNIQUE,         -- RULE-1 / RULE-2 / RULE-3
    rule_name     VARCHAR(100) NOT NULL,
    subject       VARCHAR(300) NOT NULL,
    body          CLOB         NOT NULL,                -- Oracle: CLOB / PostgreSQL: TEXT
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_at    TIMESTAMP
);
```

### 4.2 新增 Table：`pms_notification_log`

```sql
CREATE TABLE pms_notification_log (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id       BIGINT       NOT NULL,
    rule_id       VARCHAR(20)  NOT NULL,
    triggered_on  DATE         NOT NULL,               -- 觸發當天（防止重複）
    recipient_email VARCHAR(100),
    sent_at       TIMESTAMP    NOT NULL,
    success       BOOLEAN      NOT NULL DEFAULT TRUE,
    error_message VARCHAR(500),
    UNIQUE (task_id, rule_id, triggered_on)
);
```

---

## 5. 後端架構

### 5.1 Entity
- `EmailTemplate` — 對應 `pms_email_templates`
- `NotificationLog` — 對應 `pms_notification_log`

### 5.2 Repository
- `EmailTemplateRepository` — `findByRuleId(String ruleId)`
- `NotificationLogRepository` — `existsByTaskIdAndRuleIdAndTriggeredOn(Long, String, LocalDate)`

### 5.3 Service
- `EmailTemplateService` — CRUD；`renderTemplate(String body, Map<String,String> vars)` 做變數替換（`String.replace`）
- 擴充 `MailService` 支援 HTML body（可選）

### 5.4 Scheduler（擴充 TaskNotificationScheduler）
- 每日 08:00 GMT+8 執行
- 流程：
  1. 查詢所有非 Template 專案（`isTemplate=false` 或 `executionStatus != 'TEMPLATE'`）的所有 Task
  2. 對每個 Task 依三條規則計算是否觸發
  3. 查詢 `pms_activity_teams` 取 Owner user id → email
  4. 查 `pms_notification_log` 確認今天是否已送
  5. 取對應 `EmailTemplate` 渲染後送信，並寫入 Log

### 5.5 REST API（供前端 Settings 頁面）
```
GET    /api/email-templates          取得所有範本
PUT    /api/email-templates/{ruleId} 更新範本主旨/內文/啟用狀態
POST   /api/email-templates/preview  預覽（帶入範例變數回傳渲染結果）
```

---

## 6. 前端 UI（Settings 頁面）

### 6.1 路由
`/settings` 頁面新增 tab 或 section：**Email 通知設定**

### 6.2 元件結構
```
EmailNotificationSettings
  ├── RuleCard (×3)
  │     ├── 啟用/停用 Toggle
  │     ├── 主旨 Input
  │     ├── 內文 Textarea（顯示可用變數提示）
  │     └── 儲存按鈕
  └── 可用變數說明列表
```

### 6.3 UX 細節
- 儲存成功顯示 toast 訊息
- 停用後排程器不發送該規則的通知
- 提供「預覽」按鈕（呼叫 `/api/email-templates/preview`，彈出 modal 顯示渲染結果）

---

## 7. 不在本次範圍

- Email 發送記錄查詢 UI（僅後端 log）
- 多語系範本
- 專案層級或 Phase 層級通知
- 手動觸發通知
