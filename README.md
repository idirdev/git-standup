# git-standup

> **[EN]** See what you worked on yesterday / last working day for standups.
> **[FR]** Voir ce que vous avez fait hier / dernier jour ouvre pour les standups.

---

## Features / Fonctionnalites

**[EN]**
- Show commits from the last working day
- Multi-repo support (scan subdirectories)
- Filter by author
- Customizable date range
- Markdown output for pasting in Slack/Teams

**[FR]**
- Afficher les commits du dernier jour ouvre
- Support multi-repo (scan des sous-repertoires)
- Filtrer par auteur
- Plage de dates personnalisable
- Sortie Markdown pour coller dans Slack/Teams

---

## Installation

```bash
npm install -g @idirdev/git-standup
```

---

## CLI Usage / Utilisation CLI

```bash
# What did I do yesterday?
git-standup

# Last 3 days
git-standup --days 3

# Specific author
git-standup --author "idirdev"

# Scan all repos in ~/projects
git-standup --dir ~/projects --recursive
```

### Example Output / Exemple de sortie

```
$ git-standup --days 2

my-api/ (2 commits)
  a1b2c3d  fix: resolve auth middleware race condition
  d4e5f6a  feat: add rate limiting to /api/users

my-frontend/ (1 commit)
  b7c8d9e  style: update dashboard layout for mobile

Total: 3 commits across 2 repos
```

---

## API (Programmatic) / API (Programmation)

```js
const { getStandup, scanRepos } = require('git-standup');

const standup = getStandup({ days: 1, author: 'idirdev' });
// => [{ repo: 'my-api', commits: [...] }]

const repos = scanRepos('~/projects');
// => ['~/projects/api', '~/projects/frontend']
```

---

## License

MIT - idirdev
