# Керівництво з встановлення та налаштування

Повна інструкція для роботи з browser-tools budstandart та Gemini API File Search.

## Передумови

- **Node.js 18+** - перевір: `node --version`
- **Chrome** - встановлений на системі
- **Git** - для клонування репозиторію
- **Обліковий запис на budstandart.com** - з доступом до документів
- **Google Cloud Account** - для Gemini API

---

## Крок 1: Встановлення

### 1.1 Клонування репозиторію

```bash
# Клонуємо з oblik-io fork
git clone https://github.com/oblik-io/browser-tools.git
cd browser-tools

# Переходимо на тестову гілку
git checkout feature/budstandart-scraper

# Переходимо в директорію budstandart
cd budstandart
```

### 1.2 Встановлення залежностей

```bash
npm install
```

Це встановить:
- `puppeteer-core` - для керування Chrome
- `cheerio` - для парсингу HTML
- `@google/generative-ai` - для Gemini API

---

## Крок 2: Налаштування BUDSTANDART

### 2.1 Credentials через .env файл

Створи `.env` файл в директорії `budstandart/`:

```bash
cd budstandart
cp .env.example .env
```

Відкрий `.env` та заповни своїми даними:

```bash
# BUDSTANDART Credentials
BUDSTANDART_EMAIL=your-email@example.com
BUDSTANDART_PASSWORD=your-password

# Gemini API Configuration
GEMINI_API_KEY=AIza...your-api-key
GOOGLE_CLOUD_PROJECT=fine-eye-464103-e9
```

**Важливо:** `.env` файл вже додано в `.gitignore` і не буде commitитись в git.

### 2.2 Альтернатива: Environment Variables

Якщо не хочеш використовувати `.env`, можеш експортувати через shell:

```bash
export BUDSTANDART_EMAIL="your-email@example.com"
export BUDSTANDART_PASSWORD="your-password"
export GEMINI_API_KEY="AIza..."
export GOOGLE_CLOUD_PROJECT="fine-eye-464103-e9"
```

### 2.3 Запуск Chrome з remote debugging

З кореня `browser-tools/`:

```bash
cd ..
./browser-start.js              # Чистий профіль
# або
./browser-start.js --profile    # Зі збереженням cookies/логінів
```

Chrome запуститься на порту `:9222` з remote debugging.

**Важливо:** Не закривай це вікно Chrome під час роботи зі скриптами.

---

## Крок 3: Налаштування Gemini API File Search

### 3.1 Google Cloud Project

Твій проєкт: **`fine-eye-464103-e9`**
Email: **`sdoroshenko@gmail.com`**

### 3.2 Отримання API Key

#### Варіант A: Через AI Studio (простіше)

1. Відкрий [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Авторизуйся як `sdoroshenko@gmail.com`
3. Натисни **"Create API Key"**
4. Вибери проєкт: **`fine-eye-464103-e9`**
5. Скопіюй згенерований ключ

**Про плани:**
- **Free tier**: 60 requests/min, 1 GB storage
- **Google AI Pro (paid)**: Вищі ліміти + доступ до GUI demo "Ask the Manual" в AI Studio
- **Pay-as-you-go**: $0.15 за 1M токенів (індексація)

#### Варіант B: Через gcloud CLI

```bash
# Авторизуйся (якщо ще не зробив)
gcloud auth login

# Встанови проєкт
gcloud config set project fine-eye-464103-e9

# Увімкни Generative AI API
gcloud services enable generativelanguage.googleapis.com

# Створи API key (через Console - API Keys)
# Або використай Service Account (рекомендовано для production)
```

**Примітка:** AI Studio - простіший варіант для розробки/тестування.

### 3.3 Додавання API Key в .env

API key вже додається в `.env` файл (з кроку 2.1):

```bash
# Gemini API Configuration
GEMINI_API_KEY=AIza...your-api-key
GOOGLE_CLOUD_PROJECT=fine-eye-464103-e9
```

### 3.4 Перевірка налаштувань

```bash
# Перевір .env файл
cat .env

# Або перевір змінні (якщо використовуєш export)
echo $BUDSTANDART_EMAIL
echo $GEMINI_API_KEY
```

---

## Крок 4: Тестування

### 4.1 Тест BUDSTANDART Scraper

```bash
cd budstandart

# Пошук документів
node browser-budstandart.js search "ДБН" --limit 5

# Деталі документа
node browser-budstandart.js document 90348

# Print to PDF
node browser-budstandart.js print 90348 --output test-document.pdf

# Перевір що PDF створено
ls -lh test-document.pdf
```

**Очікувані результати:**
- Скрипт логіниться на budstandart.com
- Показує JSON з результатами
- Створює PDF файл

### 4.2 Тест Gemini File Search

```bash
# Створи store для тестування
node browser-gemini-upload.js create-store test-budstandart

# Upload PDF (використай PDF з попереднього кроку)
node browser-gemini-upload.js upload test-document.pdf --store test-budstandart

# Виконай пошук
node browser-gemini-upload.js search "які основні вимоги до документації?" --store test-budstandart

# Перегляд stores
node browser-gemini-upload.js list-stores

# Перегляд файлів
node browser-gemini-upload.js list-files --store test-budstandart
```

**Очікувані результати:**
- Store створюється
- Файл завантажується до Gemini
- Пошук повертає релевантні відповіді українською

---

## Крок 5: Повний Workflow

### Сценарій: Збір документів для проєкту KRTM

```bash
cd budstandart

# 1. Створи Gemini store для проєкту
node browser-gemini-upload.js create-store krtm-regulations

# 2. Знайди релевантні документи
node browser-budstandart.js search "охорона праці будівництво" --limit 20 > search-results.json

# 3. Переглянь результати і вибери потрібні id_doc
cat search-results.json | jq '.[].id_doc'

# 4. Завантаж документи (приклад з кількома ID)
node browser-budstandart.js print 90348 --output docs/dstu-4163.pdf
node browser-budstandart.js print 58105 --output docs/dbn-a-2-2-3.pdf
node browser-budstandart.js print 25399 --output docs/dbn-a-3-2-2.pdf

# 5. Upload всіх документів до Gemini
for pdf in docs/*.pdf; do
  node browser-gemini-upload.js upload "$pdf" --store krtm-regulations
done

# 6. Перевір що всі файли завантажені
node browser-gemini-upload.js list-files --store krtm-regulations

# 7. Виконуй пошуки по всій базі
node browser-gemini-upload.js search "які вимоги до електробезпеки на будівництві?" --store krtm-regulations
node browser-gemini-upload.js search "норми охорони праці для підземних робіт" --store krtm-regulations
```

---

## Налаштування для проєкту KRTM

### Структура в проєкті

```bash
cd /Users/sd/github/krtm

# Створи директорію для regulations
mkdir -p regulations/budstandart

# Скопіюй скрипти (або створи symlink)
ln -s /Users/sd/github/browser-tools/budstandart regulations/budstandart

# Або додай в package.json scripts:
```

У `/Users/sd/github/krtm/package.json`:

```json
{
  "scripts": {
    "regs:search": "node ../browser-tools/budstandart/browser-budstandart.js search",
    "regs:print": "node ../browser-tools/budstandart/browser-budstandart.js print",
    "regs:upload": "node ../browser-tools/budstandart/browser-gemini-upload.js upload",
    "regs:query": "node ../browser-tools/budstandart/browser-gemini-upload.js search"
  }
}
```

Використання:
```bash
npm run regs:search "ДБН охорона праці"
npm run regs:print 90348 -- --output regulations/dstu-4163.pdf
npm run regs:query "вимоги до документації" -- --store krtm
```

---

## Troubleshooting

### Chrome не підключається

**Помилка:** `Failed to connect to Chrome on :9222`

**Рішення:**
```bash
# Перевір чи запущений Chrome
lsof -i :9222

# Якщо ні - запусти
cd /Users/sd/github/browser-tools
./browser-start.js
```

### Помилка логіну BUDSTANDART

**Помилка:** `Login failed. Check credentials.`

**Рішення:**
1. Перевір credentials:
   ```bash
   echo $BUDSTANDART_EMAIL
   echo $BUDSTANDART_PASSWORD
   ```
2. Спробуй зайти вручну в браузері (можливо captcha)
3. Якщо змінилась форма логіну - повідом мене

### Gemini API errors

**Помилка:** `Error: API key not valid`

**Рішення:**
1. Перевір API key:
   ```bash
   echo $GEMINI_API_KEY
   ```
2. Перевір чи API увімкнений для проєкту:
   ```bash
   gcloud services list --project=fine-eye-464103-e9 | grep generativelanguage
   ```
3. Якщо не увімкнений:
   ```bash
   gcloud services enable generativelanguage.googleapis.com --project=fine-eye-464103-e9
   ```

**Помилка:** `Quota exceeded`

**Рішення:**
- Free tier: 1 GB storage, 60 requests/minute
- Перевір використання: [console.cloud.google.com](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas?project=fine-eye-464103-e9)
- Можливо треба upgrade до paid tier

### PDF не створюється

**Помилка:** Файл порожній або помилка під час print

**Рішення:**
1. Перевір чи Chrome запущений
2. Перевір чи документ доступний після логіну
3. Спробуй інший документ (деякі можуть бути захищені)

---

## Обмеження

### BUDSTANDART
- ✅ Потребує активний платний обліковий запис
- ⚠️ Залежить від структури сайту (може змінитись)
- ⚠️ Chrome повинен працювати на :9222
- ⚠️ Деякі документи можуть бути недоступні для print

### Gemini API
- **Free tier:**
  - 1 GB дискового простору
  - 60 requests/minute
  - 1,500 requests/day
- **Обмеження файлів:**
  - Максимум 100 MB per file
  - Підтримувані формати: PDF, TXT, HTML, MD
- **Ціни (paid tier):**
  - $0.15 за 1M токенів (індексація)
  - $0.30 за 1M токенів (query)

---

## Автоматизація (опціонально)

### Cron job для моніторингу нових документів

Створи `/Users/sd/scripts/budstandart-monitor.sh`:

```bash
#!/bin/bash
set -e

# Source credentials
source ~/.zshrc

# Directories
WORK_DIR="/Users/sd/github/browser-tools/budstandart"
OUTPUT_DIR="/Users/sd/regulations/budstandart/new"
LOG_FILE="/Users/sd/logs/budstandart-monitor.log"

mkdir -p "$OUTPUT_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

cd "$WORK_DIR"

echo "[$(date)] Checking for new documents..." >> "$LOG_FILE"

# Отримай нові документи
node browser-budstandart.js recent --limit 50 > "$OUTPUT_DIR/new-$(date +%Y-%m-%d).json"

echo "[$(date)] Done. Results saved to $OUTPUT_DIR" >> "$LOG_FILE"
```

Зроби executable:
```bash
chmod +x /Users/sd/scripts/budstandart-monitor.sh
```

Додай в crontab (`crontab -e`):
```bash
# Щоденна перевірка о 9:00
0 9 * * * /Users/sd/scripts/budstandart-monitor.sh
```

---

## GUI інтерфейс (опціонально)

### AI Studio Demo "Ask the Manual"

**Доступ:** https://aistudio.google.com/

**Що можна робити:**
- ✅ Upload документи через drag & drop
- ✅ Задавати питання природною мовою
- ✅ Отримувати відповіді з citations
- ✅ Тестувати File Search як end-user

**Вимоги:**
- 🔑 Paid API key (входить в **Google AI Pro** план)
- 💰 Або active billing account з pay-as-you-go

**Обмеження GUI:**
- ❌ Не можна переглянути список stores
- ❌ Не можна управляти stores (create/delete)
- ❌ Не можна бачити embeddings та індекси
- ❌ Тільки для тестування, не для адміністрування

**Для адміністрування:** Використовуй наш CLI tool `browser-gemini-upload.js`

---

## Додаткові ресурси

### Документація
- [Gemini API File Search](https://ai.google.dev/gemini-api/docs/file-search)
- [Google AI Studio](https://aistudio.google.com/)
- [Google AI Pro Plan](https://ai.google/discover/aipricing/)
- [Browser Tools blog](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)

### Корисні команди

```bash
# Перегляд всіх stores
node browser-gemini-upload.js list-stores | jq

# Пошук по всіх файлах в store
node browser-gemini-upload.js list-files --store krtm-regulations | jq '.[].displayName'

# Bulk download з search results
cat search-results.json | jq -r '.[].id_doc' | while read id; do
  node browser-budstandart.js print "$id" --output "docs/doc-$id.pdf"
done

# Видалення store (через веб console)
# Stores зберігаються в ~/.budstandart-gemini-stores.json
```

---

## Підтримка

**GitHub:** https://github.com/oblik-io/browser-tools
**Гілка:** `feature/budstandart-scraper`

Для питань або проблем - створюй issue або звертайся до мене.

---

**Версія:** 1.0
**Останнє оновлення:** 2025-11-13
**Автор:** Claude Code + @joyshmitz
