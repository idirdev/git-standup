#!/usr/bin/env node
/**
 * @file cli.js
 * @description CLI for git-standup
 * @author idirdev
 */

'use strict';

const { getStandup, getStandupMulti, formatAsText, formatAsMarkdown, formatAsJson } = require('../src/index.js');

const args = process.argv.slice(2);

function flag(name) {
  const i = args.indexOf(name);
  return i !== -1 ? i : -1;
}

function opt(name, def) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}

const days = Number(opt('--days', 1));
const author = opt('--author', '');
const dir = opt('--dir', process.cwd());
const format = opt('--format', 'text');
const recursive = flag('--recursive') !== -1;

let results;
if (recursive) {
  results = getStandupMulti(dir, { days, author });
} else {
  results = getStandup({ dir, days, author });
}

if (format === 'json') {
  console.log(formatAsJson(results));
} else if (format === 'markdown') {
  console.log(formatAsMarkdown(results));
} else {
  console.log(formatAsText(results));
}
