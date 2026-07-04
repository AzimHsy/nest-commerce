# context-kit

Blank `context/` template for spec-driven projects. Context files define **what** to build, **how** to build it, and the **current state** of progress — implementation always happens against these specs, never inferred from scratch.

## Usage

### Mode 1 — New project (repo born with context/)

```bash
gh repo create AzimHsy/<project-name> --template AzimHsy/context-kit --private
```

Then scaffold the app around the seeded `context/` folder.

### Mode 2 — Existing repo (drop context/ in)

Fetch the `context/` folder fresh from this repo (source of truth — never copy from another project's filled-in version):

```bash
gh repo clone AzimHsy/context-kit /tmp/context-kit -- --depth 1
cp -r /tmp/context-kit/context <existing-repo>/
```

## How the files get filled

Via the **discussion phase** — never by hand-inferring answers:

1. Explore existing context first (code, commits, client brief)
2. Clarifying questions, one at a time
3. 2–3 approaches with trade-offs + a recommendation
4. Design presented in sections, approved per section
5. Templates filled from the discussion answers
6. Self-review: no placeholders left, no contradictions, no requirement readable two ways
7. **No code until the filled specs are approved**

## Files

| File | Owns |
| --- | --- |
| `project-overview.md` | What, for whom, goals, core flow, in/out of scope, success criteria |
| `architecture.md` | Stack, system boundaries, storage model, auth, invariants |
| `code-standards.md` | Language/framework conventions, API rules, file organization |
| `ui-context.md` | Theme, color tokens, typography, radius scale, layout patterns |
| `ai-workflow-rules.md` | Scoping rules, when to split work, missing-requirement protocol, done criteria |
| `progress-tracker.md` | Current phase/goal, completed, next up, open questions, decisions |
| `feature-specs/` | Post-v1 feature specs from later discussion runs |
