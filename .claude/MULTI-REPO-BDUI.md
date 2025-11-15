# Multi-Repo bdui Management - Best Practices

**Version:** 1.0.0
**Issue:** BT-2sb
**Date:** 2025-11-15

---

## 🎯 Проблема

Коли працюєш з множинними проєктами (наприклад: `browser-tools`, `krtm`, `odoov19`), потрібно:
- Запускати окремий bdui для кожного репо
- Керувати різними портами
- Швидко переключатись між UI
- Не плутати issues з різних проєктів

---

## 🔧 Архітектура Multi-Repo Setup

### Структура

```
~/github/
├── browser-tools/
│   ├── .beads/beads.db
│   └── bdui → :3002
├── krtm/
│   ├── .beads/beads.db
│   └── bdui → :3003
└── odoov19/
    ├── .beads/beads.db
    └── bdui → :3004
```

**Кожен репо має:**
- Власну `.beads/` директорію
- Власний bdui на окремому порту
- Ізольовані issues

---

## 🚀 Запуск Multiple bdui Instances

### Варіант 1: Manual Start (для тестування)

```bash
# browser-tools на :3002
cd ~/github/browser-tools
PORT=3002 bdui start

# krtm на :3003
cd ~/github/krtm
PORT=3003 bdui start

# odoov19 на :3004
cd ~/github/odoov19
PORT=3004 bdui start
```

### Варіант 2: Background Daemons (recommended)

```bash
# browser-tools
cd ~/github/browser-tools
nohup env PORT=3002 bdui start > ~/.bdui-logs/browser-tools.log 2>&1 &
echo $! > ~/.bdui-pids/browser-tools.pid

# krtm
cd ~/github/krtm
nohup env PORT=3003 bdui start > ~/.bdui-logs/krtm.log 2>&1 &
echo $! > ~/.bdui-pids/krtm.pid

# odoov19
cd ~/github/odoov19
nohup env PORT=3004 bdui start > ~/.bdui-logs/odoov19.log 2>&1 &
echo $! > ~/.bdui-pids/odoov19.pid
```

### Варіант 3: Shell Script (automation)

Створити `~/.local/bin/bdui-start-all`:

```bash
#!/bin/bash
# Start all bdui instances

REPOS=(
  "browser-tools:3002"
  "krtm:3003"
  "odoov19:3004"
)

mkdir -p ~/.bdui-logs ~/.bdui-pids

for repo_port in "${REPOS[@]}"; do
  IFS=':' read -r repo port <<< "$repo_port"
  repo_path="$HOME/github/$repo"

  if [ -d "$repo_path/.beads" ]; then
    echo "Starting bdui for $repo on :$port"
    cd "$repo_path"
    nohup env PORT=$port bdui start > ~/.bdui-logs/${repo}.log 2>&1 &
    echo $! > ~/.bdui-pids/${repo}.pid
    echo "  ✓ PID: $(cat ~/.bdui-pids/${repo}.pid)"
  else
    echo "  ✗ No .beads/ in $repo"
  fi
done

echo ""
echo "All bdui instances started. Access:"
for repo_port in "${REPOS[@]}"; do
  IFS=':' read -r repo port <<< "$repo_port"
  echo "  $repo: http://localhost:$port"
done
```

Зробити executable:
```bash
chmod +x ~/.local/bin/bdui-start-all
```

Запуск:
```bash
bdui-start-all
```

---

## 🛑 Зупинка bdui Instances

### Варіант 1: Через bd CLI

```bash
cd ~/github/browser-tools
bdui stop

cd ~/github/krtm
bdui stop
```

### Варіант 2: Через PID файли

```bash
# browser-tools
kill $(cat ~/.bdui-pids/browser-tools.pid)

# krtm
kill $(cat ~/.bdui-pids/krtm.pid)
```

### Варіант 3: Stop All Script

`~/.local/bin/bdui-stop-all`:

```bash
#!/bin/bash
# Stop all bdui instances

if [ -d ~/.bdui-pids ]; then
  for pidfile in ~/.bdui-pids/*.pid; do
    if [ -f "$pidfile" ]; then
      pid=$(cat "$pidfile")
      repo=$(basename "$pidfile" .pid)

      if ps -p $pid > /dev/null 2>&1; then
        echo "Stopping bdui for $repo (PID: $pid)"
        kill $pid
        rm "$pidfile"
      else
        echo "  ✗ $repo: process not running"
        rm "$pidfile"
      fi
    fi
  done
else
  echo "No PID files found in ~/.bdui-pids/"
fi
```

---

## 📊 Перевірка Status

### Script: bdui-status

`~/.local/bin/bdui-status`:

```bash
#!/bin/bash
# Check status of all bdui instances

REPOS=(
  "browser-tools:3002"
  "krtm:3003"
  "odoov19:3004"
)

echo "╔════════════════════════════════════════════╗"
echo "║        BDUI INSTANCES STATUS               ║"
echo "╚════════════════════════════════════════════╝"
echo ""

for repo_port in "${REPOS[@]}"; do
  IFS=':' read -r repo port <<< "$repo_port"

  # Check if port is listening
  if lsof -i :$port -sTCP:LISTEN > /dev/null 2>&1; then
    pid=$(lsof -ti :$port)
    status="🟢 RUNNING"
  else
    status="🔴 STOPPED"
    pid="N/A"
  fi

  # Check .beads directory
  repo_path="$HOME/github/$repo"
  if [ -d "$repo_path/.beads" ]; then
    issues=$(cd "$repo_path" && bd stats 2>/dev/null | grep "Total" | awk '{print $3}')
    [ -z "$issues" ] && issues="?"
  else
    issues="N/A"
  fi

  printf "%-20s %s  Port: %s  PID: %s  Issues: %s\n" \
    "$repo" "$status" "$port" "$pid" "$issues"
  printf "                    http://localhost:%s\n" "$port"
  echo ""
done
```

Використання:
```bash
bdui-status
```

Output:
```
╔════════════════════════════════════════════╗
║        BDUI INSTANCES STATUS               ║
╚════════════════════════════════════════════╝

browser-tools        🟢 RUNNING  Port: 3002  PID: 82156  Issues: 17
                    http://localhost:3002

krtm                 🟢 RUNNING  Port: 3003  PID: 82189  Issues: 24
                    http://localhost:3003

odoov19              🔴 STOPPED  Port: 3004  PID: N/A  Issues: ?
                    http://localhost:3004
```

---

## 🔧 Керування Портами

### Best Practices

**Стандартна схема портів:**
```
3001 - Default bdui port (не використовувати для specific repos)
3002 - browser-tools
3003 - krtm
3004 - odoov19
3005 - project-4
...
```

**Налаштування в .bashrc/.zshrc:**

```bash
# ~/.zshrc

# bdui port mappings
export BDUI_BROWSER_TOOLS=3002
export BDUI_KRTM=3003
export BDUI_ODOOV19=3004

# Aliases
alias bdui-bt="cd ~/github/browser-tools && PORT=$BDUI_BROWSER_TOOLS bdui start"
alias bdui-krtm="cd ~/github/krtm && PORT=$BDUI_KRTM bdui start"
alias bdui-odoo="cd ~/github/odoov19 && PORT=$BDUI_ODOOV19 bdui start"

# Open in browser
alias open-bt-ui="open http://localhost:$BDUI_BROWSER_TOOLS"
alias open-krtm-ui="open http://localhost:$BDUI_KRTM"
alias open-odoo-ui="open http://localhost:$BDUI_ODOOV19"
```

### Перевірка вільних портів

```bash
# Check if port is free
lsof -i :3002

# Find next free port
for port in {3002..3010}; do
  if ! lsof -i :$port > /dev/null 2>&1; then
    echo "Port $port is free"
    break
  fi
done
```

---

## 🔄 Швидке Переключення між Repos

### Browser Bookmarks

Створити папку "Beads UI" з закладками:
```
browser-tools → http://localhost:3002
krtm → http://localhost:3003
odoov19 → http://localhost:3004
```

### tmux Session

`~/.tmux-bdui.conf`:

```bash
# Create tmux session for bdui management
new-session -s bdui -n browser-tools -d
send-keys -t bdui:browser-tools "cd ~/github/browser-tools && PORT=3002 bdui start" C-m

new-window -t bdui -n krtm
send-keys -t bdui:krtm "cd ~/github/krtm && PORT=3003 bdui start" C-m

new-window -t bdui -n odoov19
send-keys -t bdui:odoov19 "cd ~/github/odoov19 && PORT=3004 bdui start" C-m

attach-session -t bdui
```

Start:
```bash
tmux source-file ~/.tmux-bdui.conf
```

### Raycast/Alfred Workflow

**Raycast Script Command:**

`open-bdui-repo.sh`:
```bash
#!/bin/bash

# @raycast.title Open Beads UI
# @raycast.mode silent
# @raycast.packageName Developer
# @raycast.argument1 { "type": "dropdown", "placeholder": "repo", "data": [{"title": "browser-tools", "value": "3002"}, {"title": "krtm", "value": "3003"}, {"title": "odoov19", "value": "3004"}] }

port=$1
open "http://localhost:$port"
```

---

## 📝 Logs Management

### Централізовані логи

```bash
mkdir -p ~/.bdui-logs

# Перегляд логів
tail -f ~/.bdui-logs/browser-tools.log
tail -f ~/.bdui-logs/krtm.log

# Всі логи одночасно
tail -f ~/.bdui-logs/*.log
```

### Log Rotation

`~/.local/bin/bdui-rotate-logs`:

```bash
#!/bin/bash
# Rotate bdui logs (weekly)

log_dir=~/.bdui-logs
archive_dir=~/.bdui-logs/archive

mkdir -p "$archive_dir"

for logfile in "$log_dir"/*.log; do
  if [ -f "$logfile" ]; then
    filename=$(basename "$logfile")
    timestamp=$(date +%Y%m%d-%H%M%S)

    # Compress and move to archive
    gzip -c "$logfile" > "$archive_dir/${filename%.log}-${timestamp}.log.gz"

    # Clear current log
    > "$logfile"

    echo "Rotated: $filename"
  fi
done

# Keep only last 30 days of archives
find "$archive_dir" -name "*.log.gz" -mtime +30 -delete
```

Додати в crontab:
```bash
# Rotate bdui logs weekly (Sundays at 3am)
0 3 * * 0 ~/.local/bin/bdui-rotate-logs
```

---

## 🚨 Troubleshooting

### Issue: Port вже зайнятий

```bash
# Знайти процес
lsof -i :3002

# Вбити процес
kill $(lsof -ti :3002)

# Або форсовано
kill -9 $(lsof -ti :3002)
```

### Issue: bdui не стартує

```bash
# Перевірити логи
cat ~/.bdui-logs/browser-tools.log

# Перевірити .beads/
cd ~/github/browser-tools
ls -la .beads/

# Спробувати manual start для debugging
PORT=3002 bdui start
```

### Issue: UI показує стару інформацію

```bash
# Рефрешнути браузер (Cmd+R)
# або
# Перезапустити bdui
bdui stop && sleep 2 && PORT=3002 bdui start
```

### Issue: Різні репо показують одні issues

**Причина:** bdui запущено НЕ з директорії репо

**Рішення:**
```bash
# Завжди CD в репо перед запуском
cd ~/github/browser-tools
PORT=3002 bdui start
```

---

## ⚙️ Автозапуск при Boot

### macOS - launchd

Створити `~/Library/LaunchAgents/com.user.bdui.browser-tools.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.bdui.browser-tools</string>

    <key>ProgramArguments</key>
    <array>
        <string>/Users/sd/.local/share/mise/installs/node/24.11.0/bin/bdui</string>
        <string>start</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/sd/github/browser-tools</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>3002</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/Users/sd/.bdui-logs/browser-tools.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/sd/.bdui-logs/browser-tools-error.log</string>
</dict>
</plist>
```

Load:
```bash
launchctl load ~/Library/LaunchAgents/com.user.bdui.browser-tools.plist
```

Unload:
```bash
launchctl unload ~/Library/LaunchAgents/com.user.bdui.browser-tools.plist
```

### Linux - systemd

`~/.config/systemd/user/bdui-browser-tools.service`:

```ini
[Unit]
Description=Beads UI for browser-tools
After=network.target

[Service]
Type=simple
Environment="PORT=3002"
WorkingDirectory=/home/user/github/browser-tools
ExecStart=/home/user/.local/bin/bdui start
Restart=on-failure
RestartSec=10
StandardOutput=append:/home/user/.bdui-logs/browser-tools.log
StandardError=append:/home/user/.bdui-logs/browser-tools-error.log

[Install]
WantedBy=default.target
```

Enable:
```bash
systemctl --user enable bdui-browser-tools
systemctl --user start bdui-browser-tools
```

---

## 📊 Dashboard для всіх репо

### HTML Dashboard

`~/.local/share/bdui-dashboard.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Beads UI Dashboard</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 40px; }
    .repo { border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
    .repo h2 { margin-top: 0; }
    .status { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
    .running { background: #22c55e; }
    .stopped { background: #ef4444; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🔮 Beads UI Dashboard</h1>

  <div class="repo">
    <h2><span class="status running"></span> browser-tools</h2>
    <p>Port: 3002 | Issues: 17</p>
    <a href="http://localhost:3002" target="_blank">Open UI →</a>
  </div>

  <div class="repo">
    <h2><span class="status running"></span> krtm</h2>
    <p>Port: 3003 | Issues: 24</p>
    <a href="http://localhost:3003" target="_blank">Open UI →</a>
  </div>

  <div class="repo">
    <h2><span class="status stopped"></span> odoov19</h2>
    <p>Port: 3004 | Issues: N/A</p>
    <a href="http://localhost:3004" target="_blank">Open UI →</a>
  </div>

  <script>
    // Auto-refresh status every 10s
    setInterval(() => location.reload(), 10000);
  </script>
</body>
</html>
```

Open:
```bash
open ~/.local/share/bdui-dashboard.html
```

---

## ✅ Best Practices Checklist

### Запуск нового репо з bd

```bash
# 1. Initialize bd в репо
cd ~/github/new-project
bd init project

# 2. Вибрати вільний порт
PORT=3005  # Наступний вільний

# 3. Додати в bdui-start-all script
# Edit ~/.local/bin/bdui-start-all:
# Add: "new-project:3005"

# 4. Створити alias
echo 'alias bdui-newproj="cd ~/github/new-project && PORT=3005 bdui start"' >> ~/.zshrc

# 5. Створити bookmark
# http://localhost:3005

# 6. Запустити
bdui-newproj
```

### Щоденний Workflow

```bash
# Ранок - запустити всі bdui
bdui-start-all

# Перевірити статус
bdui-status

# Працювати з конкретним репо
open-bt-ui  # Відкрити browser-tools UI

# Вечір - зупинити всі (optional)
bdui-stop-all
```

### Monitoring

```bash
# Перевірити які порти зайняті bdui
lsof -i :3002-3010 | grep bdui

# Перевірити логи за останню годину
find ~/.bdui-logs -name "*.log" -mmin -60 -exec tail -20 {} \;

# Перевірити memory usage
ps aux | grep bdui | awk '{sum+=$4} END {print "Total memory: " sum "%"}'
```

---

## 🎯 Висновок: Оптимальний Setup

### Рекомендована архітектура:

1. **Один bdui per репо** - ізоляція issues
2. **Фіксовані порти** - browser-tools=3002, krtm=3003, etc
3. **Automation scripts** - bdui-start-all, bdui-stop-all, bdui-status
4. **Централізовані логи** - ~/.bdui-logs/
5. **Aliases** - швидкий доступ (bdui-bt, open-bt-ui)
6. **Browser bookmarks** - папка "Beads UI"

### Мінімальний Working Setup:

```bash
# 1. Створити структури
mkdir -p ~/.bdui-logs ~/.bdui-pids

# 2. Створити bdui-start-all script
# (копіювати з вище)

# 3. Додати aliases в ~/.zshrc
alias bdui-bt="cd ~/github/browser-tools && PORT=3002 bdui start"
alias bdui-krtm="cd ~/github/krtm && PORT=3003 bdui start"
alias open-bt="open http://localhost:3002"
alias open-krtm="open http://localhost:3003"

# 4. Reload shell
source ~/.zshrc

# 5. Start all
bdui-start-all
```

**Тепер маєш централізований контроль над всіма bdui instances! 🚀**

---

**Version:** 1.0.0
**Issue:** BT-2sb
**Date:** 2025-11-15
