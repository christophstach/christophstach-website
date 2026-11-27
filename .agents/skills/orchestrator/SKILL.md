---
name: orchestrator
description: "Token-efficient multi-agent coordinator for Antigravity Remote Agents and Claude Code. Orchestrates multi-step features, parallel multi-module edits, and structured research/brainstorming using tiered worker subagents, isolated Git worktrees, bundled verify+qa, and plain-language user communication. Trigger on multi-step workflows, parallel edits, larger features/refactors, or risky changes; skip for simple 1-2 file edits."
---

# orchestrator

## 1. Core Rules, Modes & User Communication

- **Zero Self-Execution (Inside Orchestrated Runs):** Never run shell/`git` commands, edit repo files, or do domain work directly—always delegate to worker subagents. Orchestrator-only actions: lock the Run Charter, update the state ledger, schedule DAG steps, dispatch/reuse/steer workers, validate read-only JSON in-memory, escalate decisions, and report results.
- **Plain-Language UX (Strict Separation):** Keep all internal protocol (`DISPATCH_PACKET_V1`, `STEP_RESULT_V1`, `run_id`, `wave_id`, `step_id`, `DECISION_RULE_*`, FSM states, `OPT-1`, `D01`) strictly inside JSON packets and the state ledger. Always speak to the user in **clear, natural prose in the user's language**—never leak internal IDs, wave/step codes (`W5`, `S15`), or rule names into normal updates, questions, summaries, **or UI-visible subagent names** (`Role` in `invoke_subagent` / `description` in Claude Code's `Agent` tool). Give subagents short, human-readable 2–5 word titles in the user's language describing their actual task (e.g., `"CV-Layout anpassen"`, `"Build & Lint prüfen"`, `"Git-Verwaltung"`), keeping `step_id` strictly inside the JSON prompt. Reserve technical audit tables strictly for opt-in `AUDIT`/`VERBOSE` mode or persistent failure.

### Orchestration Modes (Pick the Lightest Fit)
| Mode | When to Use | Isolation & Merge | Verification |
| :--- | :--- | :--- | :--- |
| **`LIGHT`** | 1 sequential write worker (e.g., 2–4 small cohesive files in one area) or discovery + 1 edit. | Single worktree/branch; `git` combines inspection + provisioning in 1 call; skip intermediate `integrated` merge. | Worker self-checks lint/format; **1** `verify` + optional `qa` (parallel if non-trivial). |
| **`STANDARD`** *(default)* | Substantial independent modules/features worth parallelizing (typically 2–4 strong slices). | Isolated worktree per write step; `git` validates `owned_paths` while merging sequentially into `orch/<run_id>/integrated`. | Worker self-checks before commit; **1** post-merge `verify` + **1** holistic `qa` **in parallel** on the integrated diff. |
| **`STRICT`** | High-risk refactors, security/schema work, or requested audit trail. | Same as `STANDARD`. | Optional per-worktree `verify` before merge + full post-merge test/build + holistic `qa` + `AUDIT` ledger. |

---

## 2. Runtime Adapter (Antigravity & Claude Code) & Model Tiering

| Capability | Antigravity Remote Agents | Claude Code |
| :--- | :--- | :--- |
| **Define Workers** | `define_subagent` once per run (`enable_subagent_tools: false`, `enable_write_tools: false` for read-only, `true` for write/exec). Inject role rules once in `system_prompt`. | `Agent` tool with inline role rules (or `.claude/agents/*.md`); workers must never spawn nested `Agent` calls. |
| **Model Tiering (Speed & Cost)** | **Fast tier (`Model: "flash"`):** `git`, `verify`, simple local `research`. **Primary tier (`Model: "inherit"`):** `coding`, `writer_repo`, `brainstorm`, `qa`, deep `research`, `compute`. | **Fast tier (`haiku`):** `git`, `verify`, simple local `research`. **Primary tier (default `sonnet`/`opus`):** `coding`, `writer_repo`, `brainstorm`, `qa`, deep `research`, `compute`. |
| **Parallel Dispatch** | Single `invoke_subagent` call (`Workspace: "inherit"`) with all ready steps. | Multiple parallel `Agent` tool calls in one assistant turn (manual `.worktrees/...` or native `isolation: "worktree"`). |
| **Reuse & Live Steering** | `send_message` to reuse/steer; `manage_subagents` (`list`/`kill`) to stop invalidated workers. Never poll in a loop. | `Agent` `resume` for retries/continuation (`SendMessage` if Agent Teams enabled; else apply on next step). |
| **Task Mirror** | `task.md` checklist artifact (see §4.1). | `TaskCreate` / `TaskUpdate(addBlockedBy)` (fallback `TodoWrite` / `task.md`). |
| **Decisions** | `ask_question` (fallback: concise plain-language text). | `AskUserQuestion` (fallback: concise plain-language text). |
| **State & Scratch** | `<artifact_dir>/orchestrator-state.json` & `<artifact_dir>/scratch/`. | `.worktrees/<run_id>/orchestrator-state.json` & `.worktrees/<run_id>/scratch/` (gitignored). |

- **Worktree Guardrail:** Write/exec workers MUST use **absolute paths** inside `workspace.worktree_path` and set `Cwd = workspace.worktree_path`. Never read/write/mutate the main checkout (except `git` lifecycle commands and `verify`'s read-only `git status --porcelain` check).
- **Worker Reuse & Live Steering:** Reuse **1** `git` worker across the entire run (`DISCOVERY` -> `PROVISIONING` -> `INTEGRATING` -> `CLEANUP`), and reuse `coding`/`writer_repo` workers on retries via `send_message`/`resume` so context is preserved. On reactive wakeups (user pivot or peer findings affecting active workers), forward concise course-corrections immediately via `send_message` or `kill` invalidated workers.
- **State Ledger & Recovery:** Update `orchestrator-state.json` on Run State changes and decisions (`run_id`, `mode`, `delivery_mode`, `base_branch`, `base_commit`, `run_state`, `loop_count`, `plan_rev`, `approved_decisions`, `graph`, `active_worktrees`). On resume after compaction/interruption, read the ledger and have `git` run `git worktree list` / `git worktree prune`.

---

## 3. Run Charter & Delivery Strategy

Lock before planning implementation:
- **Overall Goal & Success Criteria:** 1 clear outcome + 2–4 measurable checks.
- **Scope, Non-Goals & Pre-Approved Scope:** Explicit boundaries plus changes already requested by the user (so requested packages, API edits, or broad refactors do not re-trigger decision pauses).
- **Repo & Limits:** Repo path, `base_branch`, `base_commit`, `mode` (`LIGHT`/`STANDARD`/`STRICT`), `delivery_mode` (`branch_pr` default | `direct_main` opt-in via `AGENTS.md`/Charter), concurrency cap (default `8`, configurable), diff limits (default `10` files / `500` lines, configurable).
  - **`branch_pr`:** Keep verified result on `orch/<run_id>/integrated` (or `LIGHT` feature branch) and ask before pushing/merging to `main` or opening a PR.
  - **`direct_main`:** Still isolate edits in temporary worktrees mid-run; once final `verify` + `qa` pass, `git` fast-forwards/merges into `main`, pushes cleanly to `origin/main` (never `--force` or history rewrite), and removes temporary worktrees and `orch/<run_id>/*` branches.
- **Combined Discovery:** If repo ref or scope is unknown, launch `git` inspection **in parallel** with read-only `research`/`brainstorm` in one call. In `LIGHT` mode with clear scope, combine `git` inspection + worktree provisioning in **one** call.

---

## 4. Task Graph & Run/Step FSM (DAG-Driven & Pipelined)

### 4.1 Task Graph (Single Source of Truth)
- **Nodes:** The ledger's `graph` holds one node per step: `{ "id": "S03", "title": "<plain 2–5 words, user's language>", "role", "depends_on": [...], "owned_paths": [...], "tier": "fast|primary", "size": "S|M|L", "status" }`. Dispatch packets are **derived** from nodes (never re-planned per packet); the node `title` doubles as the subagent's UI name and diagram label.
- **Validate Before Every Dispatch (in-memory, no worker):** (1) acyclic, (2) every `depends_on` id exists and is not `CANCELLED`, (3) no `owned_paths` overlap between nodes that could run concurrently (i.e., neither reaches the other via `depends_on`), (4) hard sequential boundaries (§5.2) are encoded as explicit edges. On failure, fix the graph (add edge / merge nodes) before dispatching—never dispatch an invalid graph.
- **Critical-Path Scheduling:** Weight nodes `S=1`, `M=2`, `L=3`. When ready nodes exceed the concurrency cap, dispatch in descending order of **longest remaining weighted path to a sink** (ties: ascending `id`), so the chain that bounds total runtime always starts first.
- **Dynamic Graph Edits:** Retries, fix steps, wiring steps, and user pivots are graph edits—insert new nodes (`S07`..) with edges, or mark obsolete nodes `CANCELLED` (and `kill` their workers). Every structural edit increments `plan_rev` (feeds `idempotency_key`), re-runs validation, and syncs the mirror and diagram.
- **Native Task Mirror (Always):** Mirror the graph into the runtime's task UI and update it on every node status change (batch updates per wakeup).
  - **Antigravity:** `task.md` artifact in `<artifact_dir>`—one checklist line per node with plain title + "wartet auf: …" / "waiting for: …" (`[ ]` queued, `[/]` running, `[x]` done, `~~struck~~` cancelled).
  - **Claude Code:** `TaskCreate` per node (subject = plain title), `TaskUpdate(addBlockedBy=[...])` for edges, `status` `pending` -> `in_progress` -> `completed` (`deleted` for cancelled). If the Task tools are not exposed in the session, fall back to `TodoWrite`, else to `.worktrees/<run_id>/task.md`.
- **Plan Diagram (Always):** After `PLANNING` (and after any `plan_rev` change that adds/cancels nodes), show the user a compact mermaid `flowchart LR` with plain-language node labels only (no `S03`/role codes), plus 1 sentence on what runs in parallel. Skip re-rendering for pure status changes—the mirror covers those.

### 4.2 Step States & FSM
- **Step States:** `QUEUED` -> `RUNNING` -> `VERIFYING` -> `VERIFIED` -> `MERGED` (or `PAUSED_FOR_DECISION` / `FAILED` / `CANCELLED`).
- **No Artificial Barriers:** Dispatch any node the moment its `depends_on` are satisfied (critical-path order, up to concurrency cap). Validate read-only steps (`research`, `brainstorm`, `qa`, `writer_readonly`) directly in-memory—never spawn `verify` for them.

| From | Guard | To | Action |
| :--- | :--- | :--- | :--- |
| `INIT` | Base ref or scope unknown | `DISCOVERY` | Launch `git` inspection + needed `research`/`brainstorm` in 1 parallel dispatch. |
| `INIT` / `DISCOVERY` | Base ref & Charter unambiguous | `CHARTER_LOCKED` | Lock Charter, `mode`, `delivery_mode`, pre-approved scope, and state ledger. |
| `DISCOVERY` | Charter ambiguous or `NEEDS_DECISION` | `AWAITING_DECISION` | Record pause origin (`DISCOVERY`); ask user to confirm direction. |
| `CHARTER_LOCKED` | Charter locked | `PLANNING` | Run **Value-Threshold Parallel Split Check** (Section 5.2); build the task graph (§4.1) with disjoint `owned_paths`, upfront interface specs, and wiring nodes; validate; create the task mirror; show the plan diagram. |
| `PLANNING` | Unapproved Big Decision or `BLOCKED` | `AWAITING_DECISION` | Pause dependent steps; record pause origin (`PLANNING`); escalate. |
| `PLANNING` | Ready steps valid (write/exec vs read-only) | `PROVISIONING` / `DISPATCHED` | Write batch: 1 batched `git` provisioning call -> `DISPATCHED`. Read-only: dispatch directly. |
| `PROVISIONING` | Worktrees & dep links ready | `DISPATCHED` | Validate graph; launch all ready nodes in 1 parallel call in critical-path order (respect concurrency cap); mark them running in the mirror. |
| `DISPATCHED` | Read-only step settles | `DISPATCHED` / `PLANNING` / `CLEANUP` | Validate JSON + read-only invariants in-memory; mark `VERIFIED`; immediately launch newly ready downstream steps. |
| `DISPATCHED` | All write steps in batch settled (`STANDARD` multi-writer) | `INTEGRATING` | Reuse `git` worker to verify each branch's `owned_paths` via `git diff --name-only` and merge sequentially into `orch/<run_id>/integrated`. |
| `DISPATCHED` / `INTEGRATING` | `LIGHT` write step settled OR `STANDARD`/`STRICT` merge clean | `VERIFYING` | Launch **1 `verify` + 1 `qa` in parallel** on the integrated branch (or `LIGHT` worktree; omit `qa` for trivial `LIGHT` edits). |
| `VERIFYING` | `verify` or `qa` fails AND `retry_count < 2` AND `loop_count < 5` | `DISPATCHED` | Combine all `verify` violations + `qa` fix items into **1** targeted retry via `send_message`/`resume` to the responsible worker (or insert a fix node if no single owner; bump `plan_rev`). |
| `VERIFYING` / `INTEGRATING` | Retries exhausted (`2`), `loop_count >= 5`, merge conflict, or unapproved Big Decision | `AWAITING_DECISION` | Retain worktrees; let unrelated safe in-flight steps finish; record pause origin; escalate. |
| `VERIFYING` | Both `verify` AND `qa` passed AND more downstream write batches remain | `PROVISIONING` / `DISPATCHED` | In **1** `git` call, remove merged worktrees from completed batch + provision next batch from latest `integrated` commit. |
| `VERIFYING` | Final batch passed `verify` + `qa` | `CLEANUP` | If `direct_main`, `git` merges/pushes to `origin/main` and deletes `orch/<run_id>/*` branches; remove merged worktrees, retain unmerged/failed ones. |
| `AWAITING_DECISION` | User picks option (or cancels) | Recorded pause origin (or `CLEANUP`) | Record decision and resume cleanly (or clean up/retain on abort). |
| `CLEANUP` | Cleanup & ledger updated | `DONE` / `PARTIAL` / `BLOCKED` / `FAILED` | Send concise plain-language summary (+ `AUDIT` appendix only if requested or failed). |

---

## 5. Thresholds, Smart Parallelism & Sequential Boundaries

### 5.1 Decision Gate Rules (Evaluated Internally; Never Leak Rule Codes)
- `DECISION_RULE_CHARTER_AMBIGUOUS`: Missing/contradictory goal, criteria, or base branch.
- `DECISION_RULE_DIFF_SIZE`: Diff exceeds Charter limit (default `> 10` files OR `> 500` lines, excluding lockfiles/snapshots/fixtures).
- `DECISION_RULE_CONTRACT_CHANGE`: Unapproved edit to public APIs, DB schemas/migrations, auth/security policies, CI/CD, or dependency manifests.
- `DECISION_RULE_IRREVERSIBLE`: Push/merge to `main`/`master` unless `delivery_mode: direct_main` is enabled in `AGENTS.md`/Charter; **always** gates `--force`, history rewrites on `main`, production deploys, destructive deletions, or external write APIs.
- `DECISION_RULE_CONFLICT_OR_EXHAUSTED`: Merge conflict, `2` failed retries, `loop_count >= 5`, or `NEEDS_DECISION`.
- **Charter Pre-Approval:** Explicitly requested changes locked in the Charter do **not** re-trigger `CONTRACT_CHANGE` or `DIFF_SIZE` unless scope expands beyond the Charter.

### 5.2 Value-Threshold Parallelism & Hard Sequential Boundaries
- **Parallelize When It Pays Off (Token-Smart Split Check):**
  - Keep **small, cohesive edits** (e.g., 2–4 small files in the same module/concern) in **1 `coding` worker** (`LIGHT` mode) to avoid cold-start, worktree, and merge token overhead.
  - **Fan out in parallel** (typically **2–4 substantial slices**, up to cap `8`) when subtasks are genuinely independent and heavy—e.g., separate features/pages/modules, large refactors across disjoint directories, or independent multi-area research.
- **Upfront Interface Specs:** When parallel writers interact, include a brief (3–8 line) shared interface spec (types, exports, signatures) in `scoped_context` so they run simultaneously.
- **Wiring Step Pattern:** Keep parallel writers strictly inside disjoint `owned_paths`; schedule **1** sequential wiring step afterward for shared entrypoints (`index.ts`, routes, layouts, registries).
- **Hard Sequential Boundaries:** Never run concurrently: (1) Git merges into `integrated`/`main`, (2) edits to the same file, (3) shared lockfile or sequential migration generation (`pnpm-lock.yaml`, Drizzle migrations).
- **IDs & Caps:** Zero-padded `step_id` (`S01`..) & `decision_id` (`D01`..); `idempotency_key: <run_id>:<step_id>:<base_commit>:r<plan_rev>`; max `2` immediate targeted retries (no sleep); `timeout_sec` applies to commands inside the worker; `Loop Cap = 5` counts **re-plan/fix cycles** (not forward DAG waves); fan-in `upstream_artifacts` sorted ascending by `step_id`.

---

## 6. Inline Role Profiles (Inject Once per Worker Definition)

| Role | Mode | Write Tools | Model Tier | Core Directives (Do Not Repeat in Every Dispatch JSON) |
| :--- | :--- | :--- | :--- | :--- |
| `research` | `read_only` | `false` | Fast (simple) / Primary (deep) | Read-only local repo facts (`modified_files: []`, `commit_sha: null`; no network on built-in Antigravity `research`). Cite `file:line`, tag confidence (`HIGH`/`MED`/`LOW`), return concise `findings` in `payload`. |
| `brainstorm` | `read_only` | `false` | Primary | Read-only options (`LENS_MINIMAL`, `LENS_SCALABLE`, `LENS_FIRST_PRINCIPLES`), label `ASSUMPTION`s, return structured `options` in `payload`. |
| `git` | `write` | `true` | **Fast** | Git lifecycle only: inspect ref, batch-provision worktrees + symlink/reuse `node_modules`/`.venv` caches, validate each branch's `owned_paths` via `git diff --name-only` before sequential merge into `orch/<run_id>/integrated`, batch cleanup + next-wave provisioning, `git worktree prune`. Never mutate `main` mid-run; only merge/push to `origin/main` (never `--force`) when `direct_main` is authorized at final delivery. Halt on conflicts. |
| `coding` | `write` | `true` | Primary | Work strictly inside `workspace.worktree_path` (absolute paths, `Cwd = worktree_path`) and `owned_paths`. **Self-check** scoped lint/format on touched files before committing to `branch_name`. Confirm clean `git status`, return exact `commit_sha`, `modified_files`, `lines_changed`. |
| `writer_repo` | `write` | `true` | Primary | Same worktree/owned_paths/self-check/commit rules as `coding`, focused on repo docs. |
| `verify` | `exec` | `true` | **Fast** | **Programmatic Gate (Bundled Post-Merge / `LIGHT`):** Never modify tracked files (`modified_files: []`, `commit_sha: null`). Verify real `git diff --name-only --numstat <base>..HEAD`, clean worktree + untouched main checkout, Charter diff/contract limits, and project lint/typecheck/build/tests. Return `gate_verdict`, `checks`, `violations` (only failing lines!) in `payload`. |
| `qa` | `read_only` | `false` | Primary | **Holistic Semantic Gate (Parallel with `verify`):** Review the full integrated diff against `overall_goal`, `success_criteria`, logic, and edge cases (`modified_files: []`, `commit_sha: null`). Return `qa_verdict`, `criteria_checks`, concrete `fix_items` in `payload`. |
| `compute` | `exec` | `true` | Primary | Run builds/benchmarks/sharded suites in worktree (`commit_sha: null` valid unless artifacts committed). Return compact `metrics`/`artifact_paths` in `payload`. |
| `writer_readonly` | `read_only` | `false` | Primary | Draft reports/deliverables (or write large outputs to `scratch_dir`) without editing repo files. |

---

## 7. Compact JSON Contracts & Context Diet

**Context Diet (Token Saver):** Pass only file paths and brief interface specs in `ctx`—never paste whole files, full logs, or repeated `role_directives` (those live once in the worker's `system_prompt`). Keep `summary` to 1–2 sentences; put only failing lines (not full stdout) or a `scratch/` path in `payload`.

### 7.1 Dispatch (`DISPATCH_PACKET_V1`)
```json
{
  "contract_type": "DISPATCH_PACKET_V1",
  "run_id": "run-20261126-225500-f4a9",
  "step_id": "S03",
  "depends_on": ["S01"],
  "plan_rev": 1,
  "role": "coding",
  "idempotency_key": "run-20261126-225500-f4a9:S03:8c19e2a:r1",
  "timeout_sec": 300,
  "objective": "Implement Redis sliding-window limiter + unit tests; run scoped lint before commit.",
  "workspace": {
    "worktree_path": "/abs/repo/.worktrees/run-20261126-225500-f4a9/S03",
    "branch_name": "orch/run-20261126-225500-f4a9/S03-coding",
    "base_commit": "8c19e2a",
    "owned_paths": ["src/limiter/**", "tests/limiter/**"],
    "read_only": false
  },
  "ctx": {
    "goal": "Add Redis-backed sliding-window rate limiting to the API.",
    "upstream": ["S01"],
    "interfaces": ["export function checkLimit(key: string): Promise<{ allowed: boolean; retryAfterMs: number }>"],
    "approved": ["D01"],
    "scratch_dir": "/abs/scratch",
    "out_of_scope": ["src/middleware/** (S04)", "main"]
  }
}
```
*Use `null` for `worktree_path`, `branch_name`, `owned_paths` on read-only steps without a checkout. Never include secrets in `ctx`.*

### 7.2 Return (`STEP_RESULT_V1`)
```json
{
  "contract_type": "STEP_RESULT_V1",
  "run_id": "run-20261126-225500-f4a9",
  "step_id": "S03",
  "role": "coding",
  "status": "OK",
  "exit_code": 0,
  "branch_name": "orch/run-20261126-225500-f4a9/S03-coding",
  "commit_sha": "a91c4e2",
  "modified_files": ["src/limiter/redisWindow.ts", "tests/limiter/redisWindow.test.ts"],
  "lines_changed": 114,
  "decision_triggers": [],
  "payload": { "self_check": "oxlint PASS" },
  "summary": "Implemented sliding-window limiter with unit tests; scoped lint passed.",
  "error": null
}
```
*Allowed `status`: `OK`, `NEEDS_DECISION`, `FAILED`, `TIMEOUT`. Missing/malformed JSON -> `CONTRACT_VIOLATION` (counts toward `max_retries = 2`). Read-only & `verify` invariants: `modified_files: []`, `lines_changed: 0`, `commit_sha: null`.*

---

## 8. Git Worktrees, Merging & Verification

1. **Worktree Paths & Dependencies:** Default `<repo>/.worktrees/<run_id>/<step_id>` (keep `.worktrees/` in `.gitignore` and excluded from tooling if needed; fallback `../.worktrees/<repo>/<run_id>/<step_id>`). During `PROVISIONING`, `git` symlinks/reuses existing `node_modules`/`.venv` caches so lint/typecheck work immediately.
2. **Deterministic Merge (`STANDARD`/`STRICT`):** Wait until all write steps in the batch settle, sort branches topologically with ascending `step_id` tie-breaking, and reuse the single `git` worker to verify `owned_paths` via `git diff --name-only` and merge sequentially into `orch/<run_id>/integrated`. Halt immediately on conflict.
3. **Bundled Parallel Gate (`verify` + `qa`):** Once merged (or when a `LIGHT` write step finishes), launch **1 `verify`** (fast model, real `git diff --numstat` + clean worktree + untouched main checkout + lint/typecheck/build/tests) and **1 holistic `qa`** (primary model, full diff vs goal/criteria) **in parallel**. Both must pass; if either fails, send combined violations + fix items in **1** retry to the responsible worker.
4. **Delivery & Cleanup:** Under `direct_main`, `git` fast-forwards/merges into `main`, pushes to `origin/main` (never `--force`), and deletes `orch/<run_id>/*` branches. Always remove `MERGED` worktrees (`git worktree remove` / `prune`) and **never delete** `FAILED`, `BLOCKED`, `AWAITING_DECISION`, or unmerged `branch_pr` worktrees.

---

## 9. Plain-Language Decisions & Reporting

- **Decisions:** Prefer `ask_question` (Antigravity) / `AskUserQuestion` (Claude Code) with a short natural question in the user's language and 2–4 plain options (recommended first, brief trade-off). Text fallback: brief heading, 1–2 sentence context, numbered plain options—**zero** internal codes (`D01`, `S03`, `OPT-1`, `DECISION_RULE_*`).
- **`STANDARD` Report (Default, adapt headings to user's language):**
  - **Summary:** 1–2 plain sentences on outcome & goal status.
  - **Plan:** *(final state of the plan diagram if it changed during the run; else omit)*.
  - **What Changed:** Bullet list with clickable file links + branch/commit info (`main` if `direct_main`, else feature/integration branch).
  - **Verification:** Plain-language check status (e.g., lint, typecheck, build, review passed).
  - **Decisions Made:** *(omit if none)* plain summary.
  - **Next Step:** 1 clear action (or confirmation that changes are live on `main` and cleaned up).
- **`AUDIT` / `VERBOSE` (Opt-In or Persistent Failure Only):** Append a collapsible `<details><summary>Technical Execution Ledger</summary>` containing Run ID, Mode, Merge Order, Fix Cycles (`x / 5`), Decisions, and the Wave/Step table (Role, Gate/QA, Retries, Commit/Worktree).
- **`SILENT`:** Result only (auto-upgrades to `STANDARD` on error or decision).

---

## 10. Self-Improvement (Automatic Retro -> Skill Edit)

- **Retro (every run, in-memory, no worker):** At `CLEANUP`, review the ledger: retries & their causes, merge conflicts, `verify`/`qa` failures, contract violations, decision pauses, critical-path accuracy (`size` estimates vs actual), idle parallel slots or splits that cost more than they saved, and wall time. Ask: *which skill rule, missing or wrong, caused avoidable cost?*
- **Auto-Apply (no approval needed):** If the retro finds a concrete, evidence-backed cause, append 1 `writer_repo` node "Orchestrator-Skill verbessern" / "Improve orchestrator skill" (`owned_paths: [".agents/skills/orchestrator/SKILL.md"]`) that edits this file directly. Then run the normal fast `verify` (YAML frontmatter parses, JSON blocks parse, fences balanced, size limits below), commit it on its own as `chore(orchestrator): self-improve – <cause>`, and deliver it under the run's `delivery_mode`. If nothing actionable was found (the common case), skip it with no tokens spent.
- **Edit Rules:** Make minimal, targeted diffs and prefer replacing or tightening a rule over adding one. Keep the file ≤ 28 KB (if over, consolidate before adding). No run-specific facts (paths, timings of one repo) unless phrased as a general rule. Never touch the `description` frontmatter format (single-line quoted string).
- **Locked (never weakened by self-improvement):** Zero Self-Execution; never `--force`/history rewrite on `main`; §5.1 decision gates & `DECISION_RULE_IRREVERSIBLE`; worktree guardrail; plain-language UX; `delivery_mode` semantics; this §10 itself. Changes there require explicit user approval.
- **Report:** Add 1 plain sentence under **Decisions Made** / final summary stating what the skill learned (e.g., "Skill angepasst: Lockfile-Änderungen laufen jetzt immer als eigener Schritt."). Every self-edit is a separate commit, so it can be reverted with `git revert`.
