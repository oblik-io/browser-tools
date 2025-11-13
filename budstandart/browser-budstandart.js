#!/usr/bin/env node

/**
 * BUDSTANDART Scraper
 *
 * Fetches and downloads documents from online.budstandart.com
 * Requires authentication. Set credentials via .env file or environment variables:
 *   BUDSTANDART_EMAIL and BUDSTANDART_PASSWORD
 *
 * Usage:
 *   browser-budstandart.js search <query> [--limit <number>]
 *   browser-budstandart.js document <id_doc> [--download] [--output <path>]
 *   browser-budstandart.js recent [--limit <number>]
 *   browser-budstandart.js --email <email> --password <password> <command>
 */

import 'dotenv/config';
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://online.budstandart.com';
const LOGIN_URL = `${BASE_URL}/ua/login.html`;

/**
 * Find Chrome executable path
 */
function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    process.env.CHROME_PATH
  ];

  for (const path of paths) {
    if (path) {
      try {
        execSync(`test -f "${path}"`, { stdio: 'ignore' });
        return path;
      } catch (e) {
        continue;
      }
    }
  }
  throw new Error('Chrome not found. Set CHROME_PATH environment variable.');
}

/**
 * Connect to Chrome on localhost:9222
 */
async function connectToChrome() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    return browser;
  } catch (error) {
    throw new Error('Failed to connect to Chrome on :9222. Run browser-start.js first.');
  }
}

/**
 * Login to BUDSTANDART
 */
async function login(page, email, password) {
  console.error('→ Checking authentication...');

  await page.goto(BASE_URL + '/ua/', { waitUntil: 'networkidle2' });

  // Check if already logged in
  const isLoggedIn = await page.evaluate(() => {
    return document.body.textContent.includes('Доброго дня') ||
           document.body.textContent.includes('Особистий кабінет');
  });

  if (isLoggedIn) {
    console.error('✓ Already logged in (session active)');
    return;
  }

  console.error('→ Logging in to BUDSTANDART...');
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

  // Wait for login form
  await page.waitForTimeout(2000);

  // Try to find and fill login fields
  const loginFilled = await page.evaluate((email, password) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const loginInput = inputs.find(i => i.placeholder?.includes('Логін') || i.type === 'text');
    const passwordInput = inputs.find(i => i.placeholder?.includes('Пароль') || i.type === 'password');

    if (loginInput && passwordInput) {
      loginInput.value = email;
      passwordInput.value = password;

      // Find and click submit button
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const submitBtn = buttons.find(b => b.textContent?.includes('Увійти') || b.value?.includes('Увійти'));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
    }
    return false;
  }, email, password);

  if (!loginFilled) {
    throw new Error('Could not fill login form. Please login manually in the browser.');
  }

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

  // Verify login
  const loginSuccess = await page.evaluate(() => {
    return document.body.textContent.includes('Доброго дня') ||
           !document.body.textContent.includes('Вхід на сервіс');
  });

  if (!loginSuccess) {
    throw new Error('Login failed. Please check credentials or login manually.');
  }

  console.error('✓ Logged in successfully');
}

/**
 * Search for documents
 */
async function searchDocuments(page, query, limit = 20) {
  console.error(`→ Searching for: "${query}"`);

  const searchUrl = `${BASE_URL}/ua/catalog/searchdoc.html?request=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  const html = await page.content();
  const $ = cheerio.load(html);
  const results = [];

  // Parse search results - find all links with id_doc
  $('a[href*="id_doc"]').each((index, element) => {
    if (results.length >= limit) return false;

    const $el = $(element);
    const href = $el.attr('href');
    const id_doc = href ? href.match(/id_doc=(\d+)/)?.[1] : null;
    const title = $el.text().trim();

    // Filter out empty titles and duplicates
    if (id_doc && title && title.length > 10 && !results.find(r => r.id_doc === id_doc)) {
      results.push({
        id_doc,
        title,
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`
      });
    }
  });

  return results;
}

/**
 * Get recent documents
 */
async function getRecentDocuments(page, limit = 20) {
  console.error('→ Fetching recent documents...');

  await page.goto(`${BASE_URL}/ua/`, { waitUntil: 'networkidle2' });

  const html = await page.content();
  const $ = cheerio.load(html);
  const results = [];

  // Parse recent documents from main page
  $('a[href*="doc-page.html?id_doc="]').each((index, element) => {
    if (results.length >= limit) return false;

    const $el = $(element);
    const href = $el.attr('href');
    const id_doc = href.match(/id_doc=(\d+)/)?.[1];
    const title = $el.text().trim();

    if (id_doc && title && !results.find(r => r.id_doc === id_doc)) {
      results.push({
        id_doc,
        title,
        url: href.startsWith('http') ? href : `${BASE_URL}${href}`
      });
    }
  });

  return results;
}

/**
 * Get document details and metadata
 */
async function getDocumentDetails(page, id_doc) {
  console.error(`→ Fetching document ${id_doc}...`);

  const docUrl = `${BASE_URL}/ua/catalog/doc-page.html?id_doc=${id_doc}`;
  await page.goto(docUrl, { waitUntil: 'networkidle2' });

  const html = await page.content();
  const $ = cheerio.load(html);

  // Extract metadata
  const title = $('h1.doc-title, h1').first().text().trim();
  const metadata = {};

  $('.doc-metadata tr, .document-info tr').each((i, el) => {
    const $el = $(el);
    const key = $el.find('td, th').first().text().trim().replace(':', '');
    const value = $el.find('td').last().text().trim();
    if (key && value) {
      metadata[key] = value;
    }
  });

  // Find PDF download link
  let pdfUrl = null;
  $('a[href*=".pdf"], a[href*="download"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && (href.includes('.pdf') || href.includes('download'))) {
      pdfUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      return false;
    }
  });

  return {
    id_doc,
    title,
    url: docUrl,
    metadata,
    pdfUrl
  };
}

/**
 * Scrape HTML content for documents without PDF
 */
async function scrapeHtmlContent(page, id_doc, title, outputPath = null) {
  console.error(`→ No PDF found, scraping HTML content...`);

  const viewerUrl = `${BASE_URL}/ua/catalog/document.html?id_doc=${id_doc}`;
  await page.goto(viewerUrl, { waitUntil: 'networkidle2' });

  // Wait for content to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Extract main document content
  const content = await page.evaluate(() => {
    const mainContent = document.querySelector('#bsdoctext');
    if (!mainContent) return null;

    // Get clean HTML without scripts
    const clone = mainContent.cloneNode(true);

    // Remove script tags
    clone.querySelectorAll('script, style').forEach(el => el.remove());

    return {
      html: clone.innerHTML,
      text: clone.textContent.trim()
    };
  });

  if (!content || !content.html) {
    throw new Error(`Could not extract HTML content for document ${id_doc}`);
  }

  // Create full HTML document
  const fullHtml = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    table, th, td { border: 1px solid #ddd; }
    th, td { padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    h1, h2, h3, h4 { color: #333; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p><strong>Джерело:</strong> <a href="${viewerUrl}">${viewerUrl}</a></p>
  <hr>
  ${content.html}
</body>
</html>`;

  // Create safe filename
  const safeTitle = title
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 200);

  const filename = outputPath || `${safeTitle}.html`;

  // Save to file
  const fs = await import('fs');
  fs.writeFileSync(filename, fullHtml, 'utf-8');

  console.error(`✓ Scraped HTML to: ${filename}`);
  console.error(`✓ Size: ${fullHtml.length} bytes`);

  return {
    id_doc,
    title,
    url: viewerUrl,
    format: 'html',
    downloadPath: filename,
    size: fullHtml.length
  };
}

/**
 * Download PDF document directly from server
 */
async function downloadPdf(page, id_doc, outputPath = null) {
  console.error(`→ Downloading document ${id_doc}...`);

  // First get document title from doc-page
  const docPageUrl = `${BASE_URL}/ua/catalog/doc-page.html?id_doc=${id_doc}`;
  await page.goto(docPageUrl, { waitUntil: 'networkidle2' });

  const title = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.textContent.trim() : null;
  });

  if (!title) {
    throw new Error(`Could not extract title for document ${id_doc}`);
  }

  // Navigate to document viewer to get PDF URL
  const viewerUrl = `${BASE_URL}/ua/catalog/document.html?id_doc=${id_doc}`;
  await page.goto(viewerUrl, { waitUntil: 'networkidle2' });

  // Extract PDF URL from iframe
  const pdfUrl = await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      const viewerUrl = iframe.src;
      const match = viewerUrl.match(/file=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    }
    return null;
  });

  // Fallback to HTML scraping if no PDF found
  if (!pdfUrl) {
    console.error(`→ No PDF iframe found, falling back to HTML scraping`);
    return scrapeHtmlContent(page, id_doc, title, outputPath);
  }

  console.error(`→ Found PDF: ${pdfUrl}`);

  // Get cookies for authentication
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // Download PDF using fetch
  const response = await fetch(pdfUrl, {
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create safe filename from title
  const safeTitle = title
    .replace(/[\/\\?%*:|"<>]/g, '-')  // Replace invalid chars
    .replace(/\s+/g, '_')              // Replace spaces with underscore
    .replace(/_{2,}/g, '_')            // Remove duplicate underscores
    .replace(/^_|_$/g, '')             // Trim underscores
    .substring(0, 200);                // Limit length

  const filename = outputPath || `${safeTitle}.pdf`;

  // Save to file
  const fs = await import('fs');
  fs.writeFileSync(filename, buffer);

  console.error(`✓ Downloaded to: ${filename}`);
  console.error(`✓ Size: ${buffer.length} bytes`);

  return {
    id_doc,
    title,
    url: viewerUrl,
    pdfUrl,
    downloadPath: filename,
    size: buffer.length
  };
}

/**
 * Download PDF document - alias for downloadPdf for backward compatibility
 */
async function downloadDocument(page, id_doc, outputPath = null) {
  return downloadPdf(page, id_doc, outputPath);
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.error(`
Usage:
  browser-budstandart.js search <query> [--limit <number>]
  browser-budstandart.js document <id_doc> [--output <path>]
  browser-budstandart.js download <id_doc> [--output <path>]
  browser-budstandart.js recent [--limit <number>]

Options:
  --email <email>       Login email (or set BUDSTANDART_EMAIL env var)
  --password <password> Login password (or set BUDSTANDART_PASSWORD env var)
  --limit <number>      Limit number of results (default: 20)
  --output <path>       Output path for downloaded file

Examples:
  browser-budstandart.js search "ДБН" --limit 10
  browser-budstandart.js document 90348
  browser-budstandart.js download 90348
  browser-budstandart.js download 90348 --output my-doc.pdf
  browser-budstandart.js recent --limit 5
`);
    process.exit(0);
  }

  // Get credentials
  let email = process.env.BUDSTANDART_EMAIL;
  let password = process.env.BUDSTANDART_PASSWORD;

  const emailIndex = args.indexOf('--email');
  if (emailIndex !== -1 && args[emailIndex + 1]) {
    email = args[emailIndex + 1];
  }

  const passwordIndex = args.indexOf('--password');
  if (passwordIndex !== -1 && args[passwordIndex + 1]) {
    password = args[passwordIndex + 1];
  }

  if (!email || !password) {
    console.error('Error: Credentials required. Set BUDSTANDART_EMAIL and BUDSTANDART_PASSWORD environment variables or use --email and --password flags.');
    process.exit(1);
  }

  const command = args[0];
  const browser = await connectToChrome();
  const page = (await browser.pages())[0] || await browser.newPage();

  try {
    // Login first
    await login(page, email, password);

    let result;

    switch (command) {
      case 'search': {
        const query = args[1];
        if (!query) {
          console.error('Error: Search query required');
          process.exit(1);
        }
        const limitIndex = args.indexOf('--limit');
        const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 20;
        result = await searchDocuments(page, query, limit);
        break;
      }

      case 'document': {
        const id_doc = args[1];
        if (!id_doc) {
          console.error('Error: Document ID required');
          process.exit(1);
        }
        result = await getDocumentDetails(page, id_doc);
        break;
      }

      case 'download': {
        const id_doc = args[1];
        if (!id_doc) {
          console.error('Error: Document ID required');
          process.exit(1);
        }
        const outputIndex = args.indexOf('--output');
        const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : null;
        result = await downloadPdf(page, id_doc, outputPath);
        break;
      }

      case 'recent': {
        const limitIndex = args.indexOf('--limit');
        const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 20;
        result = await getRecentDocuments(page, limit);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await browser.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { login, searchDocuments, getDocumentDetails, downloadPdf, downloadDocument, getRecentDocuments };
