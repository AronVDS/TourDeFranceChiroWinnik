import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Plus, Trash2, Edit2, Save, X, ChevronUp, ChevronDown, RefreshCw, AlertTriangle, LogOut } from 'lucide-react'
import { useApp } from '../context/AppContext'

/* ── Style tokens ───────────────────────────────────────────── */
const inputCls = 'input-field'
const labelCls = 'block font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.15em] text-muted mb-1.5'
const btnP = 'btn-primary px-4 py-2.5 text-sm rounded-lg'
const btnS = 'btn-ghost px-4 py-2.5 text-sm rounded-lg'
const btnD = 'btn-danger px-4 py-2.5 text-sm rounded-lg'
const cardCls = 'card rounded-xl'

/* ── Password gate ──────────────────────────────────────────── */
function PasswordGate({ onAuth }) {
  const { config } = useApp()
  const [pass, setPass] = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    if (pass === config.admin_password) {
      sessionStorage.setItem('tdf_admin_auth', '1')
      onAuth()
    } else {
      setError(true)
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="card rounded-2xl p-8 w-full max-w-sm text-center"
      >
        <div className="w-14 h-14 rounded-xl bg-yellow/10 border border-yellow/30 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-6 h-6 text-yellow" />
        </div>
        <h2 className="font-bebas text-5xl text-white mb-1">ADMIN</h2>
        <p className="text-muted font-barlow text-sm mb-6">Voer het admin wachtwoord in</p>
        <input
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Wachtwoord..."
          autoFocus
          className={`${inputCls} text-center text-base mb-3 ${error ? 'border-red-500' : ''}`}
        />
        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-red-400 text-xs font-barlow mb-3">
              Fout wachtwoord, probeer opnieuw.
            </motion.p>
          )}
        </AnimatePresence>
        <button onClick={submit} className="btn-primary w-full font-bebas text-2xl py-3.5 rounded-lg">
          Inloggen
        </button>
      </motion.div>
    </div>
  )
}

/* ── Form panel ─────────────────────────────────────────────── */
function FormPanel({ title, onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden mb-4"
      >
        <div className="card-elevated rounded-xl p-5 border border-yellow/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-barlow-condensed font-bold text-sm uppercase tracking-wider text-yellow">{title}</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-muted hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {children}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

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

/* ── Teams tab ──────────────────────────────────────────────── */
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

  const save = () => {
    if (!form.naam.trim()) return
    const leden = { leiding: form.leiding, aspis: form.aspis, geslacht: form.geslacht }
    if (editing === 'new') addTeam({ naam: form.naam.trim(), kleur: form.kleur, leden })
    else updateTeam(editing, { naam: form.naam.trim(), kleur: form.kleur, leden })
    setEditing(null)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-bebas text-4xl text-white">Teams</h2>
        <button onClick={startNew} className={btnP}><Plus className="w-4 h-4" /> Nieuw Team</button>
      </div>

      {editing && (
        <FormPanel title={editing === 'new' ? 'Nieuw Team' : 'Team Bewerken'} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Team naam *</label>
                <input value={form.naam} onChange={e => setForm(p => ({ ...p, naam: e.target.value }))} placeholder="Team naam" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Kleur</label>
                <input type="color" value={form.kleur} onChange={e => setForm(p => ({ ...p, kleur: e.target.value }))}
                  className="w-12 h-11 rounded-lg cursor-pointer border border-line p-1 bg-card-2" />
              </div>
            </div>

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

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setEditing(null)} className={btnS}>Annuleer</button>
              <button onClick={save} className={btnP}><Save className="w-4 h-4" /> Opslaan</button>
            </div>
          </div>
        </FormPanel>
      )}

      <div className="space-y-2">
        {teams.length === 0 && (
          <div className="text-center py-10 text-muted"><div className="text-4xl mb-2">👥</div><p className="font-barlow text-sm">Geen teams aangemaakt</p></div>
        )}
        {teams.map(team => {
          const leiding = team.leden?.leiding ?? []
          const aspis = team.leden?.aspis ?? []
          return (
            <div key={team.id} className={`${cardCls} p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-xl shrink-0" style={{ background: team.kleur }} />
              <div className="flex-1 min-w-0">
                <div className="font-barlow-condensed font-semibold text-white">{team.naam}</div>
                <div className="text-xs text-muted font-barlow truncate">
                  {leiding.length > 0 && <span>👑 {leiding.join(', ')}</span>}
                  {leiding.length > 0 && aspis.length > 0 && <span className="mx-1.5 opacity-40">·</span>}
                  {aspis.length > 0 && <span>🚴 {aspis.join(', ')}</span>}
                  {leiding.length === 0 && aspis.length === 0 && '—'}
                </div>
              </div>
              <div className="font-bebas text-xl text-yellow shrink-0">{team.total_points} pts</div>
              <button onClick={() => startEdit(team)} className="p-2 text-muted hover:text-yellow hover:bg-yellow/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteTeam(team.id)} className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
    setActive(readActiveQuiz())
    const id = setInterval(() => setActive(readActiveQuiz()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setEditing(null)
  }, [stageFilter])

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

/* ── Challenges tab ─────────────────────────────────────────── */
const TYPE_LABELS = { general: '🏆 Algemeen', mountain: '🏔️ Berg', sprint: '⚡ Sprint', junioren: '🧒 Junioren' }
const TYPE_COLORS = { general: '#FFD600', mountain: '#3B82F6', sprint: '#22C55E', junioren: '#8B5CF6' }

function ChallengesTab() {
  const { challenges, addChallenge, updateChallenge, deleteChallenge } = useApp()
  const [stageFilter, setStageFilter] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ naam: '', stage_number: 1, type: 'general', power_stage: false, result_mode: 'ranking', notes: '' })

  const filtered = challenges.filter(c => c.stage_number === stageFilter)

  const startNew = () => { setEditing('new'); setForm({ naam: '', stage_number: stageFilter, type: 'general', power_stage: false, result_mode: 'ranking', notes: '' }) }
  const startEdit = (c) => { setEditing(c.id); setForm({ naam: c.naam, stage_number: c.stage_number, type: c.type, power_stage: c.power_stage, result_mode: c.result_mode ?? 'ranking', notes: c.notes }) }
  const save = () => {
    if (!form.naam.trim()) return
    if (editing === 'new') addChallenge({ ...form, naam: form.naam.trim() })
    else updateChallenge(editing, form)
    setEditing(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bebas text-4xl text-white">Challenges</h2>
        <button onClick={startNew} className={btnP}><Plus className="w-4 h-4" /> Nieuwe Challenge</button>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 mb-4 p-1 bg-card border border-line rounded-xl">
        {[1, 2, 3].map(s => (
          <button key={s} onClick={() => setStageFilter(s)}
            className={`flex-1 py-2 px-3 rounded-lg font-barlow-condensed font-bold text-sm transition-all border ${
              stageFilter === s ? 'bg-yellow text-black border-yellow' : 'text-muted hover:text-white border-transparent'
            }`}>
            Stage {s}
            <span className="ml-1.5 bg-card-2 text-muted text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {challenges.filter(c => c.stage_number === s).length}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <FormPanel title={editing === 'new' ? 'Nieuwe Challenge' : 'Challenge Bewerken'} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Challenge naam *</label>
              <input value={form.naam} onChange={e => setForm(p => ({ ...p, naam: e.target.value }))} placeholder="Challenge naam" className={inputCls} />
            </div>
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
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optionele notities..." className={`${inputCls} h-20 resize-none`} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setEditing(null)} className={btnS}>Annuleer</button>
              <button onClick={save} className={btnP}><Save className="w-4 h-4" /> Opslaan</button>
            </div>
          </div>
        </FormPanel>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && <div className="text-center py-10 text-muted font-barlow text-sm">Geen challenges voor Stage {stageFilter}</div>}
        {filtered.map(c => (
          <div key={c.id} className={`${cardCls} p-4 flex items-center gap-3`}>
            <div className="flex-1 min-w-0">
              <div className="font-barlow-condensed font-semibold text-white">
                {c.naam}
                {c.power_stage && <span className="ml-2 badge border border-yellow/40 bg-yellow/10 text-yellow">⚡ Power</span>}
              </div>
              <div className="text-xs font-barlow-condensed font-bold mt-0.5" style={{ color: TYPE_COLORS[c.type] ?? '#8892A4' }}>
                {TYPE_LABELS[c.type] ?? c.type}
              </div>
            </div>
            <button onClick={() => updateChallenge(c.id, { completed: !c.completed })}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-barlow-condensed font-bold transition-colors border ${
                c.completed ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-card-2 text-muted border-line hover:border-yellow/30'
              }`}>
              {c.completed ? '✅ Voltooid' : '⏳ Open'}
            </button>
            <button onClick={() => startEdit(c)} className="p-2 text-muted hover:text-yellow hover:bg-yellow/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => deleteChallenge(c.id)} className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Results tab ────────────────────────────────────────────── */
function ResultsTab() {
  const { teams, challenges, setResults: saveResults } = useApp()
  const [selected, setSelected]           = useState('')
  const [order, setOrder]                 = useState([])
  const [playerSelections, setPlayerSel]  = useState({})
  const [saved, setSaved]                 = useState(false)

  const challenge = challenges.find(c => c.id === parseInt(selected))

  useEffect(() => {
    if (!challenge) return
    if (challenge.results?.length > 0) {
      const sorted = [...challenge.results].sort((a, b) => a.positie - b.positie)
      setOrder(sorted.map(r => r.team_id))
      const sel = {}
      sorted.forEach(r => { sel[r.team_id] = r.spelers ?? [] })
      setPlayerSel(sel)
    } else {
      setOrder(teams.map(t => t.id))
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
    saveResults(challenge.id, order, playerSelections)
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
            Rangschik van <strong className="text-white">1e (beste)</strong> naar <strong className="text-white">laatste</strong> en duid aan wie de opdracht uitvoerde:
          </p>

          <div className="space-y-3 mb-5">
            {order.map((teamId, idx) => {
              const team    = teams.find(t => t.id === teamId)
              const pts     = challenge.power_stage ? Math.max(0, (teams.length - 1 - idx) * 2) : Math.max(0, teams.length - 1 - idx)
              const leiding = team?.leden?.leiding ?? []
              const aspis   = team?.leden?.aspis   ?? []
              const allSpelers = [
                ...leiding.map(n => ({ naam: n, isLeiding: true })),
                ...aspis.map(n => ({ naam: n, isLeiding: false })),
              ]
              const selected = playerSelections[teamId] ?? []
              const hasSelection = selected.length > 0

              return (
                <div key={teamId} className={`${cardCls} p-4`}>
                  {/* Top row: rank + team + pts + move */}
                  <div className="flex items-center gap-3">
                    <span className="font-bebas text-2xl text-muted w-8 leading-none">#{idx + 1}</span>
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: team?.kleur }} />
                    <span className="flex-1 font-barlow-condensed font-semibold text-white">{team?.naam}</span>
                    <span className="font-bebas text-xl text-yellow">{pts} pts</span>
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

                  {/* Player selection */}
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
                          const on = selected.includes(naam)
                          const disabled = challenge.type === 'junioren' && isLeiding
                          return (
                            <button
                              key={naam}
                              onClick={() => !disabled && togglePlayer(teamId, naam)}
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
                </div>
              )
            })}
          </div>

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

/* ── Bonus/Penalty tab ──────────────────────────────────────── */
function BonusPenaltyTab() {
  const { teams, bonusPenalties, addBonusPenalty } = useApp()
  const [form, setForm] = useState({ team_id: '', type: 'bonus', punten: '', reden: '' })
  const [ok, setOk] = useState(false)

  const submit = () => {
    if (!form.team_id || !form.punten || parseInt(form.punten) <= 0) return
    addBonusPenalty({ team_id: parseInt(form.team_id), type: form.type, punten: parseInt(form.punten), reden: form.reden })
    setForm(p => ({ ...p, punten: '', reden: '' }))
    setOk(true)
    setTimeout(() => setOk(false), 2000)
  }

  return (
    <div>
      <h2 className="font-bebas text-4xl text-white mb-5">Bonus & Straf</h2>

      <div className={`${cardCls} p-5 mb-6`}>
        <h3 className={`${labelCls} mb-4`}>Nieuw invoer</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Team</label>
            <select value={form.team_id} onChange={e => setForm(p => ({ ...p, team_id: e.target.value }))} className={inputCls}>
              <option value="">Kies team...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.naam}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex gap-2">
              {['bonus', 'penalty'].map(type => (
                <button key={type} onClick={() => setForm(p => ({ ...p, type }))}
                  className={`flex-1 py-2.5 rounded-lg font-barlow-condensed font-bold text-sm transition-colors border ${
                    form.type === type
                      ? type === 'bonus' ? 'bg-green-500/15 border-green-500/40 text-green-400' : 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'bg-card-2 border-line text-muted hover:border-yellow/30'
                  }`}>
                  {type === 'bonus' ? '➕ Bonus' : '➖ Straf'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Punten</label>
            <input type="number" min="1" value={form.punten} onChange={e => setForm(p => ({ ...p, punten: e.target.value }))} placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Reden (optioneel)</label>
            <input value={form.reden} onChange={e => setForm(p => ({ ...p, reden: e.target.value }))} placeholder="Bijv. Winnaar challenge" className={inputCls} />
          </div>
        </div>
        <button onClick={submit}
          className={`w-full font-bebas text-xl py-3.5 rounded-xl transition-all border ${
            ok ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow text-black border-yellow hover:bg-yellow/90'
          }`}>
          {ok ? '✅ Toegevoegd!' : 'Toevoegen'}
        </button>
      </div>

      <div>
        <h3 className={`${labelCls} mb-3`}>Recente bonus/straf ({bonusPenalties.length})</h3>
        {bonusPenalties.length === 0
          ? <p className="text-muted font-barlow text-sm py-4 text-center">Nog niets ingevoerd</p>
          : (
            <div className="space-y-2">
              {[...bonusPenalties].reverse().slice(0, 15).map(bp => {
                const team = teams.find(t => t.id === bp.team_id)
                return (
                  <div key={bp.id} className={`${cardCls} flex items-center gap-3 p-3.5`}>
                    <span className={`text-base font-bold w-5 text-center ${bp.type === 'bonus' ? 'text-green-400' : 'text-red-400'}`}>
                      {bp.type === 'bonus' ? '+' : '−'}
                    </span>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: team?.kleur }} />
                    <span className="flex-1 font-barlow-condensed font-semibold text-sm text-white">{team?.naam}</span>
                    <span className="font-bebas text-lg text-yellow">{bp.punten} pts</span>
                    {bp.reden && <span className="text-muted text-xs font-barlow italic truncate max-w-36">{bp.reden}</span>}
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}

/* ── Timer section (inside Config tab) ─────────────────────── */
function TimerSection() {
  const [mins, setMins]   = useState('5')
  const [secs, setSecs]   = useState('0')
  const [label, setLabel] = useState('PLAS PAUZE')
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('tdf_timer')
        setActive(raw ? (JSON.parse(raw).timer_active ?? false) : false)
      } catch { setActive(false) }
    }
    sync()
    const id = setInterval(sync, 2000)
    return () => clearInterval(id)
  }, [])

  const start = () => {
    const total = parseInt(mins || '0') * 60 + parseInt(secs || '0')
    if (total <= 0) return
    localStorage.setItem('tdf_timer', JSON.stringify({
      timer_active: true,
      timer_end: Date.now() + total * 1000,
      timer_label: label.trim() || 'PAUZE',
    }))
    setActive(true)
  }

  const stop = () => {
    try {
      const raw = localStorage.getItem('tdf_timer')
      const s = raw ? JSON.parse(raw) : {}
      localStorage.setItem('tdf_timer', JSON.stringify({ ...s, timer_active: false }))
    } catch {}
    setActive(false)
  }

  return (
    <div className={`${cardCls} p-5 mt-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.15em] text-muted">
          ⏱️ Timer Live Scherm
        </h3>
        {active && (
          <span className="font-barlow-condensed font-bold text-xs uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
            ● Actief
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className={labelCls}>Label (zichtbaar op TV)</label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="PLAS PAUZE"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Duur (min : sec)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="99"
              value={mins}
              onChange={e => setMins(e.target.value)}
              className={`${inputCls} w-20 text-center`}
            />
            <span className="font-bebas text-xl text-muted">:</span>
            <input
              type="number" min="0" max="59"
              value={secs}
              onChange={e => setSecs(e.target.value)}
              className={`${inputCls} w-20 text-center`}
            />
            <span className="text-muted font-barlow-condensed text-sm">min : sec</span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={start}
            className="flex-1 font-bebas text-xl py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white border border-green-500 transition-colors"
          >
            ▶ Start Timer
          </button>
          <button
            onClick={stop}
            disabled={!active}
            className="flex-1 font-bebas text-xl py-3 rounded-xl transition-colors border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ⏹ Stop / Reset
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Config tab ─────────────────────────────────────────────── */
function ConfigTab() {
  const { config, updateConfig, recalculateAll, resetScores } = useApp()
  const [form, setForm] = useState({ ...config })
  const [saved, setSaved] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [recalcDone, setRecalcDone] = useState(false)

  const save = () => { updateConfig(form); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const handleRecalc = () => { recalculateAll(); setRecalcDone(true); setTimeout(() => setRecalcDone(false), 2000) }

  return (
    <div>
      <h2 className="font-bebas text-4xl text-white mb-5">Configuratie</h2>

      <div className={`${cardCls} p-5 mb-5 space-y-4`}>
        <div>
          <label className={labelCls}>Event Naam</label>
          <input value={form.event_naam} onChange={e => setForm(p => ({ ...p, event_naam: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Startdatum & -tijd</label>
          <input type="datetime-local" value={form.start_date?.slice(0, 16)} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputCls}>
            <option value="upcoming">⏳ Binnenkort</option>
            <option value="active">🔴 Actief</option>
            <option value="locked">🔒 Afgesloten</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Admin Wachtwoord</label>
          <input type="text" value={form.admin_password} onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))} className={`${inputCls} font-mono`} />
        </div>
        <div>
          <label className={labelCls}>Punten per quizvraag</label>
          <input type="number" min="0" value={form.quiz_points_per_question} onChange={e => setForm(p => ({ ...p, quiz_points_per_question: Math.max(0, parseInt(e.target.value) || 0) }))} className={inputCls} />
        </div>
        <button onClick={save}
          className={`w-full font-bebas text-xl py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 border ${
            saved ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow text-black border-yellow hover:bg-yellow/90'
          }`}>
          {saved ? '✅ Opgeslagen!' : <><Save className="w-5 h-5" /> Opslaan</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleRecalc}
          className={`py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors border font-barlow-condensed font-bold text-sm ${
            recalcDone ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-card border-line text-muted hover:text-white hover:border-yellow/30'
          }`}>
          <RefreshCw className="w-4 h-4" />
          {recalcDone ? 'Klaar!' : 'Herbereken Scores'}
        </button>
        <button onClick={() => setResetConfirm(true)} className={`${btnD} py-3.5`}>
          <AlertTriangle className="w-4 h-4" /> Reset Scores
        </button>
      </div>

      <TimerSection />

      <AnimatePresence>
        {resetConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setResetConfirm(false)}>
            <motion.div initial={{ scale: 0.88 }} animate={{ scale: 1 }} exit={{ scale: 0.88 }}
              onClick={e => e.stopPropagation()}
              className="card rounded-2xl p-7 max-w-sm w-full text-center border border-red-500/30">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="font-bebas text-3xl text-white mb-2">Alles resetten?</h3>
              <p className="text-muted font-barlow text-sm mb-6">
                Dit wist alle scores, resultaten, bonus/straf en quiz-antwoorden. Teams en quizvragen blijven bewaard. Niet ongedaan te maken!
              </p>
              <div className="flex gap-3">
                <button onClick={() => setResetConfirm(false)} className={`flex-1 ${btnS} py-3 justify-center`}>Annuleer</button>
                <button onClick={() => { resetScores(); setResetConfirm(false) }} className={`flex-1 ${btnD} py-3 justify-center`}>Ja, reset!</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main admin ─────────────────────────────────────────────── */
const TABS = [
  { key: 'teams',        label: 'Teams' },
  { key: 'challenges',   label: 'Challenges' },
  { key: 'results',      label: 'Resultaten' },
  { key: 'bonuspenalty', label: 'Bonus/Straf' },
  { key: 'quiz',         label: 'Quiz' },
  { key: 'config',       label: 'Config' },
]

export default function Admin() {
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem('tdf_admin_auth') === '1')
  const [activeTab, setActiveTab] = useState('teams')
  const logout = () => { sessionStorage.removeItem('tdf_admin_auth'); setIsAuth(false) }

  if (!isAuth) return <PasswordGate onAuth={() => setIsAuth(true)} />

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-5 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-barlow-condensed font-bold text-[11px] uppercase tracking-[0.3em] text-muted mb-0.5">
              ⚙️ Beheer
            </p>
            <h1 className="font-bebas text-6xl text-white leading-none">Admin</h1>
          </div>
          {/* Logout: mobile only (desktop has it in sidebar) */}
          <button onClick={logout}
            className="md:hidden flex items-center gap-2 text-muted hover:text-red-400 font-barlow-condensed font-semibold text-sm px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors border border-line">
            <LogOut className="w-4 h-4" /> Uitloggen
          </button>
        </div>

        <div className="md:flex md:gap-8">

          {/* ── Desktop sidebar ────────────────────────────── */}
          <div className="hidden md:flex flex-col w-44 shrink-0">
            <div className="space-y-1">
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-barlow-condensed font-bold text-sm uppercase tracking-wider transition-all ${
                    activeTab === tab.key
                      ? 'bg-yellow text-black'
                      : 'text-muted hover:text-white hover:bg-card'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <button onClick={logout}
              className="mt-6 flex items-center gap-2 text-muted hover:text-red-400 font-barlow-condensed font-semibold text-sm px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4" /> Uitloggen
            </button>
          </div>

          {/* ── Mobile horizontal tabs ─────────────────────── */}
          <div className="md:hidden flex gap-1 mb-6 p-1 bg-card border border-line rounded-xl overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 py-2.5 px-3 rounded-lg font-barlow-condensed font-bold text-xs uppercase tracking-wide whitespace-nowrap transition-all border ${
                  activeTab === tab.key ? 'bg-yellow text-black border-yellow' : 'text-muted border-transparent hover:text-white'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Content ────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'teams'        && <TeamsTab />}
                {activeTab === 'challenges'   && <ChallengesTab />}
                {activeTab === 'results'      && <ResultsTab />}
                {activeTab === 'bonuspenalty' && <BonusPenaltyTab />}
                {activeTab === 'quiz'         && <QuizTab />}
                {activeTab === 'config'       && <ConfigTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
