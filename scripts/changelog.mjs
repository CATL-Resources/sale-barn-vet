// Generate CHANGELOG.md from the git history.
//
//   npm run changelog
//
// Reads the commit log, groups commits by their conventional-commit type
// (feat / fix / docs / ...), and writes a plain-language CHANGELOG.md at the
// repo root. Re-running just regenerates the file from scratch -- safe to run
// anytime, and it picks up whatever you've committed so far.
//
// This is the *code* changelog (what changed in the repo). The hand-written
// product log lives in spec-changelog.md and is left alone.
//
// No dependencies -- just Node and git.

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'CHANGELOG.md')

// A friendly section heading for each conventional-commit type.
const TYPE_TO_SECTION = new Map([
  ['feat', 'New'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactor'],
  ['docs', 'Docs'],
  ['test', 'Tests'],
  ['build', 'Tooling'],
  ['ci', 'Tooling'],
  ['chore', 'Chores'],
  ['style', 'Style'],
  ['revert', 'Reverts'],
])
// The order sections appear in, plus a catch-all for anything non-conventional.
const SECTION_ORDER = [...new Set([...TYPE_TO_SECTION.values()]), 'Other']

// Unit separator: a control char that never appears in a commit subject, so we
// can split the three fields apart safely. (Built from a code point to keep the
// source file plain ASCII.)
const SEP = String.fromCharCode(31)

function readCommits() {
  let out
  try {
    out = execSync(`git log --no-merges --date=short --pretty=format:%h${SEP}%cd${SEP}%s`, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch {
    console.error('Could not read git history -- is this a git repo?')
    process.exit(1)
  }
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, date, subject] = line.split(SEP)
      return { hash, date, subject }
    })
}

// "feat(login): rebuild the sign-in screen (#25)" -> { type, scope, desc }
function parseSubject(subject) {
  const m = subject.match(/^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/)
  if (!m) return { type: null, scope: null, desc: subject }
  return { type: m[1].toLowerCase(), scope: m[2] || null, desc: m[4] }
}

const dropPrNumber = (desc) => desc.replace(/\s*\(#\d+\)\s*$/, '').trim()

const commits = readCommits()

const sections = new Map(SECTION_ORDER.map((label) => [label, []]))
for (const c of commits) {
  const { type, scope, desc } = parseSubject(c.subject)
  const label = (type && TYPE_TO_SECTION.get(type)) || 'Other'
  sections.get(label).push({ hash: c.hash, date: c.date, scope, desc: dropPrNumber(desc) })
}

const lines = [
  '# Changelog',
  '',
  '_Generated from the git history by `npm run changelog`. The hand-written product log lives in `spec-changelog.md`._',
  '',
]
for (const label of SECTION_ORDER) {
  const items = sections.get(label)
  if (items.length === 0) continue
  lines.push(`## ${label}`, '')
  for (const it of items) {
    const scope = it.scope ? `**${it.scope}:** ` : ''
    lines.push(`- ${scope}${it.desc} _(${it.date}, \`${it.hash}\`)_`)
  }
  lines.push('')
}

writeFileSync(OUT, lines.join('\n').replace(/\n+$/, '\n'))

const summary = SECTION_ORDER.map((l) => [l, sections.get(l).length]).filter(([, n]) => n > 0)
console.log(`Wrote CHANGELOG.md -- ${commits.length} commits:`)
for (const [label, n] of summary) console.log(`  ${label}: ${n}`)
