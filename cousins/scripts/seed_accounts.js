#!/usr/bin/env node
// cousins/scripts/seed_accounts.js
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hashPin, randomSalt } from '../src/lib/hash.js';

const inputPath = fileURLToPath(new URL('../seed-data.local.json', import.meta.url));
const outputPath = fileURLToPath(new URL('../seed-accounts.generated.json', import.meta.url));

const input = JSON.parse(readFileSync(inputPath, 'utf8'));

const entries = [];
for (const { slug, name, pin, color } of input.accounts) {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error(`PIN for ${slug} must be exactly 4 digits`);
  }
  const salt = randomSalt();
  const pinHash = await hashPin(pin, salt);
  entries.push({ key: `account:${slug}`, value: JSON.stringify({ slug, name, color, salt, pinHash }) });
}

writeFileSync(outputPath, JSON.stringify(entries, null, 2));
console.log(`Wrote ${entries.length} accounts to seed-accounts.generated.json`);
console.log('Run: npx wrangler kv bulk put --namespace-id=<KV_NAMESPACE_ID> seed-accounts.generated.json');
