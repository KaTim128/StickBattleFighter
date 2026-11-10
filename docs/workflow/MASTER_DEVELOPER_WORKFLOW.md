# MASTER DEVELOPER WORKFLOW

How the Master Developer (primary session) and the ten specialists collaborate. Based on Playbook §2, §9, §13 and §16, and the owner's initialisation instruction.

## 1. Lifecycle of every task

```
Requirement analysis → Planning → Dependency and conflict check → Assignment
      → Implementation → Code review → Integration → Verification (Master runs it)
      → Documentation updates → Progress tracking → Commit
```

### 1.1 Requirement analysis
- Identify the spec IDs (REQ, INV, OQ) involved. If any OQ blocks it, stop and ask the owner.
- Inspect the **current code and assets** for the affected systems before proposing changes. Prefer extending working systems over rewriting them.

### 1.2 Planning
- Write acceptance criteria (observable behaviour plus tests) **before** any edit.
- Decide whether to delegate. Delegate only for specialist knowledge, a well-bounded component, or to keep large research and logs out of the main context. The Master keeps cross-system integration.

### 1.3 Dependency and conflict check (mandatory before assigning)
1. Look up the owner of every touched path in `SYSTEM_OWNERSHIP.md`.
2. Check the **Active Assignments** table in `DEVELOPMENT_PROGRESS.md`. If any path is already assigned, **do not** assign overlapping work. Sequence it instead.
3. Check whether a cross-system contract is needed. If the contract does not exist, the Master defines it first (in `src/core/` types or a doc), then assigns.
4. Shared config files (`package.json`, tsconfig, build config) are edited **only by the Master**.

### 1.4 Assignment
Use the skill `/assign-specialist`. Every assignment includes:
1. Exact objective and acceptance criteria.
2. Relevant spec sections and IDs.
3. Permitted paths (write) and read-only paths.
4. Interfaces and contracts to preserve.
5. Required tests and commands.
6. The report format (§3 below).

Record the assignment in the Active Assignments table **before** delegating.

### 1.5 Implementation (specialist)
Specialists read `CLAUDE.md`, the relevant rules and spec sections, inspect existing code, stay inside their permitted paths, add tests, and report. If they need a change outside their boundary, they **stop and report it** rather than editing.

### 1.6 Code review
- The Master reviews the diff against the acceptance criteria.
- For milestone-level or risky changes, the Master runs `qa-specialist` (read only) and, for architectural impact, `stickman-architect` (read only).

### 1.7 Integration
The Master merges the work into the shared systems, resolves interface mismatches, and **never accepts two conflicting implementations**. Conflicts between specialists are resolved by the Master, using the spec and TD log. Material conflicts get a new TD entry.

### 1.8 Verification (non-negotiable)
The Master personally runs typecheck, tests and build, and for visible or interactive changes, launches the app and checks it in a browser (screenshots, console). **A specialist's completion report is not evidence.**

### 1.9 Documentation and progress
Update `DEVELOPMENT_PROGRESS.md` (move the assignment to Completed with evidence), `TESTING_CHECKLIST.md`, `TECHNICAL_DECISIONS.md` (if the architecture changed), and the ownership registry (if boundaries changed). Commit with a clear message.

## 2. Parallel work rules (Playbook §9.2)

| Allowed in parallel | Never in parallel |
|---|---|
| Read-only audits of different subsystems | Two specialists editing the same controller, state machine or file |
| Implementation in disjoint owned paths with a stable contract | Changes to package config or shared types at the same time |
| Backend schema design alongside a security review | Incompatible database migrations |
| Test-module work alongside unrelated asset investigation | Rewriting a system another specialist depends on mid-task |

## 3. Specialist report format (Playbook §9.3)

```
WORKER COMPLETION REPORT
Assigned objective:
Relevant requirements:
Files inspected:
Files created or changed:
Implementation summary:
Tests executed and results:
Build result:
Browser or visual verification:
Known limitations:
Integration requirements:
Risks or follow-up tasks:
```

## 4. Conflict resolution
1. Spec (latest explicit instruction) → 2. accepted TD entries → 3. invariants → 4. the Master's decision, recorded as a new TD. When the owner's intent is unclear, ask; do not guess.

## 5. Session management (Playbook §16, §18)
- Start: read `CLAUDE.md`, the spec (relevant parts), progress, roadmap, decisions and checklist; check `git status`; identify the last verified milestone and the exact next task. Do not repeat completed work.
- During: keep the context lean. Delegate high-volume research and log reading.
- End: run `/session-checkpoint`.

## 6. Reference research
Use `/reference-observation` when a milestone benefits from reference study. The Master decides adoption (Playbook §4.4).
