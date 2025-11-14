# browser-tools - Project Context

**Version:** 1.0.0
**Language:** Ukrainian (communication) / English (code)
**Repository:** fork of badlogic/browser-tools

---

## ⚠️ CRITICAL: bd (beads) FIRST WORKFLOW

**bd є єдиним джерелом правди про стан проєкту після context reset.**

### ОБОВ'ЯЗКОВИЙ АЛГОРИТМ для будь-якої нової задачі:

```
1. bd list --status open           # Що зараз в роботі?
2. bd show <epic-id>                # Контекст епіку
3. bd create --title "..."          # Створити issue ПЕРЕД роботою
4. bd update <id> --status in_progress  # Почати роботу
5. [виконую роботу: код, тести, комміт]
6. bd update <id> --notes "commit: abc123, результат: ..."
7. bd close <id> --reason "..."     # Закрити з результатом
```

### ❌ ЗАБОРОНЕНО:

- Починати роботу без створення issue
- Створювати issues "задньо числом" після виконання
- Використовувати bd як "декорацію"
- Припускати що знаю контекст без перевірки bd

### ✅ ПРАВИЛЬНО:

- **Кожна нова фіча** = новий issue в bd ПЕРЕД початком
- **Кожен bug fix** = issue з типом "bug"
- **Кожен коміт** = посилання на issue в bd notes
- **Dependency graph** = зв'язувати issues через `bd dep add`

---

## Project Structure

```
browser-tools/
├── .beads/              # bd (beads) issue tracking database
├── .claude/             # Project-specific Claude context
├── budstandart/         # BUDSTANDART scraper tools
│   ├── browser-budstandart.js
│   ├── browser-gemini-upload.js
│   ├── .env             # Credentials (gitignored)
│   └── package.json
├── browser-*.js         # Other browser automation tools
└── README.md
```

---

## Current Work

**Active Epic:** BT-1d8 - План для KRTM: Завантаження 11 критичних документів

**Status:** 8/11 документів завантажено (72%)
- ✅ 5 нативних PDF
- ✅ 3 HTML→PDF conversions
- ❌ 3 not found: ДСТУ Б А.2.4-4:2009, ДБН В.1.2-14:2018, ДSТУ IEC 60870-5-104

**Latest features:**
- Document status checking (Діючий/Недіючий)
- HTML→PDF fallback for old documents
- Automatic warnings for inactive documents

---

## Budstandart Tools

### Authentication

Requires credentials in `.env`:
```bash
BUDSTANDART_EMAIL=your@email.com
BUDSTANDART_PASSWORD=yourpassword
GEMINI_API_KEY=your-api-key
GOOGLE_CLOUD_PROJECT=your-project-id
```

### Commands

```bash
# Search documents
./browser-budstandart.js search "ДБН В.2.6" --limit 10

# Get document details (includes status)
./browser-budstandart.js document 90348

# Download PDF (with fallback to HTML→PDF)
./browser-budstandart.js download 90348 --output doc.pdf
```

### Features

1. **Session persistence** - Перевіряє чи вже залогінений
2. **Status checking** - Витягує статус документа (Діючий/Недіючий)
3. **Automatic fallback** - PDF → HTML scraping → PDF conversion
4. **Warnings** - Попереджає про недіючі документи

---

## Git Workflow

**Branch:** `feature/budstandart-scraper`
**Remote:** `oblik-io/browser-tools` (fork)
**Upstream:** `badlogic/browser-tools` (original)

**Never push to upstream directly** - use fork workflow.

---

## Beads Integration

All work tracked in bd:
- Epic: BT-1d8 (KRTM documents)
- Tasks linked with dependencies
- Notes include git commit refs
- Status updated in real-time

**Access bd UI:** http://localhost:3002

---

## Reality Check Protocol

З CLAUDE.md (global principles):

1. **NO ASSUMPTIONS** - Завжди перевіряти bd перед роботою
2. **BRUTAL HONESTY** - bd має відображати РЕАЛЬНИЙ стан
3. **Quality > Speed** - Краще правильно оновити bd ніж швидко закомітити
4. **One Feature at a Time** - Закрити issue перед наступним

---

**Goal:** bd як single source of truth для decision history, git для code history.
