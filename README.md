# Claude Subconscious (Local Server Fork)

A fork of [claude-subconscious](https://github.com/letta-ai/claude-subconscious) that runs entirely locally. No Letta cloud account needed - the server starts automatically when you launch Claude Code.

## What Is This?

Claude Code forgets everything between sessions. Claude Subconscious adds a persistent memory layer:

- **Observes** every Claude Code conversation
- **Accumulates patterns** across sessions, projects, and time
- **Provides async guidance**, reminders, and context

This fork replaces the Letta cloud backend with a local server that manages memory as JSON files on your machine.

## How It Works

```
Claude Code  -->  Plugin hooks (SessionStart, Stop, etc.)
                        |
                  [auto-starts if needed]
                        |
                        v
                  Local server (server/)  -->  OpenRouter LLM
                        |
                        v
                  Local JSON files (server/data/)
```

When Claude Code starts, the plugin automatically:
1. Starts the local server (if not already running)
2. Imports the Subconscious agent (on first run)
3. Begins observing your session

## Setup

### 1. Install the plugin

```bash
claude plugin add https://github.com/1kgofpastaeveryday/claude-subconscious
```

### 2. Configure LLM backend

Set your OpenRouter API key in your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

You can use any model on [OpenRouter](https://openrouter.ai). Default: `qwen/qwen3-235b-a22b-2507`.

To change the model:
```bash
export LETTA_LOCAL_MODEL="google/gemini-2.5-pro"
```

> **Experimental: Codex CLI integration**
>
> If you have [Codex CLI](https://github.com/openai/codex) installed and authenticated (`~/.codex/auth.json`),
> the server can optionally use its OAuth tokens as an alternative backend.
> This is **experimental, unsupported, and entirely at your own risk**.
> Set `LETTA_USE_CODEX=0` to disable auto-detection.

### 3. Launch Claude Code

```bash
claude
```

That's it. The server starts automatically on first session.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | - | OpenRouter API key (required unless using Codex) |
| `LETTA_LOCAL_MODEL` | `qwen/qwen3-235b-a22b-2507` | OpenRouter model to use |
| `LETTA_LOCAL_PORT` | `8990` | Local server port |
| `LETTA_USE_CODEX` | auto-detected | Set to `0` to disable Codex auto-detection |

## What Changed From Upstream

This fork modifies `letta-ai/claude-subconscious` v1.5.1:

- **Added `server/`**: Local Letta-compatible API server with OpenRouter and experimental Codex support
- **Auto-start**: Server launches automatically via `SessionStart` hook
- **Default to localhost**: All scripts point to `http://localhost:8990` instead of `api.letta.com`
- **Windows stability patches**:
  - `scripts/session_start.ts` - Skip HTTP calls on Windows + local server
  - `scripts/agent_config.ts` - Skip model check when already configured
  - `scripts/pretool_sync.ts` - Skip PreToolUse on Windows (tsx timeout)
  - `scripts/plan_checkpoint.ts` - Same tsx timeout fix
  - `hooks/hooks.json` - Increased SessionStart timeout (5s -> 30s)

## Data

Agent memory is stored in `server/data/` (gitignored):
- `agent.json` - agent config and system prompt
- `blocks.json` - memory blocks
- `conversations/` - conversation history

## Status / Known Limitations

- Tested primarily on Windows. macOS/Linux should work but is less tested.
- Server auto-start adds ~5-15s to the first session start (dependency install + server boot).
- OpenRouter is the recommended LLM backend.
- Codex integration is experimental and may carry account/policy risk.
- Based on upstream v1.5.1. Upstream updates are not automatically tracked.

## License

MIT License. Plugin code Copyright (c) 2026 Letta, Inc. See [LICENSE](LICENSE).
