#!/usr/bin/env node
// Validates fastlane store-listing metadata against Google Play's field limits.
// Confirmed against the Play Console Help Center (see aso/keywords.md for sources):
// title <= 30 chars, short_description <= 80 chars, full_description <= 4000 chars.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = fileURLToPath(new URL('..', import.meta.url));
const METADATA_ROOT = join(APP_ROOT, 'android', 'fastlane', 'metadata', 'android');

const LIMITS = {
  'title.txt': 30,
  'short_description.txt': 80,
  'full_description.txt': 4000,
};

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

let locales;
try {
  locales = readdirSync(METADATA_ROOT).filter((entry) =>
    statSync(join(METADATA_ROOT, entry)).isDirectory()
  );
} catch (err) {
  console.error(`Could not read metadata directory at ${METADATA_ROOT}: ${err.message}`);
  process.exit(1);
}

if (locales.length === 0) {
  fail(`No locale directories found under ${METADATA_ROOT}`);
}

for (const locale of locales) {
  const localeDir = join(METADATA_ROOT, locale);
  for (const [file, limit] of Object.entries(LIMITS)) {
    const filePath = join(localeDir, file);
    let content;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      fail(`${locale}/${file} is missing`);
      continue;
    }
    const trimmed = content.replace(/\r\n/g, '\n').replace(/\n+$/, '');
    if (trimmed.length === 0) {
      fail(`${locale}/${file} is empty`);
      continue;
    }
    if (trimmed.length > limit) {
      fail(`${locale}/${file} is ${trimmed.length} chars, over the ${limit}-char limit`);
      continue;
    }
    console.log(`OK: ${locale}/${file} (${trimmed.length}/${limit} chars)`);
  }
}

if (process.exitCode === 1) {
  console.error('\naso:check failed — fix the files above before publishing.');
} else {
  console.log('\naso:check passed.');
}
