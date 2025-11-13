# BUDSTANDART Tools

Інструменти для роботи з [online.budstandart.com](https://online.budstandart.com) та інтеграції з Gemini API File Search.

## Вимоги

- Node.js 18+
- Chrome з remote debugging на порту 9222
- Обліковий запис на budstandart.com
- Gemini API key (опціонально, для File Search)

## Встановлення

```bash
cd budstandart
npm install
```

## Налаштування

### Credentials BUDSTANDART

```bash
export BUDSTANDART_EMAIL="your@email.com"
export BUDSTANDART_PASSWORD="your-password"
```

### Gemini API Key (опціонально)

Отримати на [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

```bash
export GEMINI_API_KEY="your-api-key"
```

## BUDSTANDART Scraper

### Запуск Chrome

```bash
../browser-start.js              # Fresh profile
../browser-start.js --profile    # З збереженням cookies/логінів
```

### Команди

#### Пошук документів

```bash
node browser-budstandart.js search "ДБН" --limit 10
node browser-budstandart.js search "ДСТУ 4163" --limit 5
```

Повертає список документів з id, назвою, URL, статусом.

#### Деталі документа

```bash
node browser-budstandart.js document 90348
```

Показує метадані: назва, дата набуття чинності, статус, розробник, тощо.

#### Print to PDF

```bash
node browser-budstandart.js print 90348
node browser-budstandart.js print 90348 --output custom-name.pdf
```

Зберігає документ як PDF використовуючи Chrome Print to PDF. Автоматично генерує безпечну назву файлу з підтримкою українських символів.

#### Нові надходження

```bash
node browser-budstandart.js recent --limit 20
```

Показує останні додані документи на сайті.

## Gemini File Search Integration

### Створення сховища

```bash
node browser-gemini-upload.js create-store budstandart
```

Створює логічне сховище для організації документів.

### Upload документів

```bash
node browser-gemini-upload.js upload document.pdf --store budstandart
node browser-gemini-upload.js upload dstu-4163.pdf --store budstandart --display-name "ДСТУ 4163:2020"
```

### Пошук по документах

```bash
node browser-gemini-upload.js search "які вимоги до оформлення документів?" --store budstandart
node browser-gemini-upload.js search "ДБН норми проєктування" --store budstandart
```

Використовує Gemini для семантичного пошуку природною мовою (українською).

### Перегляд сховищ та файлів

```bash
node browser-gemini-upload.js list-stores
node browser-gemini-upload.js list-files --store budstandart
```

## Повний Workflow

### 1. Підготовка

```bash
# Запустити Chrome
../browser-start.js

# Встановити credentials
export BUDSTANDART_EMAIL="your@email.com"
export BUDSTANDART_PASSWORD="your-password"
export GEMINI_API_KEY="your-api-key"
```

### 2. Створити Gemini store

```bash
node browser-gemini-upload.js create-store budstandart
```

### 3. Знайти та завантажити документи

```bash
# Пошук
node browser-budstandart.js search "ДБН проєктування"

# Print to PDF (використай id_doc зі search)
node browser-budstandart.js print 90348 --output dstu-4163.pdf
node browser-budstandart.js print 58105 --output dbn-a-2-2-3.pdf
```

### 4. Upload до Gemini

```bash
node browser-gemini-upload.js upload dstu-4163.pdf --store budstandart
node browser-gemini-upload.js upload dbn-a-2-2-3.pdf --store budstandart
```

### 5. Пошук природною мовою

```bash
node browser-gemini-upload.js search "які вимоги до складу проєктної документації?" --store budstandart
```

## Use Cases

### Для проєкту KRTM

Доступ до найсвіжіших законів, постанов, наказів, змін для compliance checks:

```bash
# Пошук конкретних нормативів
node browser-budstandart.js search "охорона праці будівництво"

# Завантаження всіх релевантних документів
node browser-budstandart.js print <id> --output docs/<name>.pdf

# Семантичний пошук по всій базі
node browser-gemini-upload.js search "вимоги до електробезпеки" --store krtm-regulations
```

### Моніторинг змін

```bash
# Щоденна перевірка нових надходжень
node browser-budstandart.js recent --limit 50 > new-docs-$(date +%Y-%m-%d).json
```

## Архітектура

```
budstandart/
├── browser-budstandart.js      # Scraper для budstandart.com
├── browser-gemini-upload.js    # Gemini API інтеграція
├── package.json                # Dependencies
├── README.md                   # Документація
├── .beads/                     # Issue tracking (gitignored)
└── .claude/                    # Claude Code налаштування
```

## Налаштування для інших проєктів

Скопіюй директорію `budstandart/` в будь-який проєкт:

```bash
cp -r budstandart /path/to/your/project/
cd /path/to/your/project/budstandart
npm install
```

Інструменти універсальні та не прив'язані до конкретного проєкту.

## Обмеження

### BUDSTANDART
- Потребує активний обліковий запис
- Залежить від структури сайту (може змінитись)
- Chrome повинен бути запущений на :9222

### Gemini API
- Free tier: 1 GB storage
- Максимальний розмір файлу: 100 MB
- Ціна: $0.15 за 1M токенів під час індексації

## Troubleshooting

### Chrome не підключається

```bash
# Перевір чи запущений Chrome на :9222
lsof -i :9222

# Перезапусти
../browser-start.js
```

### Помилка логіну BUDSTANDART

- Перевір credentials
- Можливо потрібна captcha (зайди вручну в браузері)
- Перевір чи не змінилась форма логіну

### Gemini API errors

- Перевір API key
- Перевір ліміти (free tier)
- Перевір розмір файлу (max 100MB)

## License

MIT
