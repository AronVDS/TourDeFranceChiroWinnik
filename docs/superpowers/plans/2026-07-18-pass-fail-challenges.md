# Geslaagd/Niet Geslaagd Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-challenge `result_mode` ('ranking' | 'pass_fail'). Pass/fail challenges let the admin mark each team geslaagd/niet geslaagd; niet-geslaagde teams always score 0, geslaagde teams are ranked among themselves using the existing points table (indexed against the full team count, not just the geslaagde subset).

**Architecture:** The points-calculation formula that already exists inline in `AppContext.jsx`'s `setResults` gets extracted into a pure, exported `buildChallengeResults` helper in `src/utils/points.js` (which also finally puts the existing-but-unused `calcResultPoints` to use). `setResults` gains an optional 4th argument (`failedTeamIds`) and delegates to that helper — ranking-mode callers are unaffected (empty array, identical output to today). The Admin `ResultsTab` UI branches on `challenge.result_mode` into either the existing single ranked list (ranking mode, pixel-identical to today) or two sections — "✅ Geslaagd" (ranked, same UI) and "❌ Niet geslaagd" (flat list) — with per-team toggle buttons moving teams between them. `ChallengeCard` (public Stage page) gets a small conditional in its existing results table to show `❌ (niet geslaagd)` instead of a rank number.

**Tech Stack:** React 19, Vite, Tailwind v4, Framer Motion, plain `localStorage` (no backend, no test framework in this repo).

**Testing approach:** No test runner exists in this repo. The new pure logic (`buildChallengeResults`) is verified with a throwaway Node ESM script (written, run, confirmed, deleted — not committed), same pattern as prior features in this repo. UI-touching tasks are verified with `npm run build` + a dev-server route check. Task 5 is a full interactive click-through using the `claude-in-chrome` browser tools (available in this environment, unlike when earlier features in this repo were planned) — it exercises the actual admin flow end-to-end instead of relying on a static code trace.

## Global Constraints

- `challenge.result_mode` defaults to `'ranking'` wherever it's read (`challenge.result_mode ?? 'ranking'`) — existing challenges in localStorage have no such field and must keep working exactly as today. No migration step.
- Geslaagde teams' punten = `calcResultPoints(index, totalTeams, isPowerStage)` where `index` is the 0-based rank **within the geslaagde groep only**, and `totalTeams` is the **full** team count (never just the geslaagde subset) — confirmed by the user: with 2 of 4 teams geslaagd, the 1st geslaagde team gets 1e-plaats-punten, not 3e-plaats-punten.
- Niet-geslaagde teams: `punten = 0`, `geslaagd: false`, `positie` continues sequentially after the last geslaagde positie (so existing "sort by positie" display logic keeps working unchanged).
- `spelers` (wie voerde de opdracht uit) stays available for **all** teams in **both** modes.
- `geslaagd` field is only ever present on results for `pass_fail`-mode challenges; ranking-mode results never get this field (matches today's shape exactly).
- No changes to `recalculateAllPoints`, `Rankings.jsx`, `Live.jsx`, `Stage.jsx`, `utils/mvp.js` — none of them need to change for this feature.
- No bulk-toggle ("mark all geslaagd") — per-team buttons only.

---

## Task 1: Points calculation — `buildChallengeResults` helper + wire into `setResults`

**Files:**
- Modify: `src/utils/points.js` (add `buildChallengeResults`, after existing `calcResultPoints` at line 62-65)
- Modify: `src/context/AppContext.jsx:2` (import) and `:118-132` (`setResults`)

**Interfaces:**
- Produces: `buildChallengeResults(orderedTeamIds, playerSelections, totalTeams, isPowerStage, resultMode = 'ranking', failedTeamIds = [])` → `{ team_id, positie, punten, spelers, geslaagd? }[]`, exported from `src/utils/points.js`. Later tasks (Task 3's `ResultsTab`) call `setResults(challengeId, orderedTeamIds, playerSelections, failedTeamIds)` — the 4th arg is new and optional.

- [ ] **Step 1: Write a throwaway verification script**

Create `C:\Users\aronv\tdf-chiro\_verify_points.mjs` (temporary, not committed):

```js
import { buildChallengeResults } from './src/utils/points.js'

// Ranking mode, no power stage: 4 teams, order [1,2,3,4]
const ranking = buildChallengeResults([1, 2, 3, 4], {}, 4, false)
console.log(JSON.stringify(ranking, null, 2))
if (ranking.map(r => r.punten).join(',') !== '3,2,1,0') throw new Error(`Expected ranking punten 3,2,1,0, got ${ranking.map(r => r.punten).join(',')}`)
if (ranking.some(r => 'geslaagd' in r)) throw new Error('Ranking mode results must not have a geslaagd field')
if (ranking.map(r => r.positie).join(',') !== '1,2,3,4') throw new Error('Ranking mode positie must be 1..4')

// Ranking mode, power stage: punten double
const rankingPower = buildChallengeResults([1, 2, 3, 4], {}, 4, true)
if (rankingPower.map(r => r.punten).join(',') !== '6,4,2,0') throw new Error(`Expected power-stage punten 6,4,2,0, got ${rankingPower.map(r => r.punten).join(',')}`)

// Pass/fail mode: 4 teams total, teams 2 and 4 passed (in that rank order), teams 1 and 3 failed
const passFail = buildChallengeResults([2, 4], { 2: ['Bram'], 4: ['Tom'] }, 4, false, 'pass_fail', [1, 3])
console.log(JSON.stringify(passFail, null, 2))
const byTeam = Object.fromEntries(passFail.map(r => [r.team_id, r]))
if (byTeam[2].punten !== 3) throw new Error(`Expected team 2 (1st passed) punten=3, got ${byTeam[2].punten}`)
if (byTeam[2].geslaagd !== true) throw new Error('Expected team 2 geslaagd=true')
if (byTeam[2].positie !== 1) throw new Error(`Expected team 2 positie=1, got ${byTeam[2].positie}`)
if (byTeam[2].spelers.join(',') !== 'Bram') throw new Error('Expected team 2 spelers to carry through')
if (byTeam[4].punten !== 2) throw new Error(`Expected team 4 (2nd passed) punten=2, got ${byTeam[4].punten}`)
if (byTeam[4].positie !== 2) throw new Error(`Expected team 4 positie=2, got ${byTeam[4].positie}`)
if (byTeam[1].punten !== 0 || byTeam[1].geslaagd !== false) throw new Error('Expected team 1 (failed) punten=0, geslaagd=false')
if (byTeam[3].punten !== 0 || byTeam[3].geslaagd !== false) throw new Error('Expected team 3 (failed) punten=0, geslaagd=false')
if (byTeam[1].positie !== 3 || byTeam[3].positie !== 4) throw new Error('Expected failed teams to continue positie 3,4')

// Pass/fail + power stage: passed teams get doubled points, failed teams stay 0
const passFailPower = buildChallengeResults([2, 4], {}, 4, true, 'pass_fail', [1, 3])
const byTeamPower = Object.fromEntries(passFailPower.map(r => [r.team_id, r]))
if (byTeamPower[2].punten !== 6) throw new Error(`Expected power-stage 1st passed punten=6, got ${byTeamPower[2].punten}`)
if (byTeamPower[4].punten !== 4) throw new Error(`Expected power-stage 2nd passed punten=4, got ${byTeamPower[4].punten}`)

// Pass/fail mode with zero failed teams: everyone still gets geslaagd=true
const allPassed = buildChallengeResults([1, 2, 3, 4], {}, 4, false, 'pass_fail', [])
if (allPassed.some(r => r.geslaagd !== true)) throw new Error('Expected all teams geslaagd=true when nobody failed')
if (allPassed.length !== 4) throw new Error(`Expected 4 results, got ${allPassed.length}`)

console.log('OK: buildChallengeResults correct for ranking, power-stage, and pass/fail modes')
```

- [ ] **Step 2: Run it to confirm it fails (function doesn't exist yet)**

Run: `node _verify_points.mjs`
Expected: `SyntaxError: The requested module './src/utils/points.js' does not provide an export named 'buildChallengeResults'`

- [ ] **Step 3: Add `buildChallengeResults` to `src/utils/points.js`**

Append after the existing `calcResultPoints` function (end of file, after line 65):

```js

export function buildChallengeResults(orderedTeamIds, playerSelections, totalTeams, isPowerStage, resultMode = 'ranking', failedTeamIds = []) {
  const isPassFail = resultMode === 'pass_fail'

  const passed = orderedTeamIds.map((teamId, index) => ({
    team_id: teamId,
    positie: index + 1,
    punten: calcResultPoints(index, totalTeams, isPowerStage),
    spelers: playerSelections[teamId] ?? [],
    ...(isPassFail ? { geslaagd: true } : {}),
  }))

  if (!isPassFail) return passed

  const failed = failedTeamIds.map((teamId, index) => ({
    team_id: teamId,
    positie: orderedTeamIds.length + index + 1,
    punten: 0,
    spelers: playerSelections[teamId] ?? [],
    geslaagd: false,
  }))

  return [...passed, ...failed]
}
```

- [ ] **Step 4: Run the verification script again to confirm it passes**

Run: `node _verify_points.mjs`
Expected: prints both result arrays as JSON, ends with `OK: buildChallengeResults correct for ranking, power-stage, and pass/fail modes`

- [ ] **Step 5: Delete the throwaway script**

Run: `rm _verify_points.mjs`

- [ ] **Step 6: Wire `buildChallengeResults` into `AppContext.jsx`'s `setResults`**

Change the import at `src/context/AppContext.jsx:2`:
```js
import { recalculateAllPoints } from '../utils/points'
```
to:
```js
import { recalculateAllPoints, buildChallengeResults } from '../utils/points'
```

Change `setResults` (currently at `src/context/AppContext.jsx:118-132`):
```js
  const setResults = (challengeId, orderedTeamIds, playerSelections = {}) => {
    const challenge = challenges.find(c => c.id === challengeId)
    if (!challenge) return
    const results = orderedTeamIds.map((teamId, index) => ({
      team_id: teamId,
      positie: index + 1,
      punten: challenge.power_stage
        ? Math.max(0, (teams.length - 1 - index) * 2)
        : Math.max(0, teams.length - 1 - index),
      spelers: playerSelections[teamId] ?? [],
    }))
    const updatedChallenges = challenges.map(c => c.id === challengeId ? { ...c, results, completed: true } : c)
    setChallenges(updatedChallenges)
    setTeams(recalculateAllPoints(teams, updatedChallenges, bonusPenalties, quiz, config.quiz_points_per_question))
  }
```
to:
```js
  const setResults = (challengeId, orderedTeamIds, playerSelections = {}, failedTeamIds = []) => {
    const challenge = challenges.find(c => c.id === challengeId)
    if (!challenge) return
    const results = buildChallengeResults(
      orderedTeamIds,
      playerSelections,
      teams.length,
      challenge.power_stage,
      challenge.result_mode ?? 'ranking',
      failedTeamIds,
    )
    const updatedChallenges = challenges.map(c => c.id === challengeId ? { ...c, results, completed: true } : c)
    setChallenges(updatedChallenges)
    setTeams(recalculateAllPoints(teams, updatedChallenges, bonusPenalties, quiz, config.quiz_points_per_question))
  }
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: clean build, no errors.

- [ ] **Step 8: Commit**

```bash
git add src/utils/points.js src/context/AppContext.jsx
git commit -m "feat(pass-fail-challenges): add buildChallengeResults and wire into setResults"
```

---

## Task 2: Admin — Challenge form: Resultaat-modus toggle

**Files:**
- Modify: `src/pages/Admin.jsx:504-582` (`ChallengesTab` form state + JSX)

**Interfaces:**
- Consumes: nothing new from Task 1 directly (this task only touches the create/edit form; `addChallenge`/`updateChallenge` already pass the whole `form` object through unchanged).
- Produces: challenges saved with `result_mode: 'ranking' | 'pass_fail'` in their top-level fields. Task 3 and Task 4 read `challenge.result_mode ?? 'ranking'`.

- [ ] **Step 1: Add `result_mode` to form state**

Change (`src/pages/Admin.jsx:504`):
```js
  const [form, setForm] = useState({ naam: '', stage_number: 1, type: 'general', power_stage: false, notes: '' })
```
to:
```js
  const [form, setForm] = useState({ naam: '', stage_number: 1, type: 'general', power_stage: false, result_mode: 'ranking', notes: '' })
```

Change (`src/pages/Admin.jsx:508-509`):
```js
  const startNew = () => { setEditing('new'); setForm({ naam: '', stage_number: stageFilter, type: 'general', power_stage: false, notes: '' }) }
  const startEdit = (c) => { setEditing(c.id); setForm({ naam: c.naam, stage_number: c.stage_number, type: c.type, power_stage: c.power_stage, notes: c.notes }) }
```
to:
```js
  const startNew = () => { setEditing('new'); setForm({ naam: '', stage_number: stageFilter, type: 'general', power_stage: false, result_mode: 'ranking', notes: '' }) }
  const startEdit = (c) => { setEditing(c.id); setForm({ naam: c.naam, stage_number: c.stage_number, type: c.type, power_stage: c.power_stage, result_mode: c.result_mode ?? 'ranking', notes: c.notes }) }
```

- [ ] **Step 2: Add the Resultaat-modus toggle to the form JSX**

Change (`src/pages/Admin.jsx:546-572`):
```jsx
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Stage</label>
                <select value={form.stage_number} onChange={e => setForm(p => ({ ...p, stage_number: parseInt(e.target.value) }))} className={inputCls}>
                  <option value={1}>Stage 1</option><option value={2}>Stage 2</option><option value={3}>Stage 3</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                  <option value="general">🏆 Algemeen</option>
                  <option value="mountain">🏔️ Berg</option>
                  <option value="sprint">⚡ Sprint</option>
                  <option value="junioren">🧒 Junioren</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Power Stage</label>
                <button onClick={() => setForm(p => ({ ...p, power_stage: !p.power_stage }))}
                  className={`w-full py-2.5 rounded-lg font-barlow-condensed font-bold text-sm border transition-all ${
                    form.power_stage ? 'bg-yellow text-black border-yellow' : 'bg-card-2 border-line text-muted hover:border-yellow/40'
                  }`}>
                  {form.power_stage ? '⚡ AAN' : 'UIT'}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Notities</label>
```
to:
```jsx
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Stage</label>
                <select value={form.stage_number} onChange={e => setForm(p => ({ ...p, stage_number: parseInt(e.target.value) }))} className={inputCls}>
                  <option value={1}>Stage 1</option><option value={2}>Stage 2</option><option value={3}>Stage 3</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                  <option value="general">🏆 Algemeen</option>
                  <option value="mountain">🏔️ Berg</option>
                  <option value="sprint">⚡ Sprint</option>
                  <option value="junioren">🧒 Junioren</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Power Stage</label>
                <button onClick={() => setForm(p => ({ ...p, power_stage: !p.power_stage }))}
                  className={`w-full py-2.5 rounded-lg font-barlow-condensed font-bold text-sm border transition-all ${
                    form.power_stage ? 'bg-yellow text-black border-yellow' : 'bg-card-2 border-line text-muted hover:border-yellow/40'
                  }`}>
                  {form.power_stage ? '⚡ AAN' : 'UIT'}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Resultaat-modus</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setForm(p => ({ ...p, result_mode: 'ranking' }))}
                  className={`py-2.5 rounded-lg font-barlow-condensed font-bold text-sm border transition-all ${
                    form.result_mode === 'ranking' ? 'bg-yellow text-black border-yellow' : 'bg-card-2 border-line text-muted hover:border-yellow/40'
                  }`}>
                  🏆 Klassement
                </button>
                <button onClick={() => setForm(p => ({ ...p, result_mode: 'pass_fail' }))}
                  className={`py-2.5 rounded-lg font-barlow-condensed font-bold text-sm border transition-all ${
                    form.result_mode === 'pass_fail' ? 'bg-yellow text-black border-yellow' : 'bg-card-2 border-line text-muted hover:border-yellow/40'
                  }`}>
                  ✅ Geslaagd/Niet geslaagd
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Notities</label>
```

- [ ] **Step 3: Verify build and route**

Run: `npm run build` — expect clean build.
Start the dev server in the background (`npm run dev`), wait ~2s, read its stdout for the actual bound URL, `curl` the `/admin` route and confirm HTTP 200, then stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin.jsx
git commit -m "feat(pass-fail-challenges): add resultaat-modus toggle to challenge form"
```

---

## Task 3: Admin — Resultaten invoeren: pass/fail two-section UI

**Files:**
- Modify: `src/pages/Admin.jsx:612-795` (`ResultsTab` and the new `PlayerPicker` helper)

**Interfaces:**
- Consumes: `useApp().setResults(challengeId, orderedTeamIds, playerSelections, failedTeamIds)` from Task 1 (`src/context/AppContext.jsx`); `challenge.result_mode` from Task 2.
- Produces: nothing consumed by later tasks (this is a leaf UI component).

- [ ] **Step 1: Extract the existing player-selection block into a `PlayerPicker` component**

This avoids duplicating the "wie doet de opdracht" JSX between the new "Geslaagd" and "Niet geslaagd" sections. Insert directly before `function ResultsTab()` (currently at `src/pages/Admin.jsx:613`, right after the `/* ── Results tab ────...` comment):

```jsx
function PlayerPicker({ challenge, team, selectedSpelers, onToggle }) {
  const leiding = team?.leden?.leiding ?? []
  const aspis   = team?.leden?.aspis   ?? []
  const allSpelers = [
    ...leiding.map(n => ({ naam: n, isLeiding: true })),
    ...aspis.map(n => ({ naam: n, isLeiding: false })),
  ]
  const hasSelection = selectedSpelers.length > 0

  return (
    <div className="mt-3 pt-3 border-t border-line/50">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted">
          Wie doet de opdracht?
        </span>
        {challenge.type === 'junioren' && (
          <span className="text-[10px] font-barlow-condensed font-bold px-2 py-0.5 rounded-full border"
            style={{ color: '#8B5CF6', background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.3)' }}>
            🧒 Alleen aspis
          </span>
        )}
        {!hasSelection && (
          <span className="text-[10px] text-yellow/70 font-barlow-condensed italic">
            — nog niemand aangeduid
          </span>
        )}
      </div>
      {allSpelers.length === 0 ? (
        <span className="text-xs text-muted/50 font-barlow italic">Geen spelers in dit team</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {allSpelers.map(({ naam, isLeiding }) => {
            const on = selectedSpelers.includes(naam)
            const disabled = challenge.type === 'junioren' && isLeiding
            return (
              <button
                key={naam}
                onClick={() => !disabled && onToggle(naam)}
                disabled={disabled}
                title={disabled ? 'Alleen aspis voor junioren challenges' : undefined}
                className={`flex items-center gap-1 text-xs font-barlow-condensed font-semibold px-2.5 py-1.5 rounded-full border transition-all ${
                  disabled
                    ? 'opacity-30 cursor-not-allowed bg-card-2 border-line text-muted'
                    : on
                      ? isLeiding
                        ? 'bg-yellow/15 border-yellow/50 text-yellow'
                        : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                      : 'bg-card-2 border-line text-muted hover:border-yellow/30 hover:text-white'
                }`}
              >
                {isLeiding ? '👑' : '🚴'} {naam}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

```

- [ ] **Step 2: Replace the whole `ResultsTab` function**

Replace the entire existing `ResultsTab` function (currently `src/pages/Admin.jsx:613-795`, from `function ResultsTab() {` through its closing `}`) with:

```jsx
function ResultsTab() {
  const { teams, challenges, setResults: saveResults } = useApp()
  const [selected, setSelected]           = useState('')
  const [order, setOrder]                 = useState([])
  const [failedIds, setFailedIds]         = useState([])
  const [playerSelections, setPlayerSel]  = useState({})
  const [saved, setSaved]                 = useState(false)

  const challenge  = challenges.find(c => c.id === parseInt(selected))
  const isPassFail = (challenge?.result_mode ?? 'ranking') === 'pass_fail'

  useEffect(() => {
    if (!challenge) return
    if (challenge.results?.length > 0) {
      const sorted = [...challenge.results].sort((a, b) => a.positie - b.positie)
      if (isPassFail) {
        setOrder(sorted.filter(r => r.geslaagd !== false).map(r => r.team_id))
        setFailedIds(sorted.filter(r => r.geslaagd === false).map(r => r.team_id))
      } else {
        setOrder(sorted.map(r => r.team_id))
        setFailedIds([])
      }
      const sel = {}
      sorted.forEach(r => { sel[r.team_id] = r.spelers ?? [] })
      setPlayerSel(sel)
    } else {
      setOrder(teams.map(t => t.id))
      setFailedIds([])
      const sel = {}
      teams.forEach(t => { sel[t.id] = [] })
      setPlayerSel(sel)
    }
    setSaved(false)
  }, [selected])

  const move = (idx, dir) => {
    const next = [...order]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setOrder(next)
  }

  const markFailed = (teamId) => {
    setOrder(prev => prev.filter(id => id !== teamId))
    setFailedIds(prev => [...prev, teamId])
  }

  const markPassed = (teamId) => {
    setFailedIds(prev => prev.filter(id => id !== teamId))
    setOrder(prev => [...prev, teamId])
  }

  const togglePlayer = (teamId, naam) => {
    setPlayerSel(prev => {
      const curr = prev[teamId] ?? []
      return {
        ...prev,
        [teamId]: curr.includes(naam) ? curr.filter(n => n !== naam) : [...curr, naam],
      }
    })
  }

  const handleSave = () => {
    if (!challenge) return
    saveResults(challenge.id, order, playerSelections, isPassFail ? failedIds : [])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h2 className="font-bebas text-4xl text-white mb-5">Resultaten Invoeren</h2>
      <div className="mb-5">
        <label className={labelCls}>Selecteer een challenge</label>
        <select value={selected} onChange={e => setSelected(e.target.value)} className={inputCls}>
          <option value="">— Kies een challenge —</option>
          {[1, 2, 3].map(stage => {
            const sc = challenges.filter(c => c.stage_number === stage)
            if (!sc.length) return null
            return (
              <optgroup key={stage} label={`── Stage ${stage} ──`}>
                {sc.map(c => <option key={c.id} value={c.id}>{c.naam} {c.power_stage ? '⚡' : ''} {c.completed ? '✅' : ''}</option>)}
              </optgroup>
            )
          })}
        </select>
      </div>

      {challenge && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-4 mb-5 flex items-center gap-3">
            <div className="text-2xl">{challenge.power_stage ? '⚡' : '🏆'}</div>
            <div>
              <div className="font-barlow-condensed font-semibold text-white">{challenge.naam}</div>
              <div className="text-xs text-muted font-barlow">
                {challenge.power_stage ? 'Power Stage — punten ×2' : 'Standaard'} · 1e plek = <strong className="text-yellow">{challenge.power_stage ? (teams.length - 1) * 2 : teams.length - 1}</strong> pts
              </div>
            </div>
          </div>

          <p className="text-sm text-muted font-barlow mb-3">
            {isPassFail
              ? <>Duid per team aan of ze <strong className="text-white">geslaagd</strong> zijn. Rangschik de geslaagde teams van <strong className="text-white">1e (beste)</strong> naar <strong className="text-white">laatste</strong> en duid aan wie de opdracht uitvoerde:</>
              : <>Rangschik van <strong className="text-white">1e (beste)</strong> naar <strong className="text-white">laatste</strong> en duid aan wie de opdracht uitvoerde:</>}
          </p>

          {isPassFail && (
            <div className="font-barlow-condensed font-bold text-[11px] uppercase tracking-wider text-green-400 mb-2">
              ✅ Geslaagd
            </div>
          )}

          <div className="space-y-3 mb-5">
            {order.map((teamId, idx) => {
              const team     = teams.find(t => t.id === teamId)
              const pts      = challenge.power_stage ? Math.max(0, (teams.length - 1 - idx) * 2) : Math.max(0, teams.length - 1 - idx)
              const selected = playerSelections[teamId] ?? []

              return (
                <div key={teamId} className={`${cardCls} p-4`}>
                  {/* Top row: rank + team + pts + move */}
                  <div className="flex items-center gap-3">
                    <span className="font-bebas text-2xl text-muted w-8 leading-none">#{idx + 1}</span>
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: team?.kleur }} />
                    <span className="flex-1 font-barlow-condensed font-semibold text-white">{team?.naam}</span>
                    <span className="font-bebas text-xl text-yellow">{pts} pts</span>
                    {isPassFail && (
                      <button onClick={() => markFailed(teamId)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-barlow-condensed font-bold uppercase tracking-wide border bg-card-2 text-muted border-line hover:border-red-500/40 hover:text-red-400 transition-colors">
                        ❌ Niet geslaagd
                      </button>
                    )}
                    <div className="flex gap-0.5">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0}
                        className="p-1.5 text-muted hover:text-white disabled:opacity-20 rounded-lg hover:bg-white/5 transition-colors">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => move(idx, 1)} disabled={idx === order.length - 1}
                        className="p-1.5 text-muted hover:text-white disabled:opacity-20 rounded-lg hover:bg-white/5 transition-colors">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <PlayerPicker challenge={challenge} team={team} selectedSpelers={selected} onToggle={(naam) => togglePlayer(teamId, naam)} />
                </div>
              )
            })}
          </div>

          {isPassFail && (
            <>
              <div className="font-barlow-condensed font-bold text-[11px] uppercase tracking-wider text-muted mb-2">
                ❌ Niet geslaagd
              </div>
              <div className="space-y-3 mb-5">
                {failedIds.length === 0 && (
                  <p className="text-sm text-muted font-barlow italic">Nog geen teams hier geplaatst</p>
                )}
                {failedIds.map(teamId => {
                  const team     = teams.find(t => t.id === teamId)
                  const selected = playerSelections[teamId] ?? []
                  return (
                    <div key={teamId} className={`${cardCls} p-4 opacity-75`}>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shrink-0" style={{ background: team?.kleur }} />
                        <span className="flex-1 font-barlow-condensed font-semibold text-white">{team?.naam}</span>
                        <span className="font-bebas text-xl text-muted">0 pts</span>
                        <button onClick={() => markPassed(teamId)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-barlow-condensed font-bold uppercase tracking-wide border bg-card-2 text-muted border-line hover:border-green-500/40 hover:text-green-400 transition-colors">
                          ✅ Geslaagd
                        </button>
                      </div>

                      <PlayerPicker challenge={challenge} team={team} selectedSpelers={selected} onToggle={(naam) => togglePlayer(teamId, naam)} />
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <button onClick={handleSave}
            className={`w-full font-bebas text-2xl py-4 rounded-xl transition-all flex items-center justify-center gap-2 border ${
              saved ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow text-black border-yellow hover:bg-yellow/90'
            }`}>
            {saved ? '✅ Opgeslagen!' : <><Save className="w-5 h-5" /> Resultaten Opslaan</>}
          </button>
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build and route**

Run: `npm run build` — expect clean build.
Start the dev server in the background, wait ~2s, read its stdout for the actual bound URL, `curl` the `/admin` route and confirm HTTP 200, then stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin.jsx
git commit -m "feat(pass-fail-challenges): add geslaagd/niet-geslaagd sections to results entry"
```

---

## Task 4: ChallengeCard — public display of pass/fail results

**Files:**
- Modify: `src/components/ChallengeCard.jsx:40-70`

**Interfaces:**
- Consumes: `challenge.result_mode` (Task 2) and `result.geslaagd` (Task 1's `buildChallengeResults` output, stored via Task 3's `setResults` call).

- [ ] **Step 1: Show a niet-geslaagd badge instead of a rank number**

Change (`src/components/ChallengeCard.jsx:41-70`):
```jsx
      {/* Results */}
      {challenge.completed && challenge.results.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left pb-2 pr-3 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted w-8">#</th>
              <th className="text-left pb-2 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted">Team</th>
              <th className="text-right pb-2 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted">Pts</th>
            </tr>
          </thead>
          <tbody>
            {[...challenge.results]
              .sort((a, b) => a.positie - b.positie)
              .map((result, idx) => {
                const team = teams.find(t => t.id === result.team_id)
                return (
                  <tr key={result.team_id} className={idx % 2 === 1 ? 'bg-card-2/50' : ''}>
                    <td className="py-1.5 pr-3 font-barlow-condensed font-semibold text-muted">{result.positie}</td>
                    <td className="py-1.5 font-barlow-condensed font-semibold text-white">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team?.kleur }} />
                        {team?.naam || 'Onbekend'}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-bebas text-xl text-yellow">{result.punten}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      )}
```
to:
```jsx
      {/* Results */}
      {challenge.completed && challenge.results.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left pb-2 pr-3 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted w-8">#</th>
              <th className="text-left pb-2 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted">Team</th>
              <th className="text-right pb-2 font-barlow-condensed font-bold text-[10px] uppercase tracking-wider text-muted">Pts</th>
            </tr>
          </thead>
          <tbody>
            {[...challenge.results]
              .sort((a, b) => a.positie - b.positie)
              .map((result, idx) => {
                const team   = teams.find(t => t.id === result.team_id)
                const failed = result.geslaagd === false
                return (
                  <tr key={result.team_id} className={idx % 2 === 1 ? 'bg-card-2/50' : ''}>
                    <td className="py-1.5 pr-3 font-barlow-condensed font-semibold text-muted">
                      {failed ? '❌' : result.positie}
                    </td>
                    <td className="py-1.5 font-barlow-condensed font-semibold text-white">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team?.kleur }} />
                        {team?.naam || 'Onbekend'}
                        {failed && <span className="text-muted text-xs font-barlow italic">(niet geslaagd)</span>}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-bebas text-xl text-yellow">{result.punten}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      )}
```

- [ ] **Step 2: Verify build and route**

Run: `npm run build` — expect clean build.
Start the dev server in the background, wait ~2s, read its stdout for the actual bound URL, `curl` the `/stage/1` route and confirm HTTP 200, then stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChallengeCard.jsx
git commit -m "feat(pass-fail-challenges): show niet-geslaagd badge on public challenge results"
```

---

## Task 5: End-to-end verification (interactive browser click-through)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run `npm run dev` in the background. Read its stdout to get the actual bound local URL (e.g. `http://localhost:5173/`).

- [ ] **Step 2: Load the browser tools**

Use `ToolSearch` with query `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__find,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_console_messages` to load the needed tools in one call. Call `tabs_context_mcp`, then `tabs_create_mcp` to open a new tab at `<dev-server-url>/admin`.

- [ ] **Step 3: Reset to seed data**

Use `javascript_tool` to run `localStorage.clear()` on the page, then reload the tab, so the app starts from `SEED_TEAMS`/`SEED_CONFIG` (4 teams, admin password `chiro2026`) regardless of any leftover localStorage state from earlier manual testing.

- [ ] **Step 4: Log into Admin**

Enter `chiro2026` in the password field and submit. Confirm the Admin page loads (Teams tab visible with 4 seed teams: Team Geel, Team Rood, Team Blauw, Team Groen).

- [ ] **Step 5: Create a pass/fail challenge**

Go to the Challenges tab, click "Nieuwe Challenge". Fill in naam = `10 keer springen`, leave Stage = 1, Type = Algemeen, Power Stage = UIT, and click the "✅ Geslaagd/Niet geslaagd" Resultaat-modus button. Save. Confirm the new challenge appears in the Stage 1 list.

- [ ] **Step 6: Enter pass/fail results**

Go to the Resultaten tab, select "10 keer springen" from the dropdown. Confirm all 4 teams appear under a "✅ Geslaagd" heading with no "❌ Niet geslaagd" section content yet. Click "❌ Niet geslaagd" on Team Rood and Team Groen. Confirm they move to the "❌ Niet geslaagd" section showing "0 pts", and the remaining two teams in "✅ Geslaagd" (Team Geel at #1, Team Blauw at #2) show pts `3` and `2` respectively (4 teams total, non-power-stage: 1st = 3, 2nd = 2). Click "Resultaten Opslaan" and confirm "✅ Opgeslagen!" appears.

- [ ] **Step 7: Verify public display**

Navigate to `<dev-server-url>/stage/1`. Find the "10 keer springen" challenge card. Confirm: Team Geel shows `#1` / `3` pts, Team Blauw shows `#2` / `2` pts, Team Rood and Team Groen both show `❌` with "(niet geslaagd)" text and `0` pts.

- [ ] **Step 8: Verify ranking-mode challenges are unaffected**

Back in Admin, create a second challenge on Stage 1 named `Fietsestafette` leaving Resultaat-modus on the default "🏆 Klassement". Go to the Resultaten tab, select it, and confirm the UI shows a single ranked list of all 4 teams with ↑↓ buttons and **no** "Zet als niet geslaagd" buttons anywhere (i.e. ranking-mode UI is visually and functionally identical to before this feature). Rank them in any order, save, and confirm `/stage/1` shows a normal `#1`-`#4` table for this challenge with no ❌ badges.

- [ ] **Step 9: Check console for errors**

Use `read_console_messages` and confirm no errors were logged during steps 4-8.

- [ ] **Step 10: Stop the dev server**

Stop the background `npm run dev` process.

- [ ] **Step 11: Report**

State explicitly which of Steps 4-9 passed as expected. If any step's actual behavior diverges from the expected behavior described above, report it clearly as a bug — do not silently patch it as part of this verification task.
