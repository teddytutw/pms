# Email 通知功能 — 實作進度追蹤

> 規格詳見 [email-notification-spec.md](./email-notification-spec.md)
> 每完成一項請將狀態改為 ✅，並在備註欄記錄重要決策或偏差。

---

## Phase 1：資料庫 & 後端 Entity

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 1.1 | 建立 `pms_email_templates` table（Oracle + PostgreSQL 版本 SQL） | ✅ | `docs/sql/v8_email_notification_tables.sql` |
| 1.2 | 建立 `pms_notification_log` table（同上） | ✅ | 同一 SQL 檔 |
| 1.3 | 建立 `EmailTemplate` JPA Entity | ✅ | `src/main/java/com/pms/entity/EmailTemplate.java` |
| 1.4 | 建立 `NotificationLog` JPA Entity | ✅ | `src/main/java/com/pms/entity/NotificationLog.java` |
| 1.5 | 建立 `EmailTemplateRepository` | ✅ | `findByRuleId` 方法 |
| 1.6 | 建立 `NotificationLogRepository` | ✅ | `existsByTaskIdAndRuleIdAndTriggeredOn` 方法 |
| 1.7 | 插入三條預設 EmailTemplate 資料（DataInitializer 或 SQL） | ✅ | `DataInitializer.initEmailTemplates`：table 為空時插入預設值 |

---

## Phase 2：後端 Service & Scheduler

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 2.1 | 建立 `EmailTemplateService`（CRUD + `renderTemplate`） | ✅ | `src/main/java/com/pms/service/EmailTemplateService.java` |
| 2.2 | 非 Template 專案過濾 | ✅ | Scheduler 內以 `isTemplate!=true && executionStatus!='TEMPLATE'` 過濾 |
| 2.3 | `ActivityTeamMemberRepository` 查 Owner | ✅ | 現有 `findByTargetTypeAndTargetId` + stream filter |
| 2.4 | 重構 `TaskNotificationScheduler`：加入 RULE-1/2/3 邏輯 | ✅ | 原 tomorrow 邏輯已合併進 RULE-1（5天前） |
| 2.5 | RULE-1：5 天前提醒 | ✅ | `plannedStartDate - today == 5` |
| 2.6 | RULE-2：+3 天逾期提醒 | ✅ | `today - plannedEndDate == 3`，actualEndDate 為空 |
| 2.7 | RULE-3：+5 天逾期提醒 | ✅ | `today - plannedEndDate == 5`，actualEndDate 為空 |
| 2.8 | 寫入 `pms_notification_log`（成功/失敗皆記錄） | ✅ | 成功/失敗均寫 log，`success` 欄位區分 |

---

## Phase 3：REST API

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 3.1 | 建立 `EmailTemplateController` | ✅ | `src/main/java/com/pms/controller/EmailTemplateController.java` |
| 3.2 | `GET /api/email-templates` — 取得全部範本 | ✅ | |
| 3.3 | `PUT /api/email-templates/{ruleId}` — 更新主旨/內文/enabled | ✅ | |
| 3.4 | `POST /api/email-templates/preview` — 以範例變數渲染後回傳 | ✅ | 可傳入 `vars` 物件覆寫範例值 |

---

## Phase 4：前端 UI

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 4.1 | 在 Settings 頁面新增「Email 通知設定」區塊 | ✅ | `Settings.tsx` 新增 section |
| 4.2 | 建立 `EmailNotificationSettings` 元件 | ✅ | `frontend/src/components/EmailNotificationSettings.tsx` |
| 4.3 | 每條規則的 Card UI：啟用 Toggle + 主旨 Input + 內文 Textarea | ✅ | 可折疊 Card，點擊 header 展開/收合 |
| 4.4 | 「儲存」按鈕 → `PUT /api/email-templates/{ruleId}` | ✅ | 儲存成功/失敗顯示 toast |
| 4.5 | 「預覽」按鈕 → `POST /api/email-templates/preview` → Modal 顯示渲染結果 | ✅ | Modal 顯示主旨+內文渲染結果 |
| 4.6 | 可用變數說明區塊（顯示所有 `{{variable}}` 清單） | ✅ | 可展開/收合的說明區塊 |

---

## Phase 5：測試 & 收尾

| # | 任務 | 狀態 | 備註 |
|---|------|------|------|
| 5.1 | 手動測試：修改 Task plannedStartDate 為 today+5，觀察排程是否送信 | ⬜ | 可臨時改 cron 為每分鐘測試 |
| 5.2 | 手動測試：修改 Task plannedEndDate 為 today-3，觀察 RULE-2 | ⬜ | |
| 5.3 | 確認 `pms_notification_log` 防重複機制有效 | ⬜ | |
| 5.4 | 更新 `CLAUDE.md`（新增 Email 通知相關架構說明） | ⬜ | |
| 5.5 | 執行 `docs/sql/v8_email_notification_tables.sql` 於 Oracle/PostgreSQL | ⬜ | Hibernate ddl-auto=update 會自動建 table；SQL 為手動備份用 |

---

## 技術決策記錄

| 日期 | 決策 | 原因 |
|------|------|------|
| 2026-04-25 | Task Owner 從 `pms_activity_teams` 取，不用 `Task.assigneeId` | Teams 成員較能反映實際負責人，assigneeId 為舊欄位 |
| 2026-04-25 | 以 `pms_notification_log` 記錄已送通知 | 防止排程重跑或補跑時重複發信 |
| 2026-04-25 | 變數替換用 `String.replace`，不引入 Mustache/Freemarker | 依賴最小化；需求簡單 |
| 2026-04-25 | Scheduler 合併三條規則進一個每日 job | 減少 DB 查詢次數；原 tomorrow 邏輯合併進 RULE-1 |
