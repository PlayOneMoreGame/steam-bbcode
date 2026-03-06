---
name: standup
description: Daily morning standup — agents review current state and recommend priorities for SteamBBEditor
---

## Daily Standup

### Step 1: Gather State

Read context files:
- ~/OneMoreGame/steam-bbcode/CLAUDE.md
- ~/OneMoreGame/steam-bbcode/ROADMAP.md

Check repo status:
```bash
cd ~/OneMoreGame/steam-bbcode && git log --oneline -5 && git status --short
```

Check current test status:
```bash
cd ~/OneMoreGame/steam-bbcode && npm run test:run 2>&1 | tail -5
```

### Step 2: Agent Check-ins

Delegate to ALL FIVE agents in ~/OneMoreGame/steam-bbcode/.claude/agents/. Each agent reports:
1. Current priorities in their domain
2. Blockers, risks, or stale items
3. What they recommend working on today

Agents to delegate to (do not skip any):
- ux-designer
- macos-developer
- tauri-engineer
- frontend-engineer
- engineering-manager

If an agent has nothing to report, they say so in one line. Do not skip them.

### Step 3: Synthesize

Combine all agent reports into a single prioritized plan:
- P0: Blockers (must fix before anything else)
- P1: High-priority work for today
- P2: Should do if time allows
- P3: Backlog items to track

Reference the phasing from the engineering-manager agent:
- Phase 1a: CSS native feel
- Phase 1b: Two-panel layout
- Phase 1c: Window title
- Phase 2a: Confluence converter
- Phase 2b: Multi-format integration
- Phase 2c: Native menu bar
- Phase 3: Tauri v2 migration

Flag any conflicts between agent recommendations. Present the plan for approval before starting work.

### Step 4: Jira Tickets (if approved)

After the plan is approved, use the standup-to-jira skill to create tickets:
- Write ticket definitions to /tmp/standup-tickets.json
- Run: python ~/OneMoreGame/standup-to-jira/scripts/create_tickets.py --config ~/.config/omg/jira-config.json --tickets /tmp/standup-tickets.json --dry-run
- Show preview, wait for approval
- Create tickets on confirmation
