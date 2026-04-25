# Deliverable Management — Task Progress

Based on: `2026-04-21-deliverable-management.md` + `2026-04-21-deliverable-management-design.md`

| Task | Status | Notes |
|---|---|---|
| Task 1: Run DB Migration | ✅ done | `v5_deliverables_postgresql.sql` (PostgreSQL) + `v5_deliverables_oracle.sql` (Oracle 12c+) written; **must be executed manually against DB** |
| Task 2: Backend Entities | ✅ done | All 9 entities in `src/main/java/com/pms/entity/` |
| Task 3: Backend Repositories | ✅ done | All 9 repositories with custom queries |
| Task 4: Backend Controllers | ✅ done | 4 controllers: DeliverableType, Workflow, ActivityDeliverable, Deliverable |
| Task 5: Frontend — Workflow Management Page | ✅ done | `pages/WorkflowManagement.tsx`, route + sidebar item |
| Task 6: Frontend — Deliverable Types Page | ✅ done | `pages/DeliverableTypeManagement.tsx`, route + sidebar item |
| Task 7: Frontend — DeliverableModal Component | ✅ done | `components/DeliverableModal.tsx` — 4 tabs: Details/Workflow/Files/Where Used |
| Task 8: Frontend — Deliverables Tab in TaskDetailView | ✅ done | New tab with +New/+Link, modal trigger, unlink; shows deliverable names |
| Task 9: Frontend — Dashboard URL Param Support | ✅ done | `useSearchParams` reads `?projectId=X` for Where Used navigation |
| Task 10: Bug Fixes (2026-04-22) | ✅ done | See bug log below |
| Task 11: End-to-End Verification | ⬜ pending | See checklist below |

---

## Bug Fixes Applied (2026-04-22)

| # | File | Bug | Fix |
|---|---|---|---|
| B1 | `WorkflowManagement.tsx` | Step DELETE/PUT used wrong URL prefix `api/workflow-steps/` — actual controller maps to `api/workflows/steps/` | Changed all 3 occurrences to `api/workflows/steps/${stepId}` |
| B2 | `DeliverableModal.tsx` | `setAttachments(prev => [await res.json(), ...prev])` — `await` inside synchronous state setter (runtime error) | Extracted `const newAtt = await res.json()` before calling `setAttachments` |
| B3 | `TaskDetailView.tsx` | Deliverables tab listed items as `Deliverable #id` with no name | Added `deliverableNames: Record<number,string>` state; fetches each linked deliverable's name after loading the list |

---

## Task 11 Checklist

- [ ] Execute `docs/sql/v5_deliverables_oracle.sql` against Oracle DB (or `v5_deliverables_postgresql.sql` if using PostgreSQL)
- [ ] `mvn spring-boot:run` — verify no startup errors
- [ ] Test `/workflows`: create workflow → add steps (Draft, Review, Approved) → reorder → save → verify
- [ ] Test `/deliverable-types`: create type → add TEXT/DATE/SELECT fields → save each → verify
- [ ] Open Dashboard → select project → click a Task → switch to **Deliverables** tab
- [ ] Click `[+ New]` → modal opens → fill name/description/type/custom fields → SAVE → title updates
- [ ] Switch to **Workflow** tab in modal → attach workflow → Approve → bubble advances; after last step shows "Completed"
- [ ] Reject a step → log shows REJECT entry
- [ ] Upload file on **Files** tab → download → delete
- [ ] Click `[+ Link]` on another Task → search by keyword → Link → deliverable name appears in list
- [ ] Open modal from linked Task → **Where Used** tab lists both tasks → click link → Dashboard navigates to correct project
