'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const filename = process.argv[2] || 'index.html';
const html = fs.readFileSync(filename, 'utf8');
const form = html.match(/<form\b[^>]*\bid=["']form["'][^>]*>([\s\S]*?)<\/form\s*>/i);
assert(form, 'Main form not found');
assert(!/<(?:button|input|select|textarea)\b[^>]*\bid=["']reset["'][^>]*>/i.test(form[1]), 'A form control with id="reset" shadows HTMLFormElement.reset()');
let count = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
  const attrs = match[1];
  if (/\bsrc\s*=/i.test(attrs)) continue;
  if (/\btype\s*=\s*["'](?:application\/ld\+json|application\/json|importmap)["']/i.test(attrs)) continue;
  assert(!/\btype\s*=\s*["']module["']/i.test(attrs), 'Module scripts require a separate syntax check');
  new vm.Script(match[2], { filename: filename + ':inline-' + (++count) });
}
assert(count > 0, 'No inline scripts found; review the entry point');
process.stdout.write('Parsed ' + count + ' inline script(s) successfully.\n');
