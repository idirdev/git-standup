/**
 * @file tests/index.test.js
 * @description Tests for git-standup
 * @author idirdev
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const {
  getStandup,
  scanRepos,
  getStandupMulti,
  formatAsText,
  formatAsMarkdown,
  formatAsJson,
  getLastWorkingDay,
} = require('../src/index.js');

/**
 * Creates a temporary git repo with one commit and returns its path.
 *
 * @param {string} [suffix='']
 * @returns {string}
 */
function makeTempRepo(suffix = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-test' + suffix + '-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });
  fs.writeFileSync(path.join(dir, 'file.txt'), 'hello');
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "initial commit"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

test('getLastWorkingDay returns a Date before today', () => {
  const lwd = getLastWorkingDay();
  assert.ok(lwd instanceof Date, 'should be a Date');
  assert.ok(lwd < new Date(), 'should be before today');
});

test('getLastWorkingDay is not a weekend', () => {
  const lwd = getLastWorkingDay();
  const day = lwd.getDay();
  assert.ok(day !== 0 && day !== 6, 'should not be Saturday or Sunday');
});

test('getStandup returns array', () => {
  const dir = makeTempRepo('a');
  const result = getStandup({ dir, days: 1 });
  assert.ok(Array.isArray(result), 'should be an array');
  dir; // keep ref
});

test('getStandup finds recent commit', () => {
  const dir = makeTempRepo('b');
  const result = getStandup({ dir, days: 1 });
  assert.ok(result.length >= 1, 'should have at least one commit');
  assert.ok(result[0].hash, 'commit should have hash');
  assert.ok(result[0].message, 'commit should have message');
});

test('getStandup filters by author', () => {
  const dir = makeTempRepo('c');
  const result = getStandup({ dir, days: 1, author: 'nonexistent-author-xyz' });
  assert.equal(result.length, 0, 'no commits for unknown author');
});

test('scanRepos finds git directories', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-scan-'));
  const repoA = path.join(root, 'repoA');
  const repoB = path.join(root, 'repoB');
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  execSync('git init', { cwd: repoA, stdio: 'pipe' });
  execSync('git init', { cwd: repoB, stdio: 'pipe' });
  const repos = scanRepos(root);
  assert.ok(repos.includes(repoA), 'should find repoA');
  assert.ok(repos.includes(repoB), 'should find repoB');
});

test('getStandupMulti aggregates across repos', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-multi-'));
  const repoA = path.join(root, 'repoA');
  const repoB = path.join(root, 'repoB');
  fs.mkdirSync(repoA);
  fs.mkdirSync(repoB);
  for (const r of [repoA, repoB]) {
    execSync('git init', { cwd: r, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: r, stdio: 'pipe' });
    execSync('git config user.name "T"', { cwd: r, stdio: 'pipe' });
    fs.writeFileSync(path.join(r, 'f.txt'), 'x');
    execSync('git add .', { cwd: r, stdio: 'pipe' });
    execSync('git commit -m "commit"', { cwd: r, stdio: 'pipe' });
  }
  const results = getStandupMulti(root, { days: 1 });
  assert.ok(results.length >= 1, 'should have at least 1 repo with commits');
});

test('formatAsText returns string with commits', () => {
  const dir = makeTempRepo('d');
  const commits = getStandup({ dir, days: 1 });
  const text = formatAsText(commits);
  assert.equal(typeof text, 'string', 'should be a string');
  assert.ok(text.length > 0, 'should not be empty');
});

test('formatAsMarkdown includes # Standup header', () => {
  const dir = makeTempRepo('e');
  const commits = getStandup({ dir, days: 1 });
  const md = formatAsMarkdown(commits);
  assert.ok(md.includes('# Standup'), 'should have Standup header');
});

test('formatAsJson returns valid JSON', () => {
  const dir = makeTempRepo('f');
  const commits = getStandup({ dir, days: 1 });
  const json = formatAsJson(commits);
  const parsed = JSON.parse(json);
  assert.ok(Array.isArray(parsed), 'should be an array');
});

test('formatAsText with no commits returns fallback message', () => {
  const text = formatAsText([]);
  assert.equal(text, 'No commits found.');
});
