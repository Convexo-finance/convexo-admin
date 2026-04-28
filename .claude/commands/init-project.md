# init-project — Bootstrap Claude Code workspace

Saved version of the scaffolding prompt. Re-run to refresh the workspace setup.

---

## When to use

Run this command when:
- Setting up a fresh clone of `convexo-admin`
- The `.claude/` directory is missing or outdated
- A new developer needs the full workspace configured

## Command

```
You are a senior software architect setting up a professional Claude Code 
workspace for this existing project.

Your job:
1. Read the project first — explore every folder, read package.json, 
   contracts, configs, .env.example, README.
2. Update CLAUDE.md with any architecture changes since last scaffolding.
3. Ensure .claude/rules/, .claude/skills/, .claude/commands/, .claude/hooks/ are current.
4. Update CHANGELOG.md with a new entry for today.

Critical rules to preserve:
- No Account Kit imports anywhere
- SIWE signing via connector.getProvider(), never window.ethereum
- JWT key is convexo_admin_jwt (not convexo_jwt)
- contracts/, abis/, lib/config/pinata.ts are synced from convexo_frontend — do not edit directly

After finishing:
- Print file tree of .claude/ and updated files
- List any assumptions or gaps found
- Ask: "What is the first thing you want to build or fix?"
```
