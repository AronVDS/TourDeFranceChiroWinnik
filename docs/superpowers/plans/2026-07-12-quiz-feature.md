# Quiz Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-stage quiz (4 fixed questions/stage) that the admin can manage, reveal on the `/live` TV screen, and score by ticking off which teams answered correctly.

**Architecture:** Extends the existing localStorage + React Context pattern (see `src/context/AppContext.jsx`). Quiz questions/answers become new `quiz` context state (persisted to `tdf_quiz`), mirroring how `challenges` already works. The "which question is currently shown on TV" pointer is a separate, lightweight raw-localStorage key `tdf_quiz_active` (`{ stage, questionIndex } | null`), mirroring the existing `tdf_timer` key used by `TimerSection`/`TimerOverlay` — this is deliberately NOT context state so it works cross-tab (Admin laptop ↔ TV browser) via polling, exactly like the timer does today.

**Tech Stack:** React 19, Vite, Tailwind v4, Framer Motion, plain `localStorage` (no backend, no test framework currently in this repo).

**Testing approach:** This repo has zero test infrastructure (no test runner in `package.json`, no `.test.` files anywhere). Adding a framework is out of scope for this feature. Instead:
- The one pure-logic change (`recalculateAllPoints` in `src/utils/points.js`) is verified with a small throwaway Node ESM script (the repo has `"type": "module"` in `package.json`, so `node` can import the file directly) — written, run, and deleted, not committed.
- Everything else (Context wiring, Admin UI, Live overlay) is verified manually against the running dev server (`npm run dev`, already running at `http://localhost:5173`) by exercising the actual UI, since these are React components with no existing component-test setup to hook into.

---

## Task 1: Scoring logic — `recalculateAllPoints` quiz support

**Files:**
- Modify: `src/utils/points.js:1-49`

- [ ] **Step 1: Write a throwaway verification script for current behavior**

Create `C:\Users\aronv\tdf-chiro\_verify_points.mjs` (temporary, not committed):

```js
import { recalculateAllPoints } from './src/utils/points.js'

const teams = [{ id: 1, total_points: 0 }, { id: 2, total_points: 0 }]
const challenges = []
const bonusPenalties = []
const quiz = {
  1: [
    { id: 1, tekst: 'Q1', opties: [], antwoorden: { '1': true, '2': false } },
    { id: 2, tekst: 'Q2', opties: [], antwoorden: { '1': false, '2': true } },
    { id: 3, tekst: '', opties: [], antwoorden: {} },
    { id: 4, tekst: '', opties: [], antwoorden: {} },
  ],
  2: [
    { id: 5, tekst: '', opties: [], antwoorden: {} },
    { id: 6, tekst: '', opties: [], antwoorden: {} },
    { id: 7, tekst: '', opties: [], antwoorden: {} },
    { id: 8, tekst: '', opties: [], antwoorden: {} },
  ],
  3: [
    { id: 9, tekst: '', opties: [], antwoorden: {} },
    { id: 10, tekst: '', opties: [], antwoorden: {} },
    { id: 11, tekst: '', opties: [], antwoorden: {} },
    { id: 12, tekst: '', opties: [], antwoorden: {} },
  ],
}

const result = recalculateAllPoints(teams, challenges, bonusPenalties, quiz, 10)
console.log(JSON.stringify(result, null, 2))

const t1 = result.find(t => t.id === 1)
const t2 = result.find(t => t.id === 2)
if (t1.quiz_points !== 10) throw new Error(`Expected team 1 quiz_points=10, got ${t1.quiz_points}`)
if (t2.quiz_points !== 10) throw new Error(`Expected team 2 quiz_points=10, got ${t2.quiz_points}`)
if (t1.total_points !== 10) throw new Error(`Expected team 1 total_points=10, got ${t1.total_points}`)
console.log('OK: quiz scoring correct')
```

- [ ] **Step 2: Run it to confirm it fails (function doesn't accept quiz args yet)**

Run: `node _verify_points.mjs`
Expected: prints team objects with no `quiz_points` field, then throws `Expected team 1 quiz_points=10, got undefined`

- [ ] **Step 3: Implement quiz scoring in `recalculateAllPoints`**

Replace `src/utils/points.js:1-49` with:

```js
export function recalculateAllPoints(teams, challenges, bonusPenalties, quiz = {}, pointsPerQuestion = 0) {
  return teams.map(team => {
    let total_points = 0
    let mountain_points = 0
    let sprint_points = 0
    let junioren_points = 0
    let quiz_points = 0
    let stage1_points = 0
    let stage2_points = 0
    let stage3_points = 0
    let bonus_points = 0
    let penalty_points = 0

    challenges.filter(c => c.completed).forEach(challenge => {
      const result = challenge.results.find(r => r.team_id === team.id)
      if (!result) return
      const pts = result.punten
      total_points += pts
      if (challenge.stage_number === 1) stage1_points += pts
      if (challenge.stage_number === 2) stage2_points += pts
      if (challenge.stage_number === 3) stage3_points += pts
      if (challenge.type === 'mountain')  mountain_points += pts
      if (challenge.type === 'sprint')    sprint_points += pts
      if (challenge.type === 'junioren')  junioren_points += pts
    })

    bonusPenalties.filter(bp => bp.team_id === team.id).forEach(bp => {
      if (bp.type === 'bonus') {
        bonus_points += bp.punten
        total_points += bp.punten
      } else {
        penalty_points += bp.punten
        total_points -= bp.punten
      }
    })

    Object.values(quiz ?? {}).forEach(stageQuestions => {
      (stageQuestions ?? []).forEach(q => {
        if (q?.antwoorden?.[String(team.id)]) {
          quiz_points += pointsPerQuestion
          total_points += pointsPerQuestion
        }
      })
    })

    return {
      ...team,
      total_points,
      mountain_points,
      sprint_points,
      junioren_points,
      quiz_points,
      stage1_points,
      stage2_points,
      stage3_points,
      bonus_points,
      penalty_points,
    }
  })
}

export function calcResultPoints(index, totalTeams, isPowerStage) {
  const base = Math.max(0, totalTeams - 1 - index)
  return isPowerStage ? base * 2 : base
}
```

- [ ] **Step 4: Run the verification script again to confirm it passes**

Run: `node _verify_points.mjs`
Expected: prints team objects with `quiz_points: 10` for both teams, `total_points: 10` for both, ends with `OK: quiz scoring correct`

- [ ] **Step 5: Delete the throwaway script**

Run: `rm _verify_points.mjs` (or `Remove-Item _verify_points.mjs` in PowerShell)

- [ ] **Step 6: Commit**

```bash
git add src/utils/points.js
git commit -m "feat(quiz): add quiz_points to recalculateAllPoints"
```

---

## Task 2: AppContext — quiz data model, seed, persistence

**Files:**
- Modify: `src/context/AppContext.jsx:1-52` (imports, seeds, load helpers, state init)

- [ ] **Step 1: Add quiz seed/load helpers and `quiz_points_per_question` to config**

In `src/context/AppContext.jsx`, replace lines 20-46 (from `const SEED_CONFIG = {` through the end of `loadTeams`) with:

```js
const SEED_CONFIG = {
  event_naam: 'Tour de France – Chiro Edition 2026',
  status: 'upcoming',
  start_date: '2026-07-01T10:00:00',
  admin_password: 'chiro2026',
  winner_team_id: null,
  quiz_points_per_question: 10,
}

function load(key, fallback) {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function loadTeams(fallback) {
  try {
    const stored = localStorage.getItem('tdf_teams')
    if (!stored) return fallback
    const teams = JSON.parse(stored)
    return teams.map(t => ({ ...t, leden: migrateLeden(t.leden) }))
  } catch {
    return fallback
  }
}

function makeEmptyQuestion(id) {
  return { id, tekst: '', opties: [], antwoorden: {} }
}

function makeEmptyStageQuestions(stageNum) {
  return [1, 2, 3, 4].map(n => makeEmptyQuestion(stageNum * 10 + n))
}

const SEED_QUIZ = {
  1: makeEmptyStageQuestions(1),
  2: makeEmptyStageQuestions(2),
  3: makeEmptyStageQuestions(3),
}

function normalizeQuizStage(stageQuestions, stageNum) {
  const base = Array.isArray(stageQuestions) ? stageQuestions.slice(0, 4) : []
  while (base.length < 4) base.push(makeEmptyQuestion(stageNum * 10 + base.length + 1))
  return base.map((q, i) => ({
    id: q?.id ?? stageNum * 10 + i + 1,
    tekst: q?.tekst ?? '',
    opties: Array.isArray(q?.opties) ? q.opties : [],
    antwoorden: q?.antwoorden && typeof q.antwoorden === 'object' ? q.antwoorden : {},
  }))
}

function loadQuiz(fallback) {
  try {
    const stored = localStorage.getItem('tdf_quiz')
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    return {
      1: normalizeQuizStage(parsed?.[1], 1),
      2: normalizeQuizStage(parsed?.[2], 2),
      3: normalizeQuizStage(parsed?.[3], 3),
    }
  } catch {
    return fallback
  }
}
```

- [ ] **Step 2: Add `quiz` state and its persistence effect**

In `src/context/AppContext.jsx`, in `AppProvider`, change:

```js
  const [teams, setTeams] = useState(() => loadTeams(SEED_TEAMS))
  const [challenges, setChallenges] = useState(() => load('tdf_challenges', []))
  const [bonusPenalties, setBonusPenalties] = useState(() => load('tdf_bonuspenalties', []))
  const [config, setConfig] = useState(() => load('tdf_config', SEED_CONFIG))

  useEffect(() => { localStorage.setItem('tdf_teams', JSON.stringify(teams)) }, [teams])
  useEffect(() => { localStorage.setItem('tdf_challenges', JSON.stringify(challenges)) }, [challenges])
  useEffect(() => { localStorage.setItem('tdf_bonuspenalties', JSON.stringify(bonusPenalties)) }, [bonusPenalties])
  useEffect(() => { localStorage.setItem('tdf_config', JSON.stringify(config)) }, [config])
```

to:

```js
  const [teams, setTeams] = useState(() => loadTeams(SEED_TEAMS))
  const [challenges, setChallenges] = useState(() => load('tdf_challenges', []))
  const [bonusPenalties, setBonusPenalties] = useState(() => load('tdf_bonuspenalties', []))
  const [config, setConfig] = useState(() => load('tdf_config', SEED_CONFIG))
  const [quiz, setQuiz] = useState(() => loadQuiz(SEED_QUIZ))

  useEffect(() => { localStorage.setItem('tdf_teams', JSON.stringify(teams)) }, [teams])
  useEffect(() => { localStorage.setItem('tdf_challenges', JSON.stringify(challenges)) }, [challenges])
  useEffect(() => { localStorage.setItem('tdf_bonuspenalties', JSON.stringify(bonusPenalties)) }, [bonusPenalties])
  useEffect(() => { localStorage.setItem('tdf_config', JSON.stringify(config)) }, [config])
  useEffect(() => { localStorage.setItem('tdf_quiz', JSON.stringify(quiz)) }, [quiz])
```

- [ ] **Step 3: Verify manually — quiz key appears in localStorage**

With the dev server running, open `http://localhost:5173/` in a browser, open DevTools console, run:
```js
JSON.parse(localStorage.getItem('tdf_quiz'))
```
Expected: an object with keys `"1"`, `"2"`, `"3"`, each an array of 4 objects shaped `{ id, tekst: '', opties: [], antwoorden: {} }`.

- [ ] **Step 4: Commit**

```bash
git add src/context/AppContext.jsx
git commit -m "feat(quiz): add quiz state, seed and persistence to AppContext"
```

---

## Task 3: AppContext — quiz mutators + wire into scoring + fix reset/addTeam

**Files:**
- Modify: `src/context/AppContext.jsx` (functions section + provider value)

- [ ] **Step 1: Add `quiz_points: 0` to `addTeam`**

Change:
```js
  const addTeam = (team) => {
    const newTeam = { ...team, id: Date.now(), total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }
    setTeams(prev => [...prev, newTeam])
  }
```
to:
```js
  const addTeam = (team) => {
    const newTeam = { ...team, id: Date.now(), total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }
    setTeams(prev => [...prev, newTeam])
  }
```

- [ ] **Step 2: Pass `quiz` + `config.quiz_points_per_question` into every `recalculateAllPoints` call**

Change `setResults`:
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

Change `addBonusPenalty`:
```js
  const addBonusPenalty = (entry) => {
    const newEntry = { ...entry, id: Date.now(), date: new Date().toISOString() }
    const updated = [...bonusPenalties, newEntry]
    setBonusPenalties(updated)
    setTeams(recalculateAllPoints(teams, challenges, updated, quiz, config.quiz_points_per_question))
  }
```

Change `recalculateAll`:
```js
  const recalculateAll = () => setTeams(recalculateAllPoints(teams, challenges, bonusPenalties, quiz, config.quiz_points_per_question))
```

- [ ] **Step 3: Add `updateQuizQuestion` and `setQuizAnswer`**

Add these two functions directly after `recalculateAll` (before `resetScores`):

```js
  const updateQuizQuestion = (stage, index, updates) => {
    setQuiz(prev => ({
      ...prev,
      [stage]: prev[stage].map((q, i) => i === index ? { ...q, ...updates } : q),
    }))
  }

  const setQuizAnswer = (stage, index, teamId, correct) => {
    const updatedQuiz = {
      ...quiz,
      [stage]: quiz[stage].map((q, i) => i === index
        ? { ...q, antwoorden: { ...q.antwoorden, [String(teamId)]: correct } }
        : q),
    }
    setQuiz(updatedQuiz)
    setTeams(recalculateAllPoints(teams, challenges, bonusPenalties, updatedQuiz, config.quiz_points_per_question))
  }
```

- [ ] **Step 4: Fix `resetScores` — add `quiz_points: 0` and clear all quiz answers**

Change:
```js
  const resetScores = () => {
    const reset = teams.map(t => ({ ...t, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }))
    setTeams(reset)
    setChallenges(prev => prev.map(c => ({ ...c, results: [], completed: false })))
    setBonusPenalties([])
  }
```
to:
```js
  const resetScores = () => {
    const reset = teams.map(t => ({ ...t, total_points: 0, mountain_points: 0, sprint_points: 0, junioren_points: 0, quiz_points: 0, stage1_points: 0, stage2_points: 0, stage3_points: 0, bonus_points: 0, penalty_points: 0 }))
    setTeams(reset)
    setChallenges(prev => prev.map(c => ({ ...c, results: [], completed: false })))
    setBonusPenalties([])
    setQuiz(prev => ({
      1: prev[1].map(q => ({ ...q, antwoorden: {} })),
      2: prev[2].map(q => ({ ...q, antwoorden: {} })),
      3: prev[3].map(q => ({ ...q, antwoorden: {} })),
    }))
  }
```

- [ ] **Step 5: Expose new state/functions from the provider**

Change:
```js
  return (
    <AppContext.Provider value={{ teams, challenges, bonusPenalties, config, addTeam, updateTeam, deleteTeam, addChallenge, updateChallenge, deleteChallenge, setResults, addBonusPenalty, updateConfig, recalculateAll, resetScores }}>
      {children}
    </AppContext.Provider>
  )
```
to:
```js
  return (
    <AppContext.Provider value={{ teams, challenges, bonusPenalties, config, quiz, addTeam, updateTeam, deleteTeam, addChallenge, updateChallenge, deleteChallenge, setResults, addBonusPenalty, updateConfig, recalculateAll, resetScores, updateQuizQuestion, setQuizAnswer }}>
      {children}
    </AppContext.Provider>
  )
```

- [ ] **Step 6: Manual verification**

With the dev server running, open the browser console at `http://localhost:5173/` and run:
```js
JSON.parse(localStorage.getItem('tdf_teams'))[0].quiz_points
```
Expected: `0` (field now present on every team). This confirms `addTeam`/existing teams shape includes the field once the app has rendered (existing teams get it via the next `recalculateAllPoints` call, e.g. after any admin action — this is expected and matches how `junioren_points` already behaves for pre-existing teams).

- [ ] **Step 7: Commit**

```bash
git add src/context/AppContext.jsx
git commit -m "feat(quiz): add quiz mutators, wire into scoring, fix quiz_points reset/addTeam gaps"
```

---

## Task 4: Admin — "Punten per quizvraag" config field

**Files:**
- Modify: `src/pages/Admin.jsx:770-773` (inside `ConfigTab`)

- [ ] **Step 1: Add the field to `ConfigTab`**

In `src/pages/Admin.jsx`, change:
```jsx
        <div>
          <label className={labelCls}>Admin Wachtwoord</label>
          <input type="text" value={form.admin_password} onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))} className={`${inputCls} font-mono`} />
        </div>
        <button onClick={save}
```
to:
```jsx
        <div>
          <label className={labelCls}>Admin Wachtwoord</label>
          <input type="text" value={form.admin_password} onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))} className={`${inputCls} font-mono`} />
        </div>
        <div>
          <label className={labelCls}>Punten per quizvraag</label>
          <input type="number" min="0" value={form.quiz_points_per_question} onChange={e => setForm(p => ({ ...p, quiz_points_per_question: parseInt(e.target.value) || 0 }))} className={inputCls} />
        </div>
        <button onClick={save}
```

- [ ] **Step 2: Manual verification**

Open `http://localhost:5173/admin`, log in (`chiro2026`), go to Config tab, confirm "Punten per quizvraag" shows `10`, change it to `15`, click Opslaan, refresh the page, confirm it still shows `15`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin.jsx
git commit -m "feat(quiz): add quiz points-per-question setting to Config tab"
```

---

## Task 5: Admin — Quiz tab

**Files:**
- Modify: `src/pages/Admin.jsx:825-831` (TABS array)
- Modify: `src/pages/Admin.jsx:903-907` (tab content dispatch)
- Modify: `src/pages/Admin.jsx:244-247` (insert new `QuizTab` function before `ChallengesTab`, reusing existing imports/style tokens already defined at the top of the file: `inputCls`, `labelCls`, `btnP`, `btnS`, `cardCls`, `FormPanel`, and the already-imported `Edit2`, `Save` icons)

- [ ] **Step 1: Add the `QuizTab` component**

In `src/pages/Admin.jsx`, insert this new function directly before the `/* ── Challenges tab ─...` comment (i.e. before line 244's `const TYPE_LABELS`):

```jsx
/* ── Quiz tab ───────────────────────────────────────────────── */
function readActiveQuiz() {
  try {
    const raw = localStorage.getItem('tdf_quiz_active')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function QuizTab() {
  const { teams, quiz, updateQuizQuestion, setQuizAnswer } = useApp()
  const [stageFilter, setStageFilter] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ tekst: '', optieA: '', optieB: '', optieC: '', optieD: '' })
  const [active, setActive] = useState(() => readActiveQuiz())

  useEffect(() => {
    const id = setInterval(() => setActive(readActiveQuiz()), 1000)
    return () => clearInterval(id)
  }, [])

  const questions = quiz[stageFilter] ?? []

  const startEdit = (index) => {
    const q = questions[index]
    const opties = q.opties ?? []
    setEditing(index)
    setForm({ tekst: q.tekst, optieA: opties[0] ?? '', optieB: opties[1] ?? '', optieC: opties[2] ?? '', optieD: opties[3] ?? '' })
  }

  const save = () => {
    const opties = [form.optieA, form.optieB, form.optieC, form.optieD]
      .map(o => o.trim())
      .filter(o => o.length > 0)
    updateQuizQuestion(stageFilter, editing, { tekst: form.tekst.trim(), opties })
    setEditing(null)
  }

  const showOnLive = (index) => {
    localStorage.setItem('tdf_quiz_active', JSON.stringify({ stage: stageFilter, questionIndex: index }))
    setActive({ stage: stageFilter, questionIndex: index })
  }

  const hideFromLive = () => {
    localStorage.removeItem('tdf_quiz_active')
    setActive(null)
  }

  const isActive = (index) => active?.stage === stageFilter && active?.questionIndex === index

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bebas text-4xl text-white">Quiz</h2>
      </div>

      <div className="flex gap-2 mb-5 p-1 bg-card border border-line rounded-xl">
        {[1, 2, 3].map(s => (
          <button key={s} onClick={() => setStageFilter(s)}
            className={`flex-1 py-2 px-3 rounded-lg font-barlow-condensed font-bold text-sm transition-all border ${
              stageFilter === s ? 'bg-yellow text-black border-yellow' : 'text-muted hover:text-white border-transparent'
            }`}>
            Stage {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => {
          const correctCount = teams.filter(t => q.antwoorden?.[String(t.id)]).length
          const isEditing = editing === index
          return (
            <div key={q.id} className={`${cardCls} p-4`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-barlow-condensed font-bold text-[10px] uppercase tracking-widest text-muted mb-1">
                    Vraag {index + 1}
                  </div>
                  <div className="font-barlow-condensed font-semibold text-white">
                    {q.tekst || <span className="text-muted italic">Nog niet ingevuld</span>}
                  </div>
                  {q.opties?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {q.opties.map((o, i) => (
                        <span key={i} className="text-[11px] bg-card-2 border border-line text-muted px-2 py-0.5 rounded-full font-barlow-condensed font-semibold">
                          {String.fromCharCode(65 + i)}. {o}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => startEdit(index)} className="p-2 text-muted hover:text-yellow hover:bg-yellow/10 rounded-lg transition-colors shrink-0">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {isEditing && (
                <FormPanel title={`Vraag ${index + 1} bewerken`} onClose={() => setEditing(null)}>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Vraagtekst</label>
                      <input value={form.tekst} onChange={e => setForm(p => ({ ...p, tekst: e.target.value }))} placeholder="Vraag..." className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Optie A</label>
                        <input value={form.optieA} onChange={e => setForm(p => ({ ...p, optieA: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Optie B</label>
                        <input value={form.optieB} onChange={e => setForm(p => ({ ...p, optieB: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Optie C</label>
                        <input value={form.optieC} onChange={e => setForm(p => ({ ...p, optieC: e.target.value }))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Optie D</label>
                        <input value={form.optieD} onChange={e => setForm(p => ({ ...p, optieD: e.target.value }))} className={inputCls} />
                      </div>
                    </div>
                    <p className="text-xs text-muted font-barlow">Laat alle 4 opties leeg voor een open vraag.</p>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => setEditing(null)} className={btnS}>Annuleer</button>
                      <button onClick={save} className={btnP}><Save className="w-4 h-4" /> Opslaan</button>
                    </div>
                  </div>
                </FormPanel>
              )}

              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line/50">
                <button
                  onClick={() => isActive(index) ? hideFromLive() : showOnLive(index)}
                  disabled={!q.tekst}
                  className={`px-3 py-2 rounded-lg font-barlow-condensed font-bold text-xs uppercase tracking-wide transition-colors border disabled:opacity-30 disabled:cursor-not-allowed ${
                    isActive(index) ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-card-2 text-muted border-line hover:border-yellow/30 hover:text-white'
                  }`}>
                  {isActive(index) ? '🔴 Actief — Verberg' : 'Toon op Live scherm'}
                </button>
                <span className="text-xs font-barlow-condensed font-semibold text-muted">
                  {correctCount}/{teams.length} teams juist
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {teams.map(t => {
                  const correct = !!q.antwoorden?.[String(t.id)]
                  return (
                    <button
                      key={t.id}
                      onClick={() => setQuizAnswer(stageFilter, index, t.id, !correct)}
                      className={`flex items-center gap-1.5 text-xs font-barlow-condensed font-semibold px-2.5 py-1.5 rounded-full border transition-all ${
                        correct
                          ? 'bg-green-500/15 border-green-500/40 text-green-400'
                          : 'bg-card-2 border-line text-muted hover:border-yellow/30 hover:text-white'
                      }`}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.kleur }} />
                      {correct ? '✅' : ''} {t.naam}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

```

- [ ] **Step 2: Register the tab in `TABS`**

Change:
```js
const TABS = [
  { key: 'teams',        label: 'Teams' },
  { key: 'challenges',   label: 'Challenges' },
  { key: 'results',      label: 'Resultaten' },
  { key: 'bonuspenalty', label: 'Bonus/Straf' },
  { key: 'config',       label: 'Config' },
]
```
to:
```js
const TABS = [
  { key: 'teams',        label: 'Teams' },
  { key: 'challenges',   label: 'Challenges' },
  { key: 'results',      label: 'Resultaten' },
  { key: 'bonuspenalty', label: 'Bonus/Straf' },
  { key: 'quiz',         label: 'Quiz' },
  { key: 'config',       label: 'Config' },
]
```

- [ ] **Step 3: Render `QuizTab` in the content dispatch**

Change:
```jsx
                {activeTab === 'teams'        && <TeamsTab />}
                {activeTab === 'challenges'   && <ChallengesTab />}
                {activeTab === 'results'      && <ResultsTab />}
                {activeTab === 'bonuspenalty' && <BonusPenaltyTab />}
                {activeTab === 'config'       && <ConfigTab />}
```
to:
```jsx
                {activeTab === 'teams'        && <TeamsTab />}
                {activeTab === 'challenges'   && <ChallengesTab />}
                {activeTab === 'results'      && <ResultsTab />}
                {activeTab === 'bonuspenalty' && <BonusPenaltyTab />}
                {activeTab === 'quiz'         && <QuizTab />}
                {activeTab === 'config'       && <ConfigTab />}
```

- [ ] **Step 4: Manual verification**

Open `http://localhost:5173/admin`, click the new "Quiz" tab. Confirm:
- Stage 1/2/3 pills switch between 4 question slots each.
- Clicking the edit icon on "Vraag 1" opens a form; type a question text + 2 options (e.g. "Optie A" = "Parijs", "Optie B" = "Lyon"), click Opslaan. Confirm the card now shows the text and the two option pills.
- "Toon op Live scherm" is enabled now (was disabled while `tekst` was empty on an untouched slot — check an unedited "Vraag 2" still shows the button disabled).
- Click a team pill under the question — it turns green with a checkmark, and the "X/Y teams juist" counter increments.
- Open `http://localhost:5173/teams` in another tab, confirm that team's total score increased by the configured points-per-question value.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin.jsx
git commit -m "feat(quiz): add Quiz admin tab for editing questions and marking correct answers"
```

---

## Task 6: Live screen — Quiz overlay

**Files:**
- Modify: `src/pages/Live.jsx:24-29` (add `parseQuiz`/`parseActiveQuiz` helpers next to `parseChallenges`)
- Modify: `src/pages/Live.jsx:110` (insert `QuizOverlay` component after `TimerOverlay`)
- Modify: `src/pages/Live.jsx:322-370` (add active-quiz poll state in `LivePage`, swap overlay rendering)

- [ ] **Step 1: Add quiz parsing helpers**

In `src/pages/Live.jsx`, change:
```js
function parseChallenges(raw) {
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : null
  } catch { return null }
}
```
to:
```js
function parseChallenges(raw) {
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : null
  } catch { return null }
}

function parseQuiz(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch { return null }
}

function parseActiveQuiz(raw) {
  try {
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
```

- [ ] **Step 2: Add the `QuizOverlay` component**

In `src/pages/Live.jsx`, insert this new function directly after the closing `}` of `TimerOverlay` (i.e. right before the `/* ── Team row ─...` comment):

```jsx
/* ── Quiz overlay ────────────────────────────────────────────── */
function QuizOverlay() {
  const [active, setActive] = useState(null)
  const [question, setQuestion] = useState(null)

  useEffect(() => {
    const tick = setInterval(() => {
      const activeState = parseActiveQuiz(localStorage.getItem('tdf_quiz_active'))
      setActive(activeState)
      if (!activeState) { setQuestion(null); return }
      const quiz = parseQuiz(localStorage.getItem('tdf_quiz'))
      const q = quiz?.[activeState.stage]?.[activeState.questionIndex] ?? null
      setQuestion(q)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  if (!active || !question) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#12131A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32, padding: '5vh 8vw',
    }}>
      <div className="font-barlow-condensed font-bold uppercase tracking-[0.3em] text-yellow" style={{ fontSize: 22 }}>
        Stage {active.stage} · Vraag {active.questionIndex + 1}
      </div>
      <div className="font-bebas text-white text-center leading-tight" style={{ fontSize: 'clamp(40px, 6vw, 96px)' }}>
        {question.tekst}
      </div>
      {question.opties?.length > 0 && (
        <div className="grid grid-cols-2 gap-6 w-full max-w-4xl mt-6">
          {question.opties.map((optie, i) => (
            <div key={i} className="flex items-center gap-4 bg-card border border-line rounded-2xl px-6 py-5">
              <div className="font-bebas text-yellow shrink-0" style={{ fontSize: 44 }}>
                {String.fromCharCode(65 + i)}
              </div>
              <div className="font-barlow-condensed font-semibold text-white" style={{ fontSize: 26 }}>
                {optie}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Poll active-quiz state in `LivePage` and let quiz suppress the timer**

In `src/pages/Live.jsx`, inside `LivePage`, change:
```js
  const prevLeader = useRef(null)
  const containerRef = useRef(null)

  /* Poll localStorage every 3s */
  useEffect(() => {
```
to:
```js
  const prevLeader = useRef(null)
  const containerRef = useRef(null)
  const [quizActive, setQuizActive] = useState(false)

  /* Poll whether a quiz question is currently shown, every 1s */
  useEffect(() => {
    const poll = setInterval(() => {
      setQuizActive(!!localStorage.getItem('tdf_quiz_active'))
    }, 1000)
    return () => clearInterval(poll)
  }, [])

  /* Poll localStorage every 3s */
  useEffect(() => {
```

Then change the render:
```jsx
  return (
    <>
      <TimerOverlay />
      <div
        ref={containerRef}
```
to:
```jsx
  return (
    <>
      {quizActive ? <QuizOverlay /> : <TimerOverlay />}
      <div
        ref={containerRef}
```

- [ ] **Step 4: Manual verification — full flow**

1. Open `http://localhost:5173/live` in one browser tab (or window).
2. In another tab, go to `http://localhost:5173/admin` → Quiz tab → Stage 1 → click "Toon op Live scherm" on the question you filled in during Task 5.
3. Within ~1 second, confirm the `/live` tab switches to the fullscreen quiz overlay showing the question text and the two options in an A/B/C/D-style card grid.
4. Back in Admin, click "🔴 Actief — Verberg". Confirm `/live` reverts to the normal scoreboard within ~1 second.
5. In Admin → Config tab → Timer sectie, start a short timer (e.g. 5 sec) — confirm the Timer overlay shows on `/live`. While it's counting down, go back to Quiz tab and show a question — confirm the Quiz overlay replaces the Timer overlay (timer suppressed, quiz wins).
6. Hide the quiz question again — confirm the Timer overlay reappears if the timer is still running, or the normal scoreboard if it already finished.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Live.jsx
git commit -m "feat(quiz): add Quiz overlay to Live screen, quiz suppresses timer overlay"
```

---

## Task 7: End-to-end verification + Reset Scores check

**Files:** none (verification only)

- [ ] **Step 1: Full flow smoke test**

With the dev server running:
1. Admin → Quiz tab → fill in all 4 questions for Stage 1 (mix of MC and open questions).
2. Mark 2 teams correct on question 1, 1 team correct on question 2.
3. Go to `/teams` and `/rankings` — confirm total scores reflect the quiz points (`teams-marked-correct × quiz_points_per_question`).
4. Go to Admin → Config → change "Punten per quizvraag" from 10 to 20, save. Go back to `/teams` — confirm scores update immediately (live recalculation, not frozen), per the approved design.

- [ ] **Step 2: Reset Scores check**

1. Admin → Config tab → click "Reset Scores" → confirm in the dialog.
2. Go back to Quiz tab — confirm all questions still show their text/options (not wiped), but every team pill is back to unchecked (grey, not green).
3. Go to `/teams` — confirm `quiz_points` (and total) is back to 0 for all teams.

- [ ] **Step 3: Confirm no console errors**

Open browser DevTools console on `/`, `/teams`, `/rankings`, `/stage/1`, `/live`, `/strafwiel`, `/admin` — confirm no red errors logged on any page.

- [ ] **Step 4: Final commit (only if any fixups were needed during verification)**

```bash
git add -A
git commit -m "fix(quiz): address issues found during end-to-end verification"
```

(Skip this commit entirely if no fixes were needed — don't create an empty commit.)
