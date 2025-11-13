#!/usr/bin/env node

/**
 * Gemini File Search Uploader
 *
 * Upload documents to Gemini API File Search for semantic search
 * Requires GEMINI_API_KEY in .env file or environment variable
 *
 * Usage:
 *   browser-gemini-upload.js create-store <name>
 *   browser-gemini-upload.js upload <file-path> --store <store-name> [--display-name <name>]
 *   browser-gemini-upload.js list-stores
 *   browser-gemini-upload.js search <query> --store <store-name>
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const fileManager = new GoogleAIFileManager(API_KEY);

/**
 * Storage for file search stores (simple JSON file)
 */
const STORES_FILE = path.join(process.env.HOME, '.budstandart-gemini-stores.json');

function loadStores() {
  try {
    if (fs.existsSync(STORES_FILE)) {
      return JSON.parse(fs.readFileSync(STORES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Warning: Could not load stores file:', e.message);
  }
  return {};
}

function saveStores(stores) {
  try {
    fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2));
  } catch (e) {
    console.error('Warning: Could not save stores file:', e.message);
  }
}

/**
 * Create a file search store
 * Note: Using Files API as simple alternative to corpus API
 */
async function createStore(storeName) {
  console.error(`→ Creating store: ${storeName}`);

  const stores = loadStores();

  if (stores[storeName]) {
    console.error(`✓ Store "${storeName}" already exists`);
    return stores[storeName];
  }

  // Create store metadata
  const store = {
    name: storeName,
    created: new Date().toISOString(),
    files: []
  };

  stores[storeName] = store;
  saveStores(stores);

  console.error(`✓ Store created: ${storeName}`);
  return store;
}

/**
 * Upload file to Gemini and associate with store
 */
async function uploadFile(filePath, storeName, displayName = null) {
  console.error(`→ Uploading file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stores = loadStores();
  if (!stores[storeName]) {
    throw new Error(`Store "${storeName}" not found. Create it first with: create-store ${storeName}`);
  }

  // Upload file to Gemini
  const name = displayName || path.basename(filePath);
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: 'application/pdf',
    displayName: name
  });

  console.error(`✓ Uploaded: ${uploadResult.file.displayName}`);
  console.error(`  URI: ${uploadResult.file.uri}`);
  console.error(`  Size: ${uploadResult.file.sizeBytes} bytes`);

  // Add to store
  stores[storeName].files.push({
    name: uploadResult.file.name,
    displayName: uploadResult.file.displayName,
    uri: uploadResult.file.uri,
    mimeType: uploadResult.file.mimeType,
    sizeBytes: uploadResult.file.sizeBytes,
    uploadedAt: new Date().toISOString()
  });

  saveStores(stores);

  return uploadResult.file;
}

/**
 * List all stores
 */
function listStores() {
  const stores = loadStores();
  const storeList = Object.entries(stores).map(([name, store]) => ({
    name,
    created: store.created,
    filesCount: store.files.length,
    totalSize: store.files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0)
  }));

  return storeList;
}

/**
 * Get files in a store
 */
function getStoreFiles(storeName) {
  const stores = loadStores();
  if (!stores[storeName]) {
    throw new Error(`Store "${storeName}" not found`);
  }
  return stores[storeName].files;
}

/**
 * Search documents in store using Gemini
 */
async function searchDocuments(query, storeName) {
  console.error(`→ Searching in store: ${storeName}`);

  const stores = loadStores();
  if (!stores[storeName]) {
    throw new Error(`Store "${storeName}" not found`);
  }

  const files = stores[storeName].files;
  if (files.length === 0) {
    throw new Error(`Store "${storeName}" has no files`);
  }

  // Prepare model with file context
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  // Create parts array with all files in store
  const parts = [
    { text: query },
    ...files.map(f => ({
      fileData: {
        fileUri: f.uri,
        mimeType: f.mimeType
      }
    }))
  ];

  console.error(`  Files in context: ${files.length}`);

  const result = await model.generateContent(parts);
  const response = result.response;
  const text = response.text();

  return {
    query,
    store: storeName,
    filesCount: files.length,
    response: text
  };
}

/**
 * Delete a store
 */
function deleteStore(storeName) {
  const stores = loadStores();
  if (!stores[storeName]) {
    throw new Error(`Store "${storeName}" not found`);
  }

  delete stores[storeName];
  saveStores(stores);

  console.error(`✓ Deleted store: ${storeName}`);
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.error(`
Usage:
  browser-gemini-upload.js create-store <name>
  browser-gemini-upload.js upload <file-path> --store <store-name> [--display-name <name>]
  browser-gemini-upload.js list-stores
  browser-gemini-upload.js list-files --store <store-name>
  browser-gemini-upload.js search <query> --store <store-name>
  browser-gemini-upload.js delete-store <name>

Options:
  --store <name>         Store name (required for upload/search)
  --display-name <name>  Custom display name for uploaded file

Environment:
  GEMINI_API_KEY        Your Gemini API key (get from aistudio.google.com/apikey)

Examples:
  browser-gemini-upload.js create-store budstandart
  browser-gemini-upload.js upload document.pdf --store budstandart
  browser-gemini-upload.js search "ДБН вимоги до проєктування" --store budstandart
  browser-gemini-upload.js list-stores
`);
    process.exit(0);
  }

  const command = args[0];

  try {
    let result;

    switch (command) {
      case 'create-store': {
        const storeName = args[1];
        if (!storeName) {
          console.error('Error: Store name required');
          process.exit(1);
        }
        result = await createStore(storeName);
        break;
      }

      case 'upload': {
        const filePath = args[1];
        if (!filePath) {
          console.error('Error: File path required');
          process.exit(1);
        }

        const storeIndex = args.indexOf('--store');
        if (storeIndex === -1 || !args[storeIndex + 1]) {
          console.error('Error: --store flag required');
          process.exit(1);
        }
        const storeName = args[storeIndex + 1];

        const displayNameIndex = args.indexOf('--display-name');
        const displayName = displayNameIndex !== -1 ? args[displayNameIndex + 1] : null;

        result = await uploadFile(filePath, storeName, displayName);
        break;
      }

      case 'list-stores': {
        result = listStores();
        break;
      }

      case 'list-files': {
        const storeIndex = args.indexOf('--store');
        if (storeIndex === -1 || !args[storeIndex + 1]) {
          console.error('Error: --store flag required');
          process.exit(1);
        }
        const storeName = args[storeIndex + 1];
        result = getStoreFiles(storeName);
        break;
      }

      case 'search': {
        const query = args[1];
        if (!query) {
          console.error('Error: Search query required');
          process.exit(1);
        }

        const storeIndex = args.indexOf('--store');
        if (storeIndex === -1 || !args[storeIndex + 1]) {
          console.error('Error: --store flag required');
          process.exit(1);
        }
        const storeName = args[storeIndex + 1];

        result = await searchDocuments(query, storeName);
        break;
      }

      case 'delete-store': {
        const storeName = args[1];
        if (!storeName) {
          console.error('Error: Store name required');
          process.exit(1);
        }
        deleteStore(storeName);
        result = { deleted: storeName };
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
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createStore, uploadFile, listStores, searchDocuments, deleteStore };
