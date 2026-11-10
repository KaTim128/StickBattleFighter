---
name: assign-specialist
description: Master Developer procedure for delegating a bounded task to a Stickman Arena specialist subagent - dependency and conflict check, ownership lookup, assignment brief, tracking, and personal verification of the result. Use whenever work is delegated.
---
# Assign a specialist

## Steps
1. **Define the task:** one measurable objective, with acceptance criteria and spec IDs. Confirm no open question (spec §21) blocks it.
2. **Inspect** the current code for the affected systems (do not delegate blind).
3. **Ownership:** find the owner of each path in `docs/workflow/SYSTEM_OWNERSHIP.md`. Choose the owning specialist. If paths span owners, split the task or define a contract first.
4. **Conflict check:** read the Active Assignments in `DEVELOPMENT_PROGRESS.md`. If any path or system overlaps an active assignment, wait or re-sequence. Never run two specialists on the same files.
5. **Record** the assignment in Active Assignments (ID, specialist, objective, paths, start date).
6. **Delegate** with this brief:
   ```
   Objective:
   Acceptance criteria:
   Spec sections / IDs:
   Write paths (only these):
   Read-only paths:
   Interfaces/contracts to preserve:
   Required tests and commands:
   Report: WORKER COMPLETION REPORT (docs/workflow/MASTER_DEVELOPER_WORKFLOW.md §3)
   ```
7. **Review** the diff against the brief: paths respected, no unrelated changes, tests added.
8. **Verify personally:** run typecheck, tests and build; browser-check visible changes. The report is not evidence.
9. **Integrate**, then update progress (move the assignment to Completed with evidence), the checklist, and TD or ownership if changed.
