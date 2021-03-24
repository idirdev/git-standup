/**
 * @file index.js
 * @description Git standup helper — show what you worked on recently
 * @author idirdev
 * @module git-standup
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Default git log format tokens.
 * @constant {string}
 */
const LOG_FORMAT = '%H|%ad|%s|%an';

/**
 * Returns the previous business day (Mon–Fri) relative to today.
 * Skips weekends so Monday → Friday, Tuesday → Monday, etc.
 *
 * @returns {Date} The last working day as a Date object.
 */
function getLastWorkingDay() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 6=Sat
  const daysBack = day === 1 ? 3 : day === 0 ? 2 : 1;
  d.setDate(d.getDate() - daysBack);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats a Date as YYYY-MM-DD.
 *
 * @param {Date} d
 * @returns {string}
 */
function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Runs git log in a given directory and returns parsed commit objects.
 *
 * @param {Object}  [opts={}]         Options.
 * @param {string}  [opts.dir='.']    Directory to run git in.
 * @param {number}  [opts.days=1]     How many days back to include.
 * @param {string}  [opts.author='']  Filter by author name/email substring.
 * @returns {{ hash: string, date: string, message: string, author: string }[]}
 */
function getStandup(opts = {}) {
  const dir = opts.dir || '.';
  const days = opts.days != null ? opts.days : 1;
  const author = opts.author || '';

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);
  const sinceStr = toDateString(since);

  let cmd = `git log --since="${sinceStr}" --date=short --format="${LOG_FORMAT}"`;
  if (author) {
    cmd += ` --author="${author}"`;
  }

  let raw = '';
  try {
    raw = execSync(cmd, { cwd: dir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    return [];
  }

  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...rest] = line.split('|');
      // author is last segment; message is everything in between
      const author = rest.pop() || '';
      const message = rest.join('|');
      return { hash, date, message, author };
    });
}

/**
 * Recursively scans a directory for git repositories (directories containing .git).
 *
 * @param {string} dir Root directory to scan.
 * @param {number} [maxDepth=3] Maximum recursion depth.
 * @returns {string[]} Array of absolute paths to git repo roots.
 */
function scanRepos(dir, maxDepth = 3) {
  const results = [];

  function walk(current, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    const hasGit = entries.some((e) => e.isDirectory() && e.name === '.git');
    if (hasGit) {
      results.push(current);
      return; // don't descend into nested git repos
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walk(path.join(current, entry.name), depth + 1);
      }
    }
  }

  walk(dir, 0);
  return results;
}

/**
 * Runs getStandup across every git repo found under dir.
 *
 * @param {string} dir Root directory to scan.
 * @param {Object} [opts={}] Options forwarded to getStandup.
 * @returns {{ repo: string, commits: ReturnType<getStandup> }[]}
 */
function getStandupMulti(dir, opts = {}) {
  const repos = scanRepos(dir);
  return repos
    .map((repo) => ({
      repo,
      commits: getStandup({ ...opts, dir: repo }),
    }))
    .filter((r) => r.commits.length > 0);
}

/**
 * Formats standup results as plain text.
 *
 * @param {ReturnType<getStandupMulti>|ReturnType<getStandup>} results
 * @returns {string}
 */
function formatAsText(results) {
  if (!Array.isArray(results) || results.length === 0) return 'No commits found.';
  // Normalise: accept both flat array and multi-repo array
  const isMulti = results[0] && results[0].repo !== undefined;
  const lines = [];
  if (isMulti) {
    for (const { repo, commits } of results) {
      lines.push(`\n[${path.basename(repo)}]`);
      for (const c of commits) lines.push(`  ${c.date}  ${c.hash.slice(0, 7)}  ${c.message}`);
    }
  } else {
    for (const c of results) lines.push(`${c.date}  ${c.hash.slice(0, 7)}  ${c.message}`);
  }
  return lines.join('\n').trim();
}

/**
 * Formats standup results as Markdown.
 *
 * @param {ReturnType<getStandupMulti>|ReturnType<getStandup>} results
 * @returns {string}
 */
function formatAsMarkdown(results) {
  if (!Array.isArray(results) || results.length === 0) return '_No commits found._';
  const isMulti = results[0] && results[0].repo !== undefined;
  const lines = ['# Standup', ''];
  if (isMulti) {
    for (const { repo, commits } of results) {
      lines.push(`## ${path.basename(repo)}\n`);
      for (const c of commits) lines.push('- `' + c.hash.slice(0, 7) + '` **' + c.date + '** ' + c.message);
      lines.push('');
    }
  } else {
    for (const c of results) lines.push('- `' + c.hash.slice(0, 7) + '` **' + c.date + '** ' + c.message);
  }
  return lines.join('\n').trim();
}

/**
 * Formats standup results as a JSON string.
 *
 * @param {ReturnType<getStandupMulti>|ReturnType<getStandup>} results
 * @returns {string}
 */
function formatAsJson(results) {
  return JSON.stringify(results, null, 2);
}

module.exports = {
  getStandup,
  scanRepos,
  getStandupMulti,
  formatAsText,
  formatAsMarkdown,
  formatAsJson,
  getLastWorkingDay,
};
