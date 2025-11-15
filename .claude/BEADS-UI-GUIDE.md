# Beads UI - Покроковий Guide для Використання

**Версія:** 1.0.0
**Проєкт:** browser-tools
**UI:** http://localhost:3002
**Репозиторій beads-ui:** https://github.com/mantoni/beads-ui

---

## 🎯 Що таке Beads UI?

**Beads UI** - це web-інтерфейс для перегляду та управління issues з beads (bd) issue tracker.

**Переваги:**
- 📊 Візуальний dashboard з метриками
- 🔗 Граф залежностей між issues
- 🔍 Фільтри за статусом, пріоритетом, типом
- 📈 Прогрес епіків
- 🕐 Історія змін

**Коли використовувати:**
- Швидкий огляд стану проєкту
- Перегляд dependency graph
- Аналіз прогресу епіків
- Презентація стану команді

---

## 🚀 Запуск Beads UI

### Варіант 1: Через bd CLI (рекомендовано)

```bash
# Запуск на default port (3001)
bd ui

# Запуск на custom port
PORT=3002 bdui start
```

### Варіант 2: Через npx

```bash
# Запуск останньої версії
npx beads-ui

# З custom port
PORT=3002 npx beads-ui
```

### Поточна конфігурація

У нашому проєкті beads-ui вже запущено:
```bash
# Працює в background
PORT=3002 bdui start &

# Доступ
open http://localhost:3002
```

---

## 📋 Покроковий Workflow

### КРОК 1: Початок нової задачі

**CLI:**
```bash
# 1. Перевірити відкриті issues
bd list --status open

# 2. Переглянути епік
bd show BT-1d8
```

**UI:**
- Відкрити http://localhost:3002
- Dashboard показує:
  - 📊 Total Issues: 17
  - ✅ Open: 3
  - 🔄 In Progress: 1
  - ⏹️ Closed: 12

**Що дивитись:**
- **Open Issues** - що треба зробити
- **Ready** - issues без блокерів (можна почати)
- **Blocked** - issues що чекають на інші

### КРОК 2: Створення нового Issue

**CLI (обов'язково):**
```bash
bd create \
  --title "Назва задачі" \
  --type task \
  --priority 1 \
  --description "Детальний опис"
```

**UI:**
- Issues автоматично оновлюються
- Новий issue з'являється в списку Open
- Показує статус: open, ID, пріоритет

**Приклад:**
```bash
bd create \
  --title "Додати CSV export для документів" \
  --type feature \
  --priority 2 \
  --description "Експорт списку документів у CSV формат"
```

### КРОК 3: Початок роботи

**CLI:**
```bash
# Позначити що почав роботу
bd update BT-abc --status in_progress
```

**UI:**
- Issue переміщується в секцію "In Progress"
- Dashboard показує In Progress: 1 → 2
- Timestamp оновлюється

**Візуальна індикація:**
- 🟢 Open - зелений
- 🔵 In Progress - синій
- ⚫ Blocked - червоний
- ✅ Closed - сірий

### КРОК 4: Робота з Dependency Graph

**CLI:**
```bash
# Додати залежність
bd dep add BT-abc --depends-on BT-xyz --type blocks

# Типи залежностей:
# - blocks: hard blocker
# - related: soft link
# - parent-child: epic/subtask
# - discovered-from: знайдено під час роботи
```

**UI - Dependency Graph:**
- Клікнути на issue → "Dependencies" tab
- Показує:
  - ⬆️ **Dependencies** - від чого залежить цей issue
  - ⬇️ **Dependents** - що залежить від цього issue

**Приклад графа:**
```
BT-1d8 (epic: KRTM документи)
  ├─→ [blocks] BT-74w (closed) - Завантажити документи
  │    └─→ [blocks] BT-b0t (closed) - Status checking
  └─→ [blocks] BT-3rv (open) - Оновити SETUP.md
```

### КРОК 5: Оновлення прогресу

**CLI (під час роботи):**
```bash
# Додати нотатки
bd update BT-abc --notes "Реалізовано CSV export, додано тести"

# Оновити acceptance criteria
bd update BT-abc --acceptance "✓ CSV format, ✓ UTF-8 encoding, ✓ Tests"
```

**UI:**
- Клікнути на issue → вкладка "Details"
- Показує:
  - 📝 Notes - прогрес, результати
  - ✅ Acceptance Criteria - що має бути зроблено
  - 📐 Design - технічні рішення
  - 🕐 History - всі зміни

### КРОК 6: Закриття Issue

**CLI:**
```bash
bd close BT-abc --reason "Implemented CSV export with tests. Commit: abc123"
```

**UI:**
- Issue переміщується в Closed
- Dashboard: Closed count +1
- Показує:
  - ⏱️ Closed At timestamp
  - 📝 Close Reason
  - ⌛ Lead Time (від created до closed)

### КРОК 7: Аналіз метрик

**UI Dashboard:**
```
📊 Statistics:
   Total Issues:      17
   Open:              3
   In Progress:       1
   Closed:            12
   Blocked:           0
   Ready:             3
   Avg Lead Time:     2.4 hours
```

**CLI:**
```bash
bd stats
bd blocked        # Показати заблоковані issues
bd ready          # Показати ready to work issues
```

**Використання:**
- **Avg Lead Time** - скільки в середньому займає task
- **Blocked** - де bottleneck
- **Ready** - що можна почати зараз

---

## 🔍 Фільтри та Пошук

### CLI Фільтри

```bash
# За статусом
bd list --status open
bd list --status in_progress
bd list --status closed

# За пріоритетом (0-4, де 0 найвищий)
bd list --priority 1

# За типом
bd list --type bug
bd list --type feature
bd list --type epic

# За assignee
bd list --assignee @username

# Комбінація
bd list --status open --priority 1 --type bug
```

### UI Фільтри

**Dashboard фільтри:**
- Status dropdown: All / Open / In Progress / Closed / Blocked
- Priority filter: P0 / P1 / P2 / P3 / P4
- Type filter: Bug / Feature / Task / Epic / Chore

**Search:**
- Пошук по title
- Пошук по description
- Пошук по ID (BT-xxx)

---

## 📊 Робота з Епіками

### Створення Epic

**CLI:**
```bash
bd create \
  --title "Новий feature set" \
  --type epic \
  --priority 1 \
  --design "CRITICAL: features A,B,C. HIGH: features D,E" \
  --acceptance "Всі features реалізовані та протестовані"
```

### Зв'язування Tasks з Epic

**CLI:**
```bash
# Створити task з parent epic
bd create \
  --title "Реалізувати feature A" \
  --type task \
  --parent BT-epic-id

# Або додати dependency вручну
bd dep add BT-task-id --depends-on BT-epic-id --type parent-child
```

### Перегляд Epic Progress

**UI:**
- Клікнути на epic
- Вкладка "Dependents" показує всі дочірні tasks
- Progress bar: скільки tasks закрито / всього

**Приклад:**
```
Epic: BT-1d8 (KRTM документи)
Progress: 8/11 документів (72%)

Dependents:
  ✅ BT-74w - Завантажити документи (closed)
  ✅ BT-b0t - Status checking (closed)
  🔵 BT-3rv - Оновити SETUP.md (in_progress)
```

---

## 🔄 Синхронізація та Persistence

### Де зберігаються дані

```
browser-tools/
└── .beads/
    ├── beads.left.db         # SQLite database (current state)
    ├── beads.left.jsonl      # JSONL export (sync + backup)
    └── beads.left.meta.json  # Metadata
```

**Beads UI читає з:**
- `.beads/*.db` - SQLite database

**Автоматична синхронізація:**
- bd CLI → database → beads-ui автоматично оновлюється
- Не потрібно рефрешити UI

### Git Integration

**Що комітити:**
```bash
git add .beads/
git commit -m "update: beads issues - completed BT-abc"
```

**Що НЕ комітити:**
- Тільки `.beads/*.db` якщо використовуєте JSONL sync
- `.beads/*.db` є gitignored якщо правильно налаштовано

---

## ⚡ Best Practices

### 1. Завжди починати з bd list

**ПЕРЕД роботою:**
```bash
bd list --status open        # Що є зараз?
bd show <epic-id>            # Контекст епіку
bd create --title "..."      # Створити issue
bd update <id> --status in_progress
```

**Користувач має БЛОКУВАТИ якщо пропустили цей крок.**

### 2. Оновлювати Notes під час роботи

```bash
# Після кожного значного кроку
bd update BT-abc --notes "Implemented X, testing Y"

# Після кожного коміту
bd update BT-abc --notes "commit: abc123 - added feature X"
```

### 3. Завжди закривати з Reason

```bash
# ❌ Погано
bd close BT-abc

# ✅ Добре
bd close BT-abc --reason "Implemented and tested. Commits: abc123, def456"
```

### 4. Використовувати Dependencies

```bash
# Показати що task блокується іншим
bd dep add BT-new --depends-on BT-old --type blocks

# Зв'язати з епіком
bd dep add BT-task --depends-on BT-epic --type parent-child
```

### 5. Регулярно перевіряти Ready

```bash
bd ready --limit 5
```

**UI:** Dashboard → "Ready" показує issues без блокерів

---

## 🐛 Troubleshooting

### UI не запускається

```bash
# Перевірити чи запущено
lsof -i :3002

# Вбити процес і перезапустити
pkill -f bdui
PORT=3002 bdui start &
```

### UI не показує issues

```bash
# Перевірити database
ls -la .beads/

# Перевірити чи є issues
bd list

# Sync JSONL → DB
bd sync
```

### UI не оновлюється після bd команд

**Beads UI не має live reload.** Треба:
```bash
# Рефрешнути браузер (Cmd+R)
# або
# Перезапустити UI
bdui stop && PORT=3002 bdui start &
```

---

## 📱 UI Layout Overview

```
╔═══════════════════════════════════════════════════════════╗
║                      BEADS UI                             ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📊 Dashboard                                             ║
║     Total: 17 | Open: 3 | In Progress: 1 | Closed: 12   ║
║     Blocked: 0 | Ready: 3 | Avg Lead Time: 2.4h         ║
║                                                           ║
║  🔍 Filters: [Status ▼] [Priority ▼] [Type ▼]           ║
║                                                           ║
║  📋 Issues List:                                          ║
║  ┌───────────────────────────────────────────────────┐   ║
║  │ BT-1d8 [P1] [epic] open                          │   ║
║  │ План для KRTM: Завантаження 11 документів        │   ║
║  │ Progress: 8/11 (72%)                              │   ║
║  ├───────────────────────────────────────────────────┤   ║
║  │ BT-3rv [P2] [task] open                          │   ║
║  │ Оновити SETUP.md: видалити print, додати download│   ║
║  ├───────────────────────────────────────────────────┤   ║
║  │ BT-l4x [P2] [task] in_progress                   │   ║
║  │ Створити покроковий guide для beads-ui           │   ║
║  └───────────────────────────────────────────────────┘   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Клік на issue → Details panel:
┌─────────────────────────────────────────────┐
│ BT-l4x: Створити beads-ui guide             │
├─────────────────────────────────────────────┤
│ [Details] [Dependencies] [History]          │
├─────────────────────────────────────────────┤
│ Status: in_progress                         │
│ Priority: P2                                │
│ Type: task                                  │
│ Created: 2025-11-14 06:15                   │
│ Updated: 2025-11-14 06:16                   │
│                                             │
│ Description:                                │
│ Покроковий guide як найкраще...             │
│                                             │
│ Notes: (empty)                              │
│                                             │
│ Dependencies: none                          │
│ Dependents: none                            │
└─────────────────────────────────────────────┘
```

---

## 🎯 Практичний Приклад Workflow

### Сценарій: Додати CSV export для документів

```bash
# 1. Перевірити контекст
bd list --status open
# Бачу: BT-1d8 epic про KRTM документи

# 2. Переглянути epic
bd show BT-1d8
# Design: завантаження документів
# Notes: 8/11 готові

# 3. Створити issue
bd create \
  --title "Додати CSV export для списку документів" \
  --type feature \
  --priority 2 \
  --description "Export downloaded documents list to CSV format" \
  --deps "BT-1d8"

# Отримую: ✓ Created issue: BT-xyz

# 4. Відкрити UI
open http://localhost:3002

# 5. Перевірити в UI:
# - BT-xyz в списку Open
# - Dependency на BT-1d8 показана

# 6. Почати роботу
bd update BT-xyz --status in_progress

# UI автоматично показує BT-xyz в "In Progress"

# 7. Працюю над кодом...
# [coding...]

# 8. Після значного прогресу
bd update BT-xyz --notes "Implemented CSV writer, added tests"

# 9. Комічу
git add budstandart/export-csv.js
git commit -m "feat: add CSV export (BT-xyz)"

# 10. Оновлюю bd
bd update BT-xyz --notes "commit: abc123 - CSV export implemented and tested"

# 11. Закриваю
bd close BT-xyz --reason "Implemented CSV export with tests. Commit: abc123"

# 12. Перевірити в UI:
open http://localhost:3002
# - BT-xyz в Closed
# - Lead time показано
# - Epic BT-1d8 progress оновлено
```

---

## 📚 Корисні Команди (швидкий довідник)

```bash
# === ПЕРЕГЛЯД ===
bd list --status open           # Відкриті issues
bd list --status in_progress    # В роботі
bd show BT-xxx                  # Деталі issue
bd stats                        # Статистика проєкту
bd ready                        # Issues готові до роботи
bd blocked                      # Заблоковані issues

# === СТВОРЕННЯ ===
bd create --title "..." --type task --priority 1
bd create --type epic --title "Epic name"

# === ОНОВЛЕННЯ ===
bd update BT-xxx --status in_progress
bd update BT-xxx --notes "progress update"
bd update BT-xxx --priority 0
bd close BT-xxx --reason "completed"
bd reopen BT-xxx --reason "found bug"

# === ЗАЛЕЖНОСТІ ===
bd dep add BT-new --depends-on BT-old --type blocks
bd dep add BT-task --depends-on BT-epic --type parent-child

# === UI ===
bdui start                      # Запустити UI
PORT=3002 bdui start &          # Background на custom port
bdui stop                       # Зупинити UI
open http://localhost:3002      # Відкрити в браузері
```

---

## ✅ Checklist: Правильне використання

**ПЕРЕД початком будь-якої роботи:**
- [ ] `bd list --status open` - перевірити контекст
- [ ] `bd show <epic-id>` - зрозуміти епік
- [ ] `bd create` - створити issue
- [ ] Відкрити UI та підтвердити що issue створено
- [ ] `bd update --status in_progress` - почати роботу

**ПІД ЧАС роботи:**
- [ ] Періодично `bd update --notes` з прогресом
- [ ] Кожен git commit має ref на bd issue
- [ ] Перевіряти UI для dependency graph

**ПІСЛЯ завершення:**
- [ ] `bd update --notes "commit: abc123, результат: ..."`
- [ ] `bd close --reason "детальна причина"`
- [ ] Відкрити UI та показати закритий issue
- [ ] Підтвердити що epic progress оновлено

---

**Версія:** 1.0.0
**Issue:** BT-l4x
**Дата:** 2025-11-14
