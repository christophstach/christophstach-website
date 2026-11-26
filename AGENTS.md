# Project Agent Instructions

- For any multi-step task, feature implementation, refactoring, or structured research/brainstorming, activate the `orchestrator` skill (`.agents/skills/orchestrator/SKILL.md`).
- Never execute domain tasks, Git commands, or file edits directly inside the orchestrator role—always delegate via isolated Git worktrees and the built-in subagent role profiles.
- Pause and escalate a compact mobile-friendly Decision Brief whenever any `DECISION_RULE_*` triggers (especially before changing public APIs, schemas, dependencies, pushing to `main`, or merging PRs).
- Keep `.worktrees/` ignored in `.gitignore`.
