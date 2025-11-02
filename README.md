# Scraping Tools

Minimal CDP tools for collaborative site exploration.

## Start Chrome

```bash
./src/scraping/tools/start.ts
```

Start Chrome on `:9222` with user's profile (cookies, logins).

## Navigate

```bash
./src/scraping/tools/nav.ts https://example.com
./src/scraping/tools/nav.ts https://example.com --new
```

Navigate current tab or open new tab.

## Execute Code

```bash
./src/scraping/tools/x.js 'document.title'
./src/scraping/tools/x.js 'document.querySelectorAll("a").length'
./src/scraping/tools/x.js 'Array.from(document.querySelectorAll("a")).map(a => ({text: a.textContent.trim(), href: a.href}))'
```

Execute arbitrary JavaScript in the active tab. Code runs in async context.

## Ask User to Pick Element

```bash
./src/scraping/tools/x.js 'await pick()'
./src/scraping/tools/x.js 'await pick("Click the article title")'
```

Show overlay and ask user to click an element. Returns:
```
tag: h1
id: title
class: article-headline
text: Breaking News Story
html: <h1 id="title" class="article-headline">Breaking News Story</h1>
```
