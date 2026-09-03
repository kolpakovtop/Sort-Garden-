# agent-setup — общие настройки для всех агентов

Один источник правды (`shared/`), который раскатывается на **Claude Code**,
**opencode**, **Antigravity** и **Codex CLI**.

## Как пользоваться

```bash
git clone https://github.com/kolpakovtop/sort-garden-.git
cd sort-garden-
git checkout claude/chat-analysis-agent-setup-o1xt4m

bash agent-setup/install.sh --dry-run   # посмотреть, что будет сделано
bash agent-setup/install.sh             # правила + скиллы
bash agent-setup/install.sh --mcp       # ещё и MCP-серверы
```

На Windows — из Git Bash или WSL.

## Что где лежит

| Файл в `shared/` | Куда попадает |
|---|---|
| `AGENTS.md` | `~/.claude/CLAUDE.md`, `~/.config/opencode/AGENTS.md`, `~/.gemini/AGENTS.md`, `~/.gemini/GEMINI.md`, `~/.codex/AGENTS.md` |
| `skills/<имя>/` | `~/.claude/skills/<имя>/`, `~/.config/opencode/skills/<имя>/` |
| `mcp.json` | `~/.gemini/config/mcp_config.json` (Antigravity), `~/.config/opencode/opencode.json` (opencode), плюс готовые команды `claude mcp add-json` для Claude Code |

## Безопасность существующих конфигов

- Правила вставляются **управляемым блоком** между маркерами
  `agent-pack: НАЧАЛО` / `КОНЕЦ`. Всё, что вне блока, остаётся как было.
- Повторный запуск заменяет блок, а не дублирует его.
- Перед каждой записью рядом кладётся бэкап `*.bak.<таймстамп>`.
- MCP-конфиги трогаются только с флагом `--mcp`, и JSON именно
  **сливается**, а не перезаписывается.

## Формат `mcp.json`

Канонический формат — как у Claude Code / Gemini, `install.sh` сам
переводит его в формат opencode:

```json
{
  "mcpServers": {
    "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp"] },
    "linear":   { "url": "https://mcp.linear.app/sse" }
  }
}
```

## Статус

`shared/AGENTS.md` сейчас — заготовка, `shared/skills/` и `shared/mcp.json`
пустые. Наполняются содержимым из исходного чата.
