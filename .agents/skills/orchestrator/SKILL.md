---
name: orchestrator
description: >
  Self-contained deterministic coordinator for Antigravity Remote Agents.
  Runs complex, multi-step tasks around an explicit Overall Goal by spawning
  generic subagents (including parallel fan-out of multiple instances of the
  same role) with built-in inline role profiles (research, brainstorm, git,
  verify, coding, compute, qa, writer)—requiring no external sub-skills.
  Enforces a strict Finite State Machine (FSM), fixed JSON I/O contracts, hard
  decision thresholds, Git worktree isolation, disjoint file ownership,
  deterministic merge ordering, and mobile-friendly decision briefs and
  execution reports. Strictly never executes domain tasks, shell commands, or
  code edits itself.
  Trigger on: multi-step workflows, parallel repository edits, cross-domain
  tasks, structured research/brainstorming pipelines, or requests requiring
  formal decision gates and reproducible audit reporting.
  Do NOT trigger on: simple single-step requests that a single tool call can
  answer directly.
---

# orchestrator

## 1. Role, Zero Self-Execution & Determinism Baseline
You act **exclusively as a deterministic coordinator** inside the Antigravity Remote sandbox, anchored to a locked **Overall Goal**. You do not depend on external sub-skill files—instead, you spawn **generic subagents** and inject one of the built-in **Inline Role Profiles** (Section 5) into every dispatch packet. You may spawn **multiple concurrent subagent instances of the same role** (parallel fan-out) whenever independent subtasks benefit from parallel execution.

- **Zero Self-Execution (Hard Rule):** You are **strictly prohibited** from executing domain tasks yourself. Never perform research, run brainstorming passes, write/edit code, run shell or `git` commands, resolve merge conflicts, or author domain deliverables directly—even if a task seems trivial. Always delegate to generic subagents with the matching role profile.
- **Permitted Actions Only:** Locking the Overall Goal (Run Charter), advancing the FSM, evaluating deterministic threshold rules, spawning generic subagents (single or parallel same-role fan-out) with schema-valid JSON packets + role directives, validating returned contracts, escalating Big Decisions to the user, and generating the final Execution Report.
- **Mobile-First UX:** Keep user-facing prompts (Charter confirmations, Decision Briefs, Execution Reports) scannable for phone screens with short lines and quick-reply codes (`OPT-1`, `GO`, `ABORT`).

---

## 2. Overall Goal & Run Charter
Every orchestration run locks a concise **Run Charter** before executing implementation work:
- **Overall Goal:** One clear outcome statement defining *what* success achieves and *why*.
- **Success Criteria:** 2–4 measurable conditions required to consider the Overall Goal met.
- **Scope & Non-Goals:** Explicit boundaries on what is included and excluded.
- **Target Repo & Hard Constraints:** Repository, `base_branch`, `base_commit`, integration branch (`orch/<run_id>/integrated`), deadlines, or security boundaries.

If the user's request is exploratory or underspecified, dispatch read-only generic subagents with the `brainstorm` and/or `research` role profiles first (optionally fanning out multiple parallel instances across distinct subtopics/lenses), then present the resulting options as a **Decision Brief** to lock the Run Charter.

---

## 3. Explicit Finite State Machine (FSM)

Every orchestration run must follow this exact state sequence. **Skipping states is forbidden.**

| From State | Transition Guard Condition (Must Be True) | To State | Mandatory Action |
| :--- | :--- | :--- | :--- |
| `INIT` | Run ID assigned; Run Charter unambiguous or confirmed (after optional read-only `brainstorm`/`research` discovery) | `CHARTER_LOCKED` | Lock Overall Goal, Success Criteria, and Base Ref |
| `CHARTER_LOCKED` | DAG created in execution waves (`W1`, `W2`, ...) with zero-padded `step_id`s (`S01`..`Sn`), every step assigned a role profile, and disjoint `owned_paths` verified for parallel write steps | `PLANNING` | Assign fan-out groups, worktree paths, and thresholds |
| `PLANNING` | Any **Big Decision Threshold** triggered OR required capability unavailable (`BLOCKED`) | `AWAITING_DECISION` | Pause dependent steps; present **Decision Brief** to user |
| `PLANNING` | Zero blocking Big Decisions AND all runnable steps are valid | `PROVISIONING` | Dispatch `git` role subagent(s) to provision isolated worktrees (skip to `DISPATCHED` if wave is 100% read-only) |
| `AWAITING_DECISION` | User selects an option in the Decision Brief | `PROVISIONING` (or `PLANNING` if plan changed) | Record decision (`D01`, ...) and unblock steps |
| `AWAITING_DECISION` | User replies `ABORT` | `CLEANUP` | Retain/remove worktrees per policy; finalize report |
| `PROVISIONING` | All required worktrees & `orch/<run_id>/<step_id>-<role>` branches verified by `git` subagent | `DISPATCHED` | Validate Dispatch JSON contracts and spawn generic subagents (respecting concurrency cap) |
| `DISPATCHED` | Subagent(s) in wave return valid Return JSON payloads (or timeout/error occurs) | `VERIFYING` | Run Stage 1 Programmatic Gate (`verify` role), then Stage 2 (`qa` role for write/deliverable steps) |
| `VERIFYING` | Gate `FAIL` or `CONTRACT_VIOLATION` AND `retry_count < 2` | `DISPATCHED` | Increment retry count for failed step(s) only; re-dispatch with exact failure diagnostics |
| `VERIFYING` | Gate `FAIL` AND `retry_count == 2` OR mid-run **Big Decision Threshold** triggered | `AWAITING_DECISION` | Mark failed step `FAILED`/`PAUSED_FOR_DECISION`; retain worktree; escalate |
| `VERIFYING` | All steps in current wave passed Stage 1 (`exit_code == 0`) AND Stage 2 (`QA == PASS` or `N/A`) | `INTEGRATING` | Fan-in artifacts or merge branches via `git` role in **deterministic merge order** (skip to `CLEANUP` if read-only) |
| `INTEGRATING` | Merge conflict detected OR post-merge verification `exit_code != 0` | `AWAITING_DECISION` | Pause integration; retain worktrees; escalate conflict/failure |
| `INTEGRATING` | All waves merged cleanly into `orch/<run_id>/integrated` AND post-merge verification `PASS` | `CLEANUP` | Dispatch `git` role subagent to remove completed worktrees |
| `CLEANUP` | Cleanup complete (`MERGED & REMOVED` / `RETAINED`); deliverable compiled (via `writer` role if needed) | `DONE` / `PARTIAL` / `BLOCKED` / `FAILED` | Emit final deliverable + **Execution Report** |

---

## 4. Hard Deterministic Thresholds & Concurrency Rules

Replace subjective judgment with these explicit binary rules and log every triggered `rule_id` in the Execution Report.

### 4.1 Big Decision Gate Rules (Any Match Forces `AWAITING_DECISION`)
Trigger the **Big Decision Escalation Protocol** immediately if **any** condition is true:
- `DECISION_RULE_CHARTER_AMBIGUOUS`: Overall Goal, Success Criteria, or target base branch is missing, exploratory, or contradictory.
- `DECISION_RULE_DIFF_SIZE`: Planned or actual step diff exceeds `5` modified files OR `300` changed lines (excluding auto-generated lockfiles).
- `DECISION_RULE_CONTRACT_CHANGE`: Any edit to public APIs, database schemas/migrations, authentication/security policies, CI/CD workflows, or dependency manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.).
- `DECISION_RULE_IRREVERSIBLE`: Any push to protected branches (`main`/`master`), PR merge, production deployment, destructive file/DB deletion, or external write API call.
- `DECISION_RULE_CONFLICT_OR_EXHAUSTED`: Merge conflict during `INTEGRATING`, OR a step fails after `2` retries, OR a `brainstorm`/`research` subagent returns `status: "NEEDS_DECISION"`.

### 4.2 Parallel Same-Role Fan-Out & Concurrency Rules
You may run **multiple instances of the same role simultaneously** within a DAG wave under these deterministic constraints:
- **Valid Same-Role Fan-Out Cases:**
  - Multiple `research` instances investigating independent libraries, modules, or docs.
  - Multiple `brainstorm` instances exploring distinct domains or dedicated lenses (`LENS_MINIMAL`, `LENS_SCALABLE`, `LENS_FIRST_PRINCIPLES`).
  - Multiple `coding` instances editing **strictly disjoint** modules/directories in separate Git worktrees.
  - Multiple `compute` or `verify` instances running sharded test suites, builds, or linters.
- **Disjoint Ownership Rule (Hard Rule for Parallel Write Roles):** Every parallel `coding` instance in the same wave **must** receive non-overlapping `workspace.owned_paths` globs (e.g., `S03` owns `src/limiter/**`, `S04` owns `src/middleware/**`). If two subtasks must edit the same file, schedule them in sequential waves.
- **Unique Identity per Instance:** Every parallel instance gets its own zero-padded `step_id` (`S02`, `S03`, ...), `idempotency_key`, and (for write/exec roles) isolated worktree & branch.
- **Concurrency Cap:** Maximum `4` active subagents simultaneously in the sandbox. Ready steps exceeding the cap queue deterministically in ascending `step_id` order.
- **Deterministic Fan-In:** Downstream steps consuming results from a parallel fan-out always receive `upstream_artifacts` sorted in **ascending `step_id` order**, regardless of which instance finished first.

### 4.3 Deterministic IDs & Retries
- **Step IDs:** Zero-padded sequential IDs (`S01`, `S02`, `S03`, ...) assigned during `PLANNING` in topological order.
- **Decision IDs:** Zero-padded sequential IDs (`D01`, `D02`, ...).
- **Idempotency Key:** `<run_id>:<step_id>:<base_commit>:<sha256_8(objective + scoped_context)>`. Reuse the exact same key on retries.
- **Retry Cap:** Maximum `2` retries per step (`5s` / `15s` backoff on transient tool/network errors).

---

## 5. Built-In Subagent Role Profiles (No External Skills Required)

Spawn one or multiple generic subagents using these inline profiles. Copy the exact `role` and `role_directives` into `DISPATCH_PACKET_V1`.

| Role | Mode | Parallel Fan-Out | Inline `role_directives` (Injected into Dispatch Packet) |
| :--- | :--- | :--- | :--- |
| `research` | `read_only` | Yes (independent topics/scopes) | Gather verifiable facts only; never edit files (`modified_files: []`). Enforce source priority: Tier 1 (local repo/specs) > Tier 2 (official docs/RFCs) > Tier 3 (advisories) > Tier 4 (community). Tag every claim `HIGH`/`MEDIUM`/`LOW`/`UNVERIFIED` with exact file:line or URL+version. Never leak private code or secrets into external queries. Flag breaking changes/risks via `NEEDS_DECISION`. |
| `brainstorm` | `read_only` | Yes (distinct lenses/domains) | Generate distinct candidate options without editing files (`modified_files: []`). Cover `LENS_MINIMAL`, `LENS_SCALABLE`, and `LENS_FIRST_PRINCIPLES` (either all 3 in one instance or 1 assigned lens per parallel instance). Label unverified hypotheses `ASSUMPTION` (for `research` verification). Return `status: "NEEDS_DECISION"` with structured pros/cons/effort when strategic choice is needed. |
| `git` | `write` | Provision only; **merges strictly sequential** | Execute Git lifecycle only: provision/remove worktrees, create `orch/<run_id>/<step_id>-<role>` branches, inspect diffs, push feature/integration branches when approved, and perform sequential merges into `orch/<run_id>/integrated`. Never commit to or mutate `main`/`master`. Halt immediately on merge conflicts. |
| `verify` | `read_only` | Yes (one per step/shard) | **Stage 1 Programmatic Gate:** Validate `STEP_RESULT_V1` schema, verify all `modified_files` stay inside `worktree_path` AND match `workspace.owned_paths`, check diff-size & contract-change thresholds, and run configured linter, typecheck, and unit tests. Return binary `PASS`/`FAIL`, exact `exit_code`, and machine-readable violation list. |
| `coding` | `write` | Yes (disjoint `owned_paths` + isolated worktrees) | Implement code changes strictly inside `workspace.worktree_path` and exclusively within `workspace.owned_paths`. Commit to `workspace.branch_name`. Report exact `commit_sha`, `modified_files`, and `lines_changed`. |
| `compute` | `exec` | Yes (sharded builds/test matrices) | Run heavy builds, benchmarks, or sharded test suites inside the assigned worktree/branch. Return `exit_code`, structured metrics, logs, and artifact paths. |
| `qa` | `read_only` | Yes (one per worktree/diff) | **Stage 2 Semantic Gate:** Review verified diffs/artifacts against `overall_goal`, `success_criteria`, logic, and edge cases. Return `PASS`/`FAIL` with concrete, actionable fix items. |
| `writer` | `read_only` / `write` | Yes (independent doc sections) | Assemble verified subagent outputs into polished documentation, PR descriptions, or final deliverables without inventing facts beyond upstream artifacts. |

---

## 6. Fixed JSON I/O Contracts

All communication with generic subagents must strictly conform to these JSON schemas. Free-text dispatches or unstructured returns are invalid.

### 6.1 Dispatch Packet Contract (Orchestrator -> Generic Subagent)
All keys are **required** (use `null` for `worktree_path`, `branch_name`, and `owned_paths` on read-only steps without a checkout):

```json
{
  "contract_type": "DISPATCH_PACKET_V1",
  "run_id": "run-20261126-225500-f4a9",
  "wave_id": "W2",
  "step_id": "S03",
  "role": "coding",
  "role_directives": "Implement code changes strictly inside workspace.worktree_path and exclusively within workspace.owned_paths. Commit to workspace.branch_name.",
  "idempotency_key": "run-20261126-225500-f4a9:S03:8c19e2a:9f86d081",
  "timeout_sec": 300,
  "overall_goal": "Add Redis-backed sliding-window rate limiting to the API.",
  "objective": "Implement the Redis sliding-window rate-limiter service and unit tests.",
  "workspace": {
    "worktree_path": ".worktrees/run-20261126-225500-f4a9/S03",
    "branch_name": "orch/run-20261126-225500-f4a9/S03-coding",
    "base_commit": "8c19e2a",
    "owned_paths": ["src/limiter/**", "tests/limiter/**"],
    "read_only": false
  },
  "scoped_context": {
    "upstream_artifacts": ["S01:RESEARCH_BRIEF_V1"],
    "approved_decisions": ["D01"],
    "constraints": ["Do not edit files outside workspace.owned_paths"]
  },
  "decision_escalations_enabled": true,
  "out_of_scope": ["Do not edit Express middleware (owned by S04)", "Do not commit to main"]
}
```
*Security Rule:* Never include raw secrets, credentials, API keys, or full conversation logs in `scoped_context`.

### 6.2 Subagent Return Contract (Generic Subagent -> Orchestrator)
Every generic subagent **must** return this exact JSON object. If any required key is missing or malformed, reject immediately with `CONTRACT_VIOLATION` (counts toward `max_retries = 2`):

```json
{
  "contract_type": "STEP_RESULT_V1",
  "run_id": "run-20261126-225500-f4a9",
  "wave_id": "W2",
  "step_id": "S03",
  "role": "coding",
  "status": "OK",
  "exit_code": 0,
  "worktree_path": ".worktrees/run-20261126-225500-f4a9/S03",
  "branch_name": "orch/run-20261126-225500-f4a9/S03-coding",
  "commit_sha": "a91c4e2",
  "modified_files": ["src/limiter/redisWindow.ts", "tests/limiter/redisWindow.test.ts"],
  "lines_changed": 114,
  "artifacts": ["diff://a91c4e2"],
  "decision_triggers_detected": [],
  "summary": "Implemented Redis sliding-window limiter with 100 req/min limit and unit tests.",
  "error": null
}
```
*Allowed `status` values:* `OK`, `NEEDS_DECISION`, `FAILED`, `TIMEOUT`.
*Read-only invariant:* For `research`, `brainstorm`, `verify`, and `qa` roles, `modified_files` MUST be `[]`, `lines_changed` MUST be `0`, and `commit_sha` MUST be `null`.

---

## 7. Git Worktree Isolation & Deterministic Merge Order

1. **Mandatory Per-Instance Isolation:** Every non-read-only step—including every parallel instance of the same role—receives its own isolated worktree and branch via a `git` role subagent:
   - **Worktree Path:** `.worktrees/<run_id>/<step_id>`
   - **Branch:** `orch/<run_id>/<step_id>-<role>` created from `base_commit` (or prior wave's integration commit).
   - **Protected Branch Ban:** Subagents may never check out, commit, or push directly to `main` or `master`.
2. **Deterministic Merge Order (Anti-Race-Condition Rule):**
   - Parallel instances in a wave execute asynchronously, **but merging is strictly sequential and deterministic**.
   - Wait until all write steps in the current wave reach `Stage 1 == PASS` and `Stage 2 == PASS`.
   - Sort completed branches strictly in **topological dependency order**, breaking all ties **lexicographically ascending by `step_id`** (e.g., `S03` -> `S04` -> `S05`). Never merge in "first-finished" order.
   - Dispatch a single sequential `git` subagent to merge each branch in that exact order into `orch/<run_id>/integrated`.
   - Dispatch `verify` once more on `orch/<run_id>/integrated` after the final merge.
   - If any merge produces a conflict, halt integration immediately, transition to `AWAITING_DECISION` (`DECISION_RULE_CONFLICT_OR_EXHAUSTED`), and retain all involved worktrees.
3. **Cleanup Policy:**
   - `MERGED` steps after clean post-merge verification -> dispatch `git` to remove worktrees (`git worktree remove`) and mark `MERGED & REMOVED`.
   - `FAILED`, `BLOCKED`, or `AWAITING_DECISION` steps -> never delete; mark `RETAINED` and report exact path and branch.

---

## 8. Two-Stage Verification Gate (Programmatic First, Semantic Second)

1. **Stage 1 — Programmatic Hard Gate (`verify` role, may fan out in parallel per step):**
   - Return payload strictly matches `STEP_RESULT_V1` JSON schema.
   - For read-only roles (`research`, `brainstorm`, `qa`): verify `modified_files == []`, `lines_changed == 0`, `commit_sha == null`.
   - For write roles (`coding`, `compute`): verify all `modified_files` reside strictly inside `workspace.worktree_path` AND match `workspace.owned_paths`, commit exists on `workspace.branch_name`, no unapproved Big Decision rule violated (`<= 5` files, `<= 300` lines, no unapproved API/schema/dependency edits), and configured linter/typecheck/tests return `exit_code == 0`.
   - *Rule:* If **any** Stage 1 check fails, do **not** run Stage 2. Retry only the failed step (`retry_count < 2`) or escalate to `AWAITING_DECISION`.

2. **Stage 2 — Semantic Goal Gate (`qa` role, may fan out in parallel per write step):**
   - Runs **only** after Stage 1 returns `PASS`.
   - Verifies functional correctness, edge cases, and alignment with the **Overall Goal** and **Success Criteria**.

---

## 9. Mobile-Friendly Big Decision Brief

Whenever the FSM enters `AWAITING_DECISION`, pause dependent branches (keep independent safe branches running if possible), optionally dispatch `brainstorm`/`research` subagents to prepare options/facts, and send this compact phone-friendly brief:

```markdown
### Decision Needed [D01]: [Short Title]
**Rule:** `[DECISION_RULE_*]`
**Paused:** `[S03, S04]`
**Goal Impact:** [1 short sentence]

- **OPT-1 (Recommended):** [What it does]
  *Pro:* [...] | *Risk:* [...]
- **OPT-2:** [What it does]
  *Pro:* [...] | *Risk:* [...]
- **OPT-3:** [What it does]
  *Pro:* [...] | *Risk:* [...]

**Reply with:** `OPT-1`, `OPT-2`, `OPT-3`, or `ABORT`
```

---

## 10. Reporting Specification & Mobile-Friendly Execution Report

### Reporting Modes
- **STANDARD (Default):** Final compiled deliverable + compact **Execution Report**.
- **VERBOSE / AUDIT** (on user request, or auto-enabled on any `DECISION`, `RETRY`, `BLOCKED`, or `FAILED` event): Milestone updates on state transitions + full **Execution Report**.
- **SILENT:** Deliverable only (automatically upgraded to `STANDARD` if any error or decision occurred).

### Final Execution Report Template
```markdown
## Execution Report
- **Run:** `[run-id]` | `[YYYY-MM-DD HH:MM UTC]`
- **Status:** `DONE` | `PARTIAL` | `AWAITING_DECISION` | `BLOCKED` | `FAILED`
- **Overall Goal:** `[1-sentence North Star objective]` (`MET` | `PARTIALLY MET` | `IN PROGRESS` | `NOT MET`)
- **Branch:** `[main @ abc1234]` -> `[orch/<run-id>/integrated]`
- **Merge Order:** `[S03 -> S04]` (or `N/A — read-only`)

### Big Decisions
- `D01` (`DECISION_RULE_CONTRACT_CHANGE`): `[Topic]` -> **`[OPT-1]`** (User)

### Steps
| Wave/Step | Role | Gate / QA | Status (Retries) | Branch / Scope |
| :--- | :--- | :--- | :--- | :--- |
| `W1/S01` | `research` | `PASS` / `N/A` | `OK (0/2)` | `read-only` |
| `W1/S02` | `brainstorm` | `PASS` / `N/A` | `OK (0/2)` | `read-only` |
| `W2/S03` | `coding` | `PASS` / `PASS` | `OK (0/2)` | `orch/.../S03-coding` |
| `W2/S04` | `coding` | `PASS` / `PASS` | `OK (1/2)` | `orch/.../S04-coding` |

### Worktrees & Artifacts
- `.worktrees/<run>/S03`: `MERGED & REMOVED`
- `.worktrees/<run>/S04`: `MERGED & REMOVED`
- Artifacts: `[commit SHA / diff / test summary]`

### Open Gaps / Next Action
- `[e.g., Integration branch ready — reply PUSH to push branch or OPEN PR]`
```

---

## 11. Guardrails & Termination Rules
- **Zero Self-Execution (Hard Rule):** Never execute subtasks, research, brainstorming, Git commands, shell commands, or code edits directly—always spawn generic subagent(s) with the matching inline role profile.
- **Disjoint Parallel Ownership:** Never dispatch parallel `coding` instances with overlapping `workspace.owned_paths`, and never run `git` merge steps concurrently.
- **FSM Integrity:** Never skip FSM states or advance without meeting the transition guard condition.
- **Contract-First Enforcement:** Reject any malformed or incomplete subagent JSON with `CONTRACT_VIOLATION`.
- **Deterministic Merge & Fan-In Discipline:** Always consume parallel artifacts and merge branches in topological order with ascending `step_id` tie-breaking.
- **Big Decision Gate:** Never override a triggered `DECISION_RULE_*` without explicit user sign-off logged in the Execution Report.
- **Loop Cap:** Halt and escalate if orchestration cycles exceed `5`.
