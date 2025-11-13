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
  console.error('→ Logging in to BUDSTANDART...');

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

  // Fill login form
  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);

  // Submit form
  await Promise.all([
    page.click('button[type="submit"], input[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  // Check if login successful
  const url = page.url();
  if (url.includes('login')) {
    throw new Error('Login failed. Check credentials.');
  }

  console.error('✓ Logged in successfully');
}

/**
 * Search for documents
 */
async function searchDocuments(page, query, limit = 20) {
  console.error(`→ Searching for: "${query}"`);

  const searchUrl = `${BASE_URL}/ua/search?q=${encodeURIComponent(query)}`;
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  const html = await page.content();
  const $ = cheerio.load(html);
  const results = [];

  // Parse search results
  $('.search-result-item').each((index, element) => {
    if (results.length >= limit) return false;

    const $el = $(element);
    const title = $el.find('.doc-title').text().trim();
    const docLink = $el.find('a.doc-link').attr('href');
    const id_doc = docLink ? docLink.match(/id_doc=(\d+)/)?.[1] : null;
    const status = $el.find('.doc-status').text().trim();
    const type = $el.find('.doc-type').text().trim();

    if (id_doc) {
      results.push({
        id_doc,
        title,
        url: `${BASE_URL}${docLink}`,
        status,
        type
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
 * Print document to PDF using Chrome Print to PDF
 */
async function printToPdf(page, id_doc, outputPath = null) {
  console.error(`→ Printing document ${id_doc} to PDF...`);

  // Navigate to document page
  const docUrl = `${BASE_URL}/ua/catalog/doc-page.html?id_doc=${id_doc}`;
  await page.goto(docUrl, { waitUntil: 'networkidle2' });

  // Get document title for filename
  const title = await page.evaluate(() => {
    const h1 = document.querySelector('h1.doc-title, h1');
    return h1 ? h1.textContent.trim() : `doc_${Date.now()}`;
  });

  // Generate safe filename
  const safeTitle = title
    .replace(/[^а-яА-ЯёЁa-zA-Z0-9\s\-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100);

  const filename = outputPath || `budstandart_${id_doc}_${safeTitle}.pdf`;

  // Print to PDF using Chrome
  const pdfBuffer = await page.pdf({
    path: filename,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1cm',
      right: '1cm',
      bottom: '1cm',
      left: '1cm'
    }
  });

  console.error(`✓ Saved to: ${filename}`);

  return {
    id_doc,
    title,
    url: docUrl,
    downloadPath: filename,
    size: pdfBuffer.length
  };
}

/**
 * Download PDF document (if direct PDF link available)
 */
async function downloadDocument(page, id_doc, outputPath = null) {
  const details = await getDocumentDetails(page, id_doc);

  if (!details.pdfUrl) {
    // If no direct PDF link, use print to PDF instead
    console.error('→ No direct PDF link found, using Print to PDF...');
    return printToPdf(page, id_doc, outputPath);
  }

  console.error(`→ Downloading PDF: ${details.pdfUrl}`);

  // Navigate to PDF and wait for download
  const response = await page.goto(details.pdfUrl, { waitUntil: 'networkidle2' });
  const buffer = await response.buffer();

  const filename = outputPath || `budstandart_${id_doc}.pdf`;
  const fs = await import('fs');
  fs.writeFileSync(filename, buffer);

  console.error(`✓ Downloaded to: ${filename}`);

  return {
    ...details,
    downloadPath: filename,
    size: buffer.length
  };
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.error(`
Usage:
  browser-budstandart.js search <query> [--limit <number>]
  browser-budstandart.js document <id_doc> [--download] [--output <path>]
  browser-budstandart.js print <id_doc> [--output <path>]
  browser-budstandart.js recent [--limit <number>]

Options:
  --email <email>       Login email (or set BUDSTANDART_EMAIL env var)
  --password <password> Login password (or set BUDSTANDART_PASSWORD env var)
  --limit <number>      Limit number of results (default: 20)
  --download            Download document PDF (if direct link available)
  --output <path>       Output path for downloaded/printed file

Examples:
  browser-budstandart.js search "ДБН" --limit 10
  browser-budstandart.js document 90348
  browser-budstandart.js print 90348
  browser-budstandart.js print 90348 --output custom.pdf
  browser-budstandart.js document 90348 --download
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

        if (args.includes('--download')) {
          const outputIndex = args.indexOf('--output');
          const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : null;
          result = await downloadDocument(page, id_doc, outputPath);
        } else {
          result = await getDocumentDetails(page, id_doc);
        }
        break;
      }

      case 'print': {
        const id_doc = args[1];
        if (!id_doc) {
          console.error('Error: Document ID required');
          process.exit(1);
        }
        const outputIndex = args.indexOf('--output');
        const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : null;
        result = await printToPdf(page, id_doc, outputPath);
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

export { login, searchDocuments, getDocumentDetails, printToPdf, downloadDocument, getRecentDocuments };
