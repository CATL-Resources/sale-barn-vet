// Update CHANGELOG.md from the git history — APPEND-ONLY.
//
//   npm run changelog
//
// Reads the commit log and adds an entry for every commit that isn't already in
// CHANGELOG.md (matched by its short hash). It NEVER removes what's already
// there. New commits go on top of their section; everything already written
// stays exactly as it is. If there's nothing new, the file is left untouched.
//
// Why append-only: this repo squash-merges each pull request, so a merged PR is
// one commit on main with a plain subject (no "feat:" / "fix:" prefix). A
// from-scratch regenerate would drop the older, richer entries (their original
// per-branch commits no longer exist on main) and dump everything else into
// "Other". Append-only keeps the history that's already recorded and simply adds
// each newly merged commit.
//
// This is the *code* changelog (what changed in the repo). The hand-written
// product log lives in spec-changelog.md and is left alone.
//
// No dependencies -- just Node and git.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'CHANGELOG.md')

const HEADER = [
  '# Changelog',
  '',
  '_Generated from the git history by `npm run changelog` (append-only — it adds newly merged commits and never removes what is already here). The hand-written product log lives in `spec-changelog.md`._',
  '',
]

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
// The order sections appear in, plus a catch-all. Squash-merged PR subjects have
// no conventional prefix, so they land in "Other" — kept, not dropped.
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
const entryLine = (scope, desc, date, hash) => `- ${scope ? `**${scope}:** ` : ''}${desc} _(${date}, \`${hash}\`)_`

// Parse the current CHANGELOG.md into (a) the hashes it already records and
// (b) the entry lines it already has under each section heading — so we can keep
// every one of them.
function parseExisting() {
  let text = ''
  try {
    text = readFileSync(OUT, 'utf8')
  } catch {
    return { recorded: new Set(), sections: new Map(), order: [] }
  }
  const recorded = new Set([...text.matchAll(/`([0-9a-f]{7,40})`/g)].map((m) => m[1]))
  const sections = new Map()
  const order = []
  let current = null
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/)
    if (h) {
      current = h[1]
      if (!sections.has(current)) {
        sections.set(current, [])
        order.push(current)
      }
      continue
    }
    if (current && line.startsWith('- ')) sections.get(current).push(line)
  }
  return { recorded, sections, order }
}

const commits = readCommits()
const { recorded, sections, order: existingOrder } = parseExisting()

// Only the commits we haven't written yet, newest first (git log's default order).
const fresh = commits.filter((c) => !recorded.has(c.hash))

const hadFile = recorded.size > 0 || sections.size > 0
if (fresh.length === 0 && hadFile) {
  console.log('CHANGELOG.md is already up to date -- no new commits.')
  process.exit(0)
}

// Put each new commit on top of its section, keeping everything already there.
const freshBySection = new Map()
for (const c of fresh) {
  const { type, scope, desc } = parseSubject(c.subject)
  const label = (type && TYPE_TO_SECTION.get(type)) || 'Other'
  if (!freshBySection.has(label)) freshBySection.set(label, [])
  freshBySection.get(label).push(entryLine(scope, dropPrNumber(desc), c.date, c.hash))
}

// Section order: the known order first, then any extra headings the file already
// had, so nothing gets reordered away.
const labels = [...new Set([...SECTION_ORDER, ...existingOrder])]

const lines = [...HEADER]
for (const label of labels) {
  const freshLines = freshBySection.get(label) ?? []
  const oldLines = sections.get(label) ?? []
  const all = [...freshLines, ...oldLines]
  if (all.length === 0) continue
  lines.push(`## ${label}`, '', ...all, '')
}

writeFileSync(OUT, lines.join('\n').replace(/\n+$/, '\n'))

const added = SECTION_ORDER.map((l) => [l, (freshBySection.get(l) ?? []).length]).filter(([, n]) => n > 0)
console.log(`Added ${fresh.length} new commit${fresh.length === 1 ? '' : 's'} to CHANGELOG.md:`)
for (const [label, n] of added) console.log(`  ${label}: ${n}`)
