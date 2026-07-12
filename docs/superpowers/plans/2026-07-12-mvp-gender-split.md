# MVP Gender Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-player "geslacht" (jongen/meisje) field, editable in the admin Teams tab, with a defensive migration for existing data, and a new gender-split MVP tab on `/rankings` ("Top MVP Jongens" / "Top MVP Meisjes"), while leaving `/live`'s combined MVP list untouched.

**Architecture:** `geslacht` is stored as a parallel lookup map (`team.leden.geslacht: { [naam]: 'jongen' | 'meisje' }`) alongside the existing `leiding`/`aspis` name-string arrays, which stay completely unchanged. This is additive, not a restructuring — every existing place that treats `leiding`/`aspis` as plain name arrays (challenge result player-selection, MVP scoring, `TeamCard`) needs zero changes. Only the Teams-tab editor and the new gender-split MVP view perform lookups into the new map.

**Tech Stack:** React 19, Vite, Tailwind v4, Framer Motion, plain `localStorage` (no backend, no test framework in this repo).

**Testing approach:** Same as the quiz feature: no test runner exists in this repo. Pure-logic changes (`utils/mvp.js`) are verified with a throwaway Node ESM script (written, run, confirmed, deleted — not committed). UI changes are verified via `npm run build` + a dev-server route check, since no browser automation tool is available in this environment; a full manual click-through end-to-end pass (Task 5) traces the actual data flow by reading the final code, the same adapted approach used for the quiz feature's Task 7.

---

## Task 1: Data model — geslacht migration + MVP calculation

**Files:**
- Modify: `src/context/AppContext.jsx:13-18` (`migrateLeden`)
- Modify: `src/pages/Live.jsx:10-14` (`migrateLeden`, duplicate of the above)
- Modify: `src/utils/mvp.js:1-34` (`normalizeLeden`, `berekenSpelerStats`)

- [ ] **Step 1: Write a throwaway verification script for current behavior**

Create `C:\Users\aronv\tdf-chiro\_verify_mvp.mjs` (temporary, not committed):

```js
import { berekenAllSpelerStats, berekenJuniorenStats } from './src/utils/mvp.js'

const teams = [
  {
    id: 1,
    naam: 'Team Geel',
    kleur: '#EAB308',
    leden: {
      leiding: ['Aron'],
      aspis: ['Bram', 'Jonas'],
      geslacht: { Aron: 'jongen', Bram: 'meisje' }, // Jonas intentionally missing -> "niet ingesteld"
    },
  },
]
const challenges = [
  {
    id: 1, type: 'junioren', completed: true,
    results: [{ team_id: 1, punten: 5, spelers: ['Bram'] }],
  },
]

const all = berekenAllSpelerStats(teams, challenges)
console.log(JSON.stringify(all, null, 2))

const aron = all.find(p => p.naam === 'Aron')
const bram = all.find(p => p.naam === 'Bram')
const jonas = all.find(p => p.naam === 'Jonas')

if (aron.geslacht !== 'jongen') throw new Error(`Expected Aron geslacht='jongen', got ${aron.geslacht}`)
if (bram.geslacht !== 'meisje') throw new Error(`Expected Bram geslacht='meisje', got ${bram.geslacht}`)
if (jonas.geslacht !== null) throw new Error(`Expected Jonas geslacht=null (niet ingesteld), got ${jonas.geslacht}`)

const juniorenAll = berekenJuniorenStats(teams, challenges)
const bramJunior = juniorenAll.find(p => p.naam === 'Bram')
if (bramJunior.geslacht !== 'meisje') throw new Error(`Expected junioren Bram geslacht='meisje', got ${bramJunior.geslacht}`)

console.log('OK: geslacht field present and correct on all stats functions')
```

- [ ] **Step 2: Run it to confirm it fails (geslacht field doesn't exist yet)**

Run: `node _verify_mvp.mjs`
Expected: prints player objects with no `geslacht` field, then throws `Expected Aron geslacht='jongen', got undefined`

- [ ] **Step 3: Update `normalizeLeden` and `berekenSpelerStats` in `src/utils/mvp.js`**

Replace `src/utils/mvp.js:1-34` with:

```js
function normalizeLeden(leden) {
  if (!leden) return { leiding: [], aspis: [], geslacht: {} }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden, geslacht: {} }
  return { leiding: leden.leiding ?? [], aspis: leden.aspis ?? [], geslacht: leden.geslacht ?? {} }
}

export function berekenSpelerStats(speler, team, challenges = []) {
  const safeChall = Array.isArray(challenges) ? challenges : []
  let challenges_gespeeld = 0
  let punten_bijgedragen = 0

  for (const challenge of safeChall) {
    const result = challenge.results?.find(r => r.team_id === team.id)
    if (!result) continue
    if ((result.spelers ?? []).includes(speler)) {
      challenges_gespeeld++
      punten_bijgedragen += result.punten ?? 0
    }
  }

  const { leiding, geslacht } = normalizeLeden(team.leden)
  const rol = leiding.includes(speler) ? 'leiding' : 'aspi'

  return {
    naam: speler,
    team_id: team.id,
    team_naam: team.naam ?? '',
    team_kleur: team.kleur ?? '#888',
    rol,
    geslacht: geslacht?.[speler] ?? null,
    challenges_gespeeld,
    punten_bijgedragen,
    mvp_score: punten_bijgedragen,
  }
}
```

(Leave `berekenAllSpelerStats` and `berekenJuniorenStats`, further down in the same file, completely untouched — they already call `berekenSpelerStats` and `normalizeLeden`, so they automatically pick up the new `geslacht` field with no changes of their own.)

- [ ] **Step 4: Run the verification script again to confirm it passes**

Run: `node _verify_mvp.mjs`
Expected: prints player objects with `geslacht: "jongen"` for Aron, `"meisje"` for Bram, `null` for Jonas, ends with `OK: geslacht field present and correct on all stats functions`

- [ ] **Step 5: Delete the throwaway script**

Run: `rm _verify_mvp.mjs`

- [ ] **Step 6: Update `migrateLeden` in `src/context/AppContext.jsx`**

Change:
```js
/* Migrate old flat-array leden to { leiding, aspis } */
function migrateLeden(leden) {
  if (!leden) return { leiding: [], aspis: [] }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden }
  return leden
}
```
to:
```js
/* Migrate old flat-array leden to { leiding, aspis, geslacht } */
function migrateLeden(leden) {
  if (!leden) return { leiding: [], aspis: [], geslacht: {} }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden, geslacht: {} }
  return { leiding: leden.leiding ?? [], aspis: leden.aspis ?? [], geslacht: leden.geslacht ?? {} }
}
```

- [ ] **Step 7: Update the duplicate `migrateLeden` in `src/pages/Live.jsx`**

Change:
```js
function migrateLeden(leden) {
  if (!leden) return { leiding: [], aspis: [] }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden }
  return { leiding: leden.leiding ?? [], aspis: leden.aspis ?? [] }
}
```
to:
```js
function migrateLeden(leden) {
  if (!leden) return { leiding: [], aspis: [], geslacht: {} }
  if (Array.isArray(leden)) return { leiding: [], aspis: leden, geslacht: {} }
  return { leiding: leden.leiding ?? [], aspis: leden.aspis ?? [], geslacht: leden.geslacht ?? {} }
}
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: clean build, no errors (this repo has no test framework; a clean build plus the Step 4 script pass is the correct verification bar).

- [ ] **Step 9: Commit**

```bash
git add src/context/AppContext.jsx src/pages/Live.jsx src/utils/mvp.js
git commit -m "feat(mvp-gender): add geslacht to player normalization and MVP stats"
```

---

## Task 2: Teams tab — mandatory gender toggle + editable badge

**Files:**
- Modify: `src/pages/Admin.jsx` (inside/around `TeamsTab`, roughly lines 91-242)

- [ ] **Step 1: Add a `SpelerPill` helper component**

In `src/pages/Admin.jsx`, insert this new function directly before the `/* ── Teams tab ─...` comment (i.e. before the current `function TeamsTab()` at line 92):

```jsx
/* ── Speler pill met geslacht-badge ──────────────────────────── */
function geslachtIcon(waarde) {
  return waarde === 'jongen' ? '🧑' : waarde === 'meisje' ? '👧' : '❓'
}

function SpelerPill({ naam, geslacht, accentCls, onSetGeslacht, onRemove, isOpen, onToggleOpen }) {
  return (
    <span className={`relative flex items-center gap-1 ${accentCls} text-xs font-barlow-condensed font-semibold px-2.5 py-1.5 rounded-full`}>
      <button
        type="button"
        onClick={onToggleOpen}
        title="Geslacht instellen"
        className={!geslacht ? 'animate-pulse' : ''}
      >
        {geslachtIcon(geslacht)}
      </button>
      {naam}
      <button onClick={onRemove} className="hover:text-red-400 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-10 flex gap-1 bg-card-2 border border-line rounded-lg p-1.5 shadow-lg">
          <button type="button" onClick={() => onSetGeslacht('jongen')} className="px-2 py-1 rounded text-[10px] text-white hover:bg-yellow/10 whitespace-nowrap">🧑 Jongen</button>
          <button type="button" onClick={() => onSetGeslacht('meisje')} className="px-2 py-1 rounded text-[10px] text-white hover:bg-yellow/10 whitespace-nowrap">👧 Meisje</button>
        </div>
      )}
    </span>
  )
}
```

- [ ] **Step 2: Add new state to `TeamsTab` and reset it in `startNew`/`startEdit`**

Change:
```js
function TeamsTab() {
  const { teams, addTeam, updateTeam, deleteTeam } = useApp()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ naam: '', kleur: '#FFD600', leiding: [], aspis: [] })
  const [leidingInput, setLeidingInput] = useState('')
  const [aspiInput, setAspiInput] = useState('')

  const startNew = () => {
    setEditing('new')
    setForm({ naam: '', kleur: '#FFD600', leiding: [], aspis: [] })
    setLeidingInput(''); setAspiInput('')
  }
  const startEdit = (t) => {
    setEditing(t.id)
    setForm({ naam: t.naam, kleur: t.kleur, leiding: t.leden?.leiding ?? [], aspis: t.leden?.aspis ?? [] })
    setLeidingInput(''); setAspiInput('')
  }
```
to:
```js
function TeamsTab() {
  const { teams, addTeam, updateTeam, deleteTeam } = useApp()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ naam: '', kleur: '#FFD600', leiding: [], aspis: [], geslacht: {} })
  const [leidingInput, setLeidingInput] = useState('')
  const [aspiInput, setAspiInput] = useState('')
  const [leidingGeslacht, setLeidingGeslacht] = useState(null)
  const [aspiGeslacht, setAspiGeslacht] = useState(null)
  const [editingGeslachtFor, setEditingGeslachtFor] = useState(null)

  const startNew = () => {
    setEditing('new')
    setForm({ naam: '', kleur: '#FFD600', leiding: [], aspis: [], geslacht: {} })
    setLeidingInput(''); setAspiInput('')
    setLeidingGeslacht(null); setAspiGeslacht(null); setEditingGeslachtFor(null)
  }
  const startEdit = (t) => {
    setEditing(t.id)
    setForm({ naam: t.naam, kleur: t.kleur, leiding: t.leden?.leiding ?? [], aspis: t.leden?.aspis ?? [], geslacht: t.leden?.geslacht ?? {} })
    setLeidingInput(''); setAspiInput('')
    setLeidingGeslacht(null); setAspiGeslacht(null); setEditingGeslachtFor(null)
  }
```

- [ ] **Step 3: Require geslacht when adding, and clean it up when removing**

Change:
```js
  const addLeiding = () => {
    const naam = leidingInput.trim()
    if (!naam || form.leiding.includes(naam)) return
    setForm(p => ({ ...p, leiding: [...p.leiding, naam] }))
    setLeidingInput('')
  }
  const removeLeiding = (naam) => setForm(p => ({ ...p, leiding: p.leiding.filter(n => n !== naam) }))

  const addAspi = () => {
    const naam = aspiInput.trim()
    if (!naam || form.aspis.includes(naam)) return
    setForm(p => ({ ...p, aspis: [...p.aspis, naam] }))
    setAspiInput('')
  }
  const removeAspi = (naam) => setForm(p => ({ ...p, aspis: p.aspis.filter(n => n !== naam) }))
```
to:
```js
  const addLeiding = () => {
    const naam = leidingInput.trim()
    if (!naam || form.leiding.includes(naam) || !leidingGeslacht) return
    setForm(p => ({ ...p, leiding: [...p.leiding, naam], geslacht: { ...p.geslacht, [naam]: leidingGeslacht } }))
    setLeidingInput('')
    setLeidingGeslacht(null)
  }
  const removeLeiding = (naam) => setForm(p => {
    const { [naam]: _, ...restGeslacht } = p.geslacht
    return { ...p, leiding: p.leiding.filter(n => n !== naam), geslacht: restGeslacht }
  })

  const addAspi = () => {
    const naam = aspiInput.trim()
    if (!naam || form.aspis.includes(naam) || !aspiGeslacht) return
    setForm(p => ({ ...p, aspis: [...p.aspis, naam], geslacht: { ...p.geslacht, [naam]: aspiGeslacht } }))
    setAspiInput('')
    setAspiGeslacht(null)
  }
  const removeAspi = (naam) => setForm(p => {
    const { [naam]: _, ...restGeslacht } = p.geslacht
    return { ...p, aspis: p.aspis.filter(n => n !== naam), geslacht: restGeslacht }
  })

  const setGeslacht = (naam, waarde) => {
    setForm(p => ({ ...p, geslacht: { ...p.geslacht, [naam]: waarde } }))
    setEditingGeslachtFor(null)
  }
```

- [ ] **Step 4: Persist `geslacht` on save**

Change:
```js
  const save = () => {
    if (!form.naam.trim()) return
    const leden = { leiding: form.leiding, aspis: form.aspis }
    if (editing === 'new') addTeam({ naam: form.naam.trim(), kleur: form.kleur, leden })
    else updateTeam(editing, { naam: form.naam.trim(), kleur: form.kleur, leden })
    setEditing(null)
  }
```
to:
```js
  const save = () => {
    if (!form.naam.trim()) return
    const leden = { leiding: form.leiding, aspis: form.aspis, geslacht: form.geslacht }
    if (editing === 'new') addTeam({ naam: form.naam.trim(), kleur: form.kleur, leden })
    else updateTeam(editing, { naam: form.naam.trim(), kleur: form.kleur, leden })
    setEditing(null)
  }
```

- [ ] **Step 5: Add the gender toggle next to the "add leiding" input, and use `SpelerPill` for existing pills**

Change the LEIDING block:
```jsx
            {/* LEIDING */}
            <div className="border border-yellow/25 rounded-xl p-4 space-y-2.5">
              <div className="font-barlow-condensed font-bold text-[11px] uppercase tracking-wider text-yellow">👑 Leiding</div>
              <div className="flex gap-2">
                <input
                  value={leidingInput}
                  onChange={e => setLeidingInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLeiding() } }}
                  placeholder="Naam toevoegen..."
                  className={inputCls}
                />
                <button onClick={addLeiding} className="btn-primary px-3 rounded-lg shrink-0"><Plus className="w-4 h-4" /></button>
              </div>
              {form.leiding.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.leiding.map(naam => (
                    <span key={naam} className="flex items-center gap-1 bg-yellow/10 border border-yellow/30 text-yellow text-xs font-barlow-condensed font-semibold px-2.5 py-1.5 rounded-full">
                      {naam}
                      <button onClick={() => removeLeiding(naam)} className="hover:text-red-400 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
```
to:
```jsx
            {/* LEIDING */}
            <div className="border border-yellow/25 rounded-xl p-4 space-y-2.5">
              <div className="font-barlow-condensed font-bold text-[11px] uppercase tracking-wider text-yellow">👑 Leiding</div>
              <div className="flex gap-2">
                <input
                  value={leidingInput}
                  onChange={e => setLeidingInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLeiding() } }}
                  placeholder="Naam toevoegen..."
                  className={inputCls}
                />
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => setLeidingGeslacht('jongen')}
                    className={`px-2.5 rounded-lg border text-xs font-barlow-condensed font-bold transition-colors ${leidingGeslacht === 'jongen' ? 'bg-yellow text-black border-yellow' : 'bg-card-2 text-muted border-line hover:border-yellow/40'}`}>
                    🧑
                  </button>
                  <button type="button" onClick={() => setLeidingGeslacht('meisje')}
                    className={`px-2.5 rounded-lg border text-xs font-barlow-condensed font-bold transition-colors ${leidingGeslacht === 'meisje' ? 'bg-yellow text-black border-yellow' : 'bg-card-2 text-muted border-line hover:border-yellow/40'}`}>
                    👧
                  </button>
                </div>
                <button onClick={addLeiding} disabled={!leidingInput.trim() || !leidingGeslacht} className="btn-primary px-3 rounded-lg shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
              </div>
              {form.leiding.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.leiding.map(naam => (
                    <SpelerPill
                      key={naam}
                      naam={naam}
                      geslacht={form.geslacht[naam]}
                      accentCls="bg-yellow/10 border border-yellow/30 text-yellow"
                      onSetGeslacht={(w) => setGeslacht(naam, w)}
                      onRemove={() => removeLeiding(naam)}
                      isOpen={editingGeslachtFor === naam}
                      onToggleOpen={() => setEditingGeslachtFor(editingGeslachtFor === naam ? null : naam)}
                    />
                  ))}
                </div>
              )}
            </div>
```

- [ ] **Step 6: Same change for the ASPIS block**

Change:
```jsx
            {/* ASPIS */}
            <div className="border border-line rounded-xl p-4 space-y-2.5">
              <div className="font-barlow-condensed font-bold text-[11px] uppercase tracking-wider text-muted">🚴 Aspis</div>
              <div className="flex gap-2">
                <input
                  value={aspiInput}
                  onChange={e => setAspiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAspi() } }}
                  placeholder="Naam toevoegen..."
                  className={inputCls}
                />
                <button onClick={addAspi} className="btn-primary px-3 rounded-lg shrink-0"><Plus className="w-4 h-4" /></button>
              </div>
              {form.aspis.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.aspis.map(naam => (
                    <span key={naam} className="flex items-center gap-1 bg-card-2 border border-line text-muted text-xs font-barlow-condensed font-semibold px-2.5 py-1.5 rounded-full">
                      {naam}
                      <button onClick={() => removeAspi(naam)} className="hover:text-red-400 transition-colors ml-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
```
to:
```jsx
            {/* ASPIS */}
            <div className="border border-line rounded-xl p-4 space-y-2.5">
              <div className="font-barlow-condensed font-bold text-[11px] uppercase tracking-wider text-muted">🚴 Aspis</div>
              <div className="flex gap-2">
                <input
                  value={aspiInput}
                  onChange={e => setAspiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAspi() } }}
                  placeholder="Naam toevoegen..."
                  className={inputCls}
                />
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => setAspiGeslacht('jongen')}
                    className={`px-2.5 rounded-lg border text-xs font-barlow-condensed font-bold transition-colors ${aspiGeslacht === 'jongen' ? 'bg-yellow text-black border-yellow' : 'bg-card-2 text-muted border-line hover:border-yellow/40'}`}>
                    🧑
                  </button>
                  <button type="button" onClick={() => setAspiGeslacht('meisje')}
                    className={`px-2.5 rounded-lg border text-xs font-barlow-condensed font-bold transition-colors ${aspiGeslacht === 'meisje' ? 'bg-yellow text-black border-yellow' : 'bg-card-2 text-muted border-line hover:border-yellow/40'}`}>
                    👧
                  </button>
                </div>
                <button onClick={addAspi} disabled={!aspiInput.trim() || !aspiGeslacht} className="btn-primary px-3 rounded-lg shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /></button>
              </div>
              {form.aspis.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.aspis.map(naam => (
                    <SpelerPill
                      key={naam}
                      naam={naam}
                      geslacht={form.geslacht[naam]}
                      accentCls="bg-card-2 border border-line text-muted"
                      onSetGeslacht={(w) => setGeslacht(naam, w)}
                      onRemove={() => removeAspi(naam)}
                      isOpen={editingGeslachtFor === naam}
                      onToggleOpen={() => setEditingGeslachtFor(editingGeslachtFor === naam ? null : naam)}
                    />
                  ))}
                </div>
              )}
            </div>
```

- [ ] **Step 7: Manual verification**

No test framework exists in this repo. Verify:
1. `npm run build` completes cleanly.
2. Start the dev server in the background, wait ~2s, check its actual bound port/base-path from stdout, `curl` the `/admin` route and confirm HTTP 200.
3. Stop the dev server afterward.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Admin.jsx
git commit -m "feat(mvp-gender): require gender on new roster members, allow editing existing ones"
```

---

## Task 3: TeamCard — read-only gender badge

**Files:**
- Modify: `src/components/TeamCard.jsx`

- [ ] **Step 1: Add a local icon helper and use it in both pill loops**

Change:
```jsx
import { motion } from 'framer-motion'

const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
```
to:
```jsx
import { motion } from 'framer-motion'

const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

function geslachtIcon(waarde) {
  return waarde === 'jongen' ? '🧑' : waarde === 'meisje' ? '👧' : '❓'
}
```

Change:
```jsx
            {/* LEIDING */}
            {(team.leden?.leiding?.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                <span className="font-barlow-condensed font-bold text-[9px] uppercase tracking-wider text-yellow mr-0.5">👑 Leiding</span>
                {team.leden.leiding.map(lid => (
                  <span key={lid} className="text-[11px] bg-yellow/10 text-yellow/85 border border-yellow/25 px-2 py-0.5 rounded-full font-barlow-condensed font-semibold">
                    {lid}
                  </span>
                ))}
              </div>
            )}

            {/* ASPIS */}
            {(team.leden?.aspis?.length > 0) && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-barlow-condensed font-bold text-[9px] uppercase tracking-wider text-muted mr-0.5">🚴 Aspis</span>
                {team.leden.aspis.map(lid => (
                  <span key={lid} className="text-[11px] bg-card-2 text-muted border border-line px-2 py-0.5 rounded-full font-barlow-condensed font-semibold">
                    {lid}
                  </span>
                ))}
              </div>
            )}
```
to:
```jsx
            {/* LEIDING */}
            {(team.leden?.leiding?.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 mb-1.5">
                <span className="font-barlow-condensed font-bold text-[9px] uppercase tracking-wider text-yellow mr-0.5">👑 Leiding</span>
                {team.leden.leiding.map(lid => (
                  <span key={lid} className="text-[11px] bg-yellow/10 text-yellow/85 border border-yellow/25 px-2 py-0.5 rounded-full font-barlow-condensed font-semibold">
                    {geslachtIcon(team.leden?.geslacht?.[lid])} {lid}
                  </span>
                ))}
              </div>
            )}

            {/* ASPIS */}
            {(team.leden?.aspis?.length > 0) && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-barlow-condensed font-bold text-[9px] uppercase tracking-wider text-muted mr-0.5">🚴 Aspis</span>
                {team.leden.aspis.map(lid => (
                  <span key={lid} className="text-[11px] bg-card-2 text-muted border border-line px-2 py-0.5 rounded-full font-barlow-condensed font-semibold">
                    {geslachtIcon(team.leden?.geslacht?.[lid])} {lid}
                  </span>
                ))}
              </div>
            )}
```

- [ ] **Step 2: Manual verification**

Run `npm run build` — must be clean. Start dev server, `curl` `/teams`, confirm HTTP 200, stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/components/TeamCard.jsx
git commit -m "feat(mvp-gender): show read-only gender badge on public Teams page"
```

---

## Task 4: Rankings — gender-split MVP tab

**Files:**
- Modify: `src/pages/Rankings.jsx`

- [ ] **Step 1: Import `berekenAllSpelerStats`, add the MVP tab and its color entry**

Change:
```jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { berekenJuniorenStats } from '../utils/mvp'

const TABS = [
  { key: 'general',  label: 'Algemeen',  icon: '🏆', pointKey: 'total_points' },
  { key: 'mountain', label: 'Berg',      icon: '🏔️', pointKey: 'mountain_points' },
  { key: 'sprint',   label: 'Sprint',    icon: '⚡',  pointKey: 'sprint_points' },
  { key: 'junioren', label: 'Junioren',  icon: '🧒', pointKey: 'junioren_points' },
]

const podiumBorder = ['border-yellow/30', 'border-gray-400/20', 'border-orange-500/20']
const podiumBg     = ['rgba(255,214,0,0.08)', 'rgba(192,192,192,0.06)', 'rgba(205,127,50,0.06)']
const podiumEmoji  = ['🥇', '🥈', '🥉']

const TAB_BAR_COLOR = {
  general:  '#FFD600',
  mountain: '#3B82F6',
  sprint:   '#22C55E',
  junioren: '#8B5CF6',
}
```
to:
```jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { berekenJuniorenStats, berekenAllSpelerStats } from '../utils/mvp'

const TABS = [
  { key: 'general',  label: 'Algemeen',  icon: '🏆', pointKey: 'total_points' },
  { key: 'mountain', label: 'Berg',      icon: '🏔️', pointKey: 'mountain_points' },
  { key: 'sprint',   label: 'Sprint',    icon: '⚡',  pointKey: 'sprint_points' },
  { key: 'junioren', label: 'Junioren',  icon: '🧒', pointKey: 'junioren_points' },
  { key: 'mvp',      label: 'MVP',       icon: '👑', pointKey: null },
]

const podiumBorder = ['border-yellow/30', 'border-gray-400/20', 'border-orange-500/20']
const podiumBg     = ['rgba(255,214,0,0.08)', 'rgba(192,192,192,0.06)', 'rgba(205,127,50,0.06)']
const podiumEmoji  = ['🥇', '🥈', '🥉']

const TAB_BAR_COLOR = {
  general:  '#FFD600',
  mountain: '#3B82F6',
  sprint:   '#22C55E',
  junioren: '#8B5CF6',
  mvp:      '#FFD600',
}

function MvpGenderList({ title, icon, players, accentColor }) {
  const top = players.slice(0, 8)
  return (
    <div>
      <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-3">
        {icon} {title}
      </p>
      {top.length === 0 ? (
        <div className="text-center py-8 text-muted font-barlow text-sm">
          Nog geen scores voor deze categorie
        </div>
      ) : (
        <div className="space-y-2">
          {top.map((player, i) => (
            <div
              key={`${player.naam}-${player.team_id}`}
              className="card rounded-xl px-4 py-3 flex items-center gap-3"
              style={i === 0 ? { background: `linear-gradient(135deg, ${accentColor}14, #1C1E2A)`, border: `1px solid ${accentColor}4D` } : {}}
            >
              <span
                className={`font-bebas text-2xl leading-none w-8 text-center shrink-0 ${i === 0 ? '' : 'text-muted'}`}
                style={i === 0 ? { color: accentColor } : {}}
              >
                {i === 0 ? '👑' : i + 1}
              </span>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: player.team_kleur }} />
              <div className="flex-1 min-w-0">
                <div className="font-barlow-condensed font-semibold text-white text-base leading-none truncate">
                  {player.naam}
                </div>
                <div className="text-muted text-xs font-barlow-condensed mt-0.5">
                  {player.team_naam} · {player.challenges_gespeeld} challenge{player.challenges_gespeeld !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bebas text-xl leading-none" style={{ color: accentColor }}>
                  {player.punten_bijgedragen}
                </span>
                <span className="text-muted text-xs font-barlow-condensed ml-1">pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Guard the team-pointKey logic and the main team-ranking list against the new tab**

Change:
```js
  const tab     = TABS.find(t => t.key === activeTab)
  const sorted  = [...teams].sort((a, b) => (b[tab.pointKey] ?? 0) - (a[tab.pointKey] ?? 0))
  const maxPts  = Math.max(...sorted.map(t => t[tab.pointKey] ?? 0), 1)

  const totalPoints  = sorted.reduce((s, t) => s + t.total_points, 0)
  const mostMountain = [...sorted].sort((a, b) => b.mountain_points - a.mountain_points)[0]
  const mostSprint   = [...sorted].sort((a, b) => b.sprint_points   - a.sprint_points)[0]

  const juniorenStats = berekenJuniorenStats(teams, challenges).filter(p => p.mvp_score > 0)
```
to:
```js
  const tab     = TABS.find(t => t.key === activeTab)
  const sorted  = tab.pointKey ? [...teams].sort((a, b) => (b[tab.pointKey] ?? 0) - (a[tab.pointKey] ?? 0)) : []
  const maxPts  = Math.max(...sorted.map(t => t[tab.pointKey] ?? 0), 1)

  const totalPoints  = sorted.reduce((s, t) => s + t.total_points, 0)
  const mostMountain = [...sorted].sort((a, b) => b.mountain_points - a.mountain_points)[0]
  const mostSprint   = [...sorted].sort((a, b) => b.sprint_points   - a.sprint_points)[0]

  const juniorenStats = berekenJuniorenStats(teams, challenges).filter(p => p.mvp_score > 0)

  const allMvpStats        = activeTab === 'mvp' ? berekenAllSpelerStats(teams, challenges) : []
  const jongensStats       = allMvpStats.filter(p => p.geslacht === 'jongen')
  const meisjesStats       = allMvpStats.filter(p => p.geslacht === 'meisje')
  const nietIngesteldCount = allMvpStats.filter(p => !p.geslacht).length
```

- [ ] **Step 3: Wrap the main team-ranking `AnimatePresence` block so it's skipped for the MVP tab**

Change:
```jsx
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2.5"
          >
            {sorted.map((team, index) => (
```
to:
```jsx
        {activeTab !== 'mvp' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2.5"
          >
            {sorted.map((team, index) => (
```

Then find the closing tags of that same block:
```jsx
            {sorted.length === 0 && (
              <div className="text-center py-16 text-muted font-barlow text-sm">
                Nog geen scores ingevoerd
              </div>
            )}
          </motion.div>
        </AnimatePresence>
```
and change to:
```jsx
            {sorted.length === 0 && (
              <div className="text-center py-16 text-muted font-barlow text-sm">
                Nog geen scores ingevoerd
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        )}
```

- [ ] **Step 4: Add the MVP tab's own content block**

Directly after the closing `)}` added in Step 3 (i.e. right before the existing `{/* Junioren: aspis ranking */}` comment), add:

```jsx
        {activeTab === 'mvp' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {nietIngesteldCount > 0 && (
              <div className="bg-yellow/10 border border-yellow/30 rounded-xl px-4 py-3 mb-5 text-sm font-barlow-condensed font-semibold text-yellow">
                ⚠️ {nietIngesteldCount} speler{nietIngesteldCount !== 1 ? 's' : ''} nog niet ingesteld — vul in via de Teams-tab
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <MvpGenderList title="Top MVP Jongens" icon="🧑" players={jongensStats} accentColor="#3B82F6" />
              <MvpGenderList title="Top MVP Meisjes" icon="👧" players={meisjesStats} accentColor="#EC4899" />
            </div>
          </motion.div>
        )}

```

- [ ] **Step 5: Manual verification**

No test framework exists. Verify:
1. `npm run build` completes cleanly.
2. Start the dev server in the background, wait ~2s, check its bound port/base-path from stdout, `curl` the `/rankings` route and confirm HTTP 200.
3. Stop the dev server afterward.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Rankings.jsx
git commit -m "feat(mvp-gender): add gender-split MVP tab to Rankings"
```

---

## Task 5: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Build + route smoke test**

Run `npm run build` (clean), start the dev server, `curl` every route (`/`, `/teams`, `/rankings`, `/stage/1`, `/stage/2`, `/stage/3`, `/live`, `/strafwiel`, `/admin`), confirm no server errors, stop the dev server.

- [ ] **Step 2: Static trace — migration safety**

Read the final `src/context/AppContext.jsx` and `src/pages/Live.jsx` `migrateLeden` functions and confirm: a team loaded from localStorage written before this feature (i.e. `leden: { leiding: [...], aspis: [...] }` with no `geslacht` key at all) normalizes to `geslacht: {}` without throwing anywhere downstream. Trace `berekenSpelerStats` for a player whose name isn't a key in that empty `{}` map and confirm `geslacht` resolves to `null` (not `undefined`, not a crash), and that this is treated as "niet ingesteld" (excluded from both gender lists, counted in the banner) rather than silently defaulting to either gender.

- [ ] **Step 3: Static trace — add-then-filter round trip**

Trace: admin adds a new aspi "Testkind" in `TeamsTab`, selects "meisje" in the toggle, clicks add (verify the `+` button is disabled until both name and gender are set), clicks "Opslaan". Confirm `team.leden.geslacht['Testkind'] === 'meisje'` after save. Confirm that on `/rankings`'s MVP tab, if "Testkind" has any `mvp_score > 0` from a completed challenge, they appear in the "Top MVP Meisjes" list and NOT in "Top MVP Jongens".

- [ ] **Step 4: Static trace — badge editing an existing (migrated) player**

Trace: a pre-existing player "Oudspeler" with no `geslacht` entry shows `❓` (via `geslachtIcon(undefined)` returning `'❓'`) in the `TeamsTab` edit form. Clicking the badge opens the mini-toggle; clicking "🧑 Jongen" calls `setGeslacht('Oudspeler', 'jongen')`, which updates `form.geslacht` and closes the toggle. Confirm this survives a subsequent click on "Opslaan" (i.e. `save()`'s `leden.geslacht` includes the update, since it reads from the same `form.geslacht` object that `setGeslacht` mutated).

- [ ] **Step 5: Report**

If any trace in Steps 2-4 reveals a real bug, report it clearly (do not silently patch — this is a verification task). Otherwise state explicitly: build clean, all routes respond, all 3 traces confirmed correct. Also explicitly list what could NOT be verified due to lack of browser tooling (actual click interactions, visual badge rendering, popover positioning/z-index in a real layout).
