#!/usr/bin/env bash
# Раскатывает общие правила / скиллы / MCP-серверы на все локальные агенты.
# Запускать на СВОЁМ компьютере:  bash agent-setup/install.sh
# Посмотреть план без изменений:  bash agent-setup/install.sh --dry-run
# Вместе с MCP-серверами:         bash agent-setup/install.sh --mcp
set -euo pipefail

PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED="$PACK_DIR/shared"
RULES_SRC="$SHARED/AGENTS.md"
SKILLS_SRC="$SHARED/skills"
MCP_SRC="$SHARED/mcp.json"

DRY_RUN=0
DO_MCP=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --mcp)     DO_MCP=1 ;;
    -h|--help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Неизвестный аргумент: $arg" >&2; exit 2 ;;
  esac
done

BEGIN_MARK='<!-- >>> agent-pack: НАЧАЛО (правится через agent-setup/install.sh) >>> -->'
END_MARK='<!-- <<< agent-pack: КОНЕЦ <<< -->'

say()  { printf '%s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
skip() { printf '  — пропуск: %s\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }

[ -f "$RULES_SRC" ] || { echo "Нет файла $RULES_SRC" >&2; exit 1; }

# --- правила: вклеиваем управляемый блок, не трогая остальной файл --------
install_rules() {
  local target="$1" label="$2"
  local dir; dir="$(dirname "$target")"

  if [ "$DRY_RUN" = 1 ]; then
    if [ -f "$target" ]; then say "  [dry-run] обновил бы блок в $target ($label)"
    else say "  [dry-run] создал бы $target ($label)"; fi
    return
  fi

  mkdir -p "$dir"
  if [ -f "$target" ]; then
    cp -p "$target" "$target.bak.$(date +%Y%m%d%H%M%S)"
    # вырезаем предыдущий управляемый блок
    awk -v b="$BEGIN_MARK" -v e="$END_MARK" '
      $0 == b {inblock=1; next}
      $0 == e {inblock=0; next}
      !inblock {print}
    ' "$target" > "$target.tmp"
    # убираем хвостовые пустые строки
    awk 'BEGIN{n=0} {lines[NR]=$0} END{for(i=NR;i>0;i--){if(lines[i] ~ /[^[:space:]]/){n=i;break}} for(i=1;i<=n;i++) print lines[i]}' \
      "$target.tmp" > "$target.tmp2" && mv "$target.tmp2" "$target.tmp"
    mv "$target.tmp" "$target"
    [ -s "$target" ] && printf '\n' >> "$target"
  else
    : > "$target"
  fi

  {
    printf '%s\n' "$BEGIN_MARK"
    cat "$RULES_SRC"
    printf '%s\n' "$END_MARK"
  } >> "$target"
  ok "$label → $target"
}

step "1. Общие правила (AGENTS.md)"
install_rules "$HOME/.claude/CLAUDE.md"            "Claude Code (user scope)"
install_rules "$HOME/.config/opencode/AGENTS.md"   "opencode (глобально)"
install_rules "$HOME/.gemini/AGENTS.md"            "Antigravity (кросс-тул)"
install_rules "$HOME/.gemini/GEMINI.md"            "Antigravity (нативные global rules)"
if [ -d "$HOME/.codex" ]; then
  install_rules "$HOME/.codex/AGENTS.md"           "Codex CLI"
else
  skip "Codex CLI не найден (~/.codex отсутствует)"
fi

# --- скиллы ---------------------------------------------------------------
step "2. Скиллы"
if [ -d "$SKILLS_SRC" ] && [ -n "$(ls -A "$SKILLS_SRC" 2>/dev/null || true)" ]; then
  for s in "$SKILLS_SRC"/*/; do
    name="$(basename "$s")"
    for dest_root in "$HOME/.claude/skills" "$HOME/.config/opencode/skills"; do
      if [ "$DRY_RUN" = 1 ]; then
        say "  [dry-run] скопировал бы $name → $dest_root/$name"
      else
        mkdir -p "$dest_root"
        rm -rf "${dest_root:?}/$name"
        cp -R "$s" "$dest_root/$name"
        ok "$name → $dest_root/$name"
      fi
    done
  done
else
  skip "в $SKILLS_SRC пока пусто"
fi

# --- MCP-серверы ----------------------------------------------------------
step "3. MCP-серверы"
if [ "$DO_MCP" != 1 ]; then
  skip "нужен флаг --mcp (по умолчанию конфиги MCP не трогаем)"
elif ! command -v python3 >/dev/null 2>&1; then
  skip "нужен python3 для безопасного слияния JSON"
elif ! python3 -c "
import json,sys
d=json.load(open('$MCP_SRC'))
sys.exit(0 if d.get('mcpServers') else 1)
" 2>/dev/null; then
  skip "в $MCP_SRC нет ни одного сервера"
else
  python3 - "$MCP_SRC" "$HOME" "$DRY_RUN" <<'PY'
import json, os, shutil, sys, time

src, home, dry = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
servers = json.load(open(src))["mcpServers"]

def load(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save(path, data):
    if dry:
        print(f"  [dry-run] записал бы {len(servers)} сервер(ов) в {path}")
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        shutil.copy2(path, f"{path}.bak.{time.strftime('%Y%m%d%H%M%S')}")
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"  ✓ {path}")

# Antigravity / Gemini: {"mcpServers": {...}} — тот же формат, что и канонический
gem = os.path.join(home, ".gemini", "config", "mcp_config.json")
cfg = load(gem)
cfg.setdefault("mcpServers", {}).update(servers)
save(gem, cfg)

# opencode: {"mcp": {name: {"type":"local","command":[...],"environment":{...},"enabled":true}}}
oc = os.path.join(home, ".config", "opencode", "opencode.json")
cfg = load(oc)
cfg.setdefault("$schema", "https://opencode.ai/config.json")
mcp = cfg.setdefault("mcp", {})
for name, s in servers.items():
    if s.get("url"):
        entry = {"type": "remote", "url": s["url"], "enabled": True}
        if s.get("headers"):
            entry["headers"] = s["headers"]
    else:
        entry = {
            "type": "local",
            "command": [s["command"], *s.get("args", [])],
            "enabled": True,
        }
        if s.get("env"):
            entry["environment"] = s["env"]
    mcp[name] = entry
save(oc, cfg)

# Claude Code: у него свой стейт-файл, поэтому только подсказываем команды
print("\n  Claude Code — выполни вручную (он держит MCP в своём стейте):")
for name, s in servers.items():
    print(f"    claude mcp add-json {name} '{json.dumps(s, ensure_ascii=False)}' --scope user")
PY
fi

step "Готово"
say "Бэкапы старых конфигов лежат рядом с ними как *.bak.<таймстамп>"
[ "$DRY_RUN" = 1 ] && say "Это был --dry-run, на диске ничего не изменилось."
exit 0
