# Quiz Feature — Design Spec

Datum: 2026-07-12
Status: Approved (design), niet geïmplementeerd

## Doel

Per stage (1/2/3) horen exact 4 quizvragen die de admin live kan tonen op het
`/live`-scherm tijdens het evenement. De organisator leest de vraag voor, teams
antwoorden op papier, en de admin vinkt per team aan wie het juist had. Correct
aangevinkte antwoorden tellen automatisch mee in de teamscore.

## 1. Datamodel

### `tdf_quiz` (nieuwe AppContext state, localStorage-gepersisteerd)

Elke stage heeft **altijd precies 4 vaste vraag-slots** — er wordt niet dynamisch
toegevoegd of verwijderd, enkel bewerkt.

```js
{
  "1": [
    { id: 1721000000001, tekst: "Wat is de hoofdstad van Frankrijk?",
      opties: ["Parijs", "Lyon", "Marseille", "Nice"],
      antwoorden: { "1": true, "2": false } },
    { id: 1721000000002, tekst: "", opties: [], antwoorden: {} },
    { id: 1721000000003, tekst: "", opties: [], antwoorden: {} },
    { id: 1721000000004, tekst: "", opties: [], antwoorden: {} }
  ],
  "2": [ /* exact 4 */ ],
  "3": [ /* exact 4 */ ]
}
```

- `opties`: array van 0–4 strings. Leeg array = open vraag. Gevuld = multiple
  choice, gerenderd als A/B/C/D.
- `antwoorden`: map van `String(teamId) → boolean`. Ontbrekende entry = nog niet
  aangevinkt = telt niet mee als correct.
- Bij het laden wordt de data genormaliseerd (zelfde defensieve stijl als
  `loadTeams`/`migrateLeden`): ontbrekende stages of een afwijkend aantal
  vragen worden aangevuld tot exact 3 stages × 4 vragen, zodat corrupte of
  oude localStorage-data de UI niet breekt.

### `tdf_quiz_active` (losse key, GEEN AppContext-state)

```js
{ stage: 2, questionIndex: 1 } | null
```

Rechtstreeks gelezen/geschreven via `localStorage`, zelfde patroon als het
bestaande `tdf_timer`. Zowel de Admin Quiz-tab als `/live` pollen deze key
periodiek (zie sectie 3) — dit is bewust géén React-context state, zodat het
cross-tab werkt (Admin-laptop ↔ TV-scherm) zonder extra sync-laag.

### Config

Nieuw veld `config.quiz_points_per_question` (default `10`), bewerkbaar in de
bestaande Config-tab naast de andere event-instellingen.

### Team-model

Nieuw veld `quiz_points: 0` op elk team, naast `mountain_points`,
`sprint_points`, `junioren_points`, etc. Moet toegevoegd worden aan:
- `SEED_TEAMS`
- `addTeam()`
- `resetScores()`
- de return-waarde van `recalculateAllPoints()` in `points.js`

## 2. Admin-interface

Nieuw top-level tabblad **"Quiz"** in `Admin.jsx` (naast Teams / Challenges /
Resultaten / Bonus-Straf / Config), met dezelfde stage-pill-filter (1/2/3) als
de Challenges-tab.

Per stage tonen we de 4 vaste vraag-slots als cards:

- **Bewerken** opent een `FormPanel` (zelfde patroon als Teams/Challenges):
  tekstveld voor de vraag + 4 optionele invoervelden "Optie A" t/m "Optie D".
  Alle 4 leeg = open vraag. Opslaan via `updateQuizQuestion(stage, index, updates)`.
- **"Toon op Live scherm"** knop per vraag, uitgeschakeld zolang `tekst` leeg
  is. Klik schrijft `tdf_quiz_active`. Is deze vraag al actief, dan toont de
  knop **"🔴 Actief — Verberg"** (klik wist `tdf_quiz_active` naar `null`).
  Alleen 1 vraag kan tegelijk actief zijn (globaal, niet per stage).
- **Per-team correct-toggles**: rij pills (teamkleur + naam) onder elke vraag.
  Klik toggelt `antwoorden[String(teamId)]` via
  `setQuizAnswer(stage, index, teamId, correct)` — telt onmiddellijk mee in de
  score (geen aparte "Opslaan"-actie nodig voor het aanvinken zelf). Toont
  live een samenvatting, bv. "3/4 teams juist = 30 pts".

**Config-tab** krijgt één extra veld: "Punten per quizvraag" (numeriek input,
default 10) → `config.quiz_points_per_question`, opgeslagen via de bestaande
`updateConfig`.

## 3. Live-scherm overlay (`/live`)

Nieuwe `QuizOverlay`-functie, **inline in `Live.jsx`** naast de bestaande
`TimerOverlay` (zelfde bestandsorganisatie, geen nieuw component-bestand).

- Pollt `tdf_quiz_active` elke **1 seconde** (sneller dan de bestaande 3s
  teams/challenges-poll — reveal-timing voelt directer aan dan scorebord-
  updates). Zodra niet-`null`, leest de bijbehorende vraag rechtstreeks uit
  `tdf_quiz` via `localStorage` (zelfde aanpak als de bestaande
  `parseTeams`/`parseChallenges`-helpers).
- Fullscreen overlay, `#12131A`-achtergrond. Bovenaan een badge
  "STAGE {n} · VRAAG {n}", vraagtekst groot gecentreerd in Bebas Neue.
- Heeft de vraag opties (`opties.length > 0`) → A/B/C/D grid (2×2), gele
  letter-badge + optietekst in Barlow Condensed. Geen opties → enkel de grote
  vraagtekst, geen grid, evt. klein label "Open vraag".
- Geen countdown, geen auto-hide. De admin bepaalt expliciet wanneer de
  overlay verschijnt/verdwijnt via de knop in de Quiz-tab.

### Interactie met TimerOverlay

**Quiz wint automatisch van Timer.** In `Live.jsx` wordt eerst gecontroleerd
of er een actieve quizvraag is; zo ja, wordt `TimerOverlay` niet gerenderd,
ongeacht of de timer intern nog afloopt. De timer blijft gewoon doorlopen op
de achtergrond (in `localStorage`) — enkel de overlay wordt onderdrukt zodra
er een quizvraag getoond wordt.

## 4. Scoring-integratie

### `points.js`

`recalculateAllPoints` krijgt twee extra parameters:

```js
recalculateAllPoints(teams, challenges, bonusPenalties, quiz, pointsPerQuestion)
```

Voor elk team wordt `quiz_points` berekend door alle stages/vragen in `quiz`
te doorlopen en `pointsPerQuestion` op te tellen voor elke vraag waar
`antwoorden[String(team.id)] === true`. `quiz_points` telt mee in
`total_points`, net als de andere categorieën.

**Bevestigd gedrag:** quiz-punten worden **live herberekend**, niet bevroren
op het moment van aanvinken. Wijzig je "Punten per quizvraag" halverwege het
evenement, dan verandert dat met terugwerkende kracht ook al aangevinkte
antwoorden — consistent met hoe de rest van de app werkt (alles wordt altijd
vers herberekend uit de brondata, niets wordt gecached/bevroren).

### `AppContext.jsx`

- Nieuwe state `quiz` (seed: 3 stages × 4 lege vragen), gepersisteerd via
  `useEffect`, zelfde patroon als `challenges`.
- Nieuwe functies:
  - `updateQuizQuestion(stage, index, updates)` — bewerkt tekst/opties van
    één vraag-slot.
  - `setQuizAnswer(stage, index, teamId, correct)` — zet/wist een
    correct-antwoord voor één team op één vraag, triggert meteen
    `recalculateAllPoints`.
- `addTeam()` krijgt `quiz_points: 0` (zelfde bug-patroon als recent gefixt
  bij `junioren_points` — expliciet meenemen).
- `resetScores()`:
  - reset `quiz_points` naar 0 op elk team,
  - wist alle `antwoorden`-maps in `quiz` (vraagteksten/opties blijven
    bewaard), zoals afgesproken.
- `recalculateAll()`, `setResults()` en `addBonusPenalty()` geven voortaan ook
  `quiz` en `config.quiz_points_per_question` door aan `recalculateAllPoints`.

## Scope / expliciet buiten scope

- Geen tijdslimiet of auto-hide voor quizvragen — puur handmatig getriggerd.
- Geen validatie die dwingt tot minstens 2 opties bij MC — de admin-UI staat
  1–4 ingevulde opties toe zonder foutmelding.
- Geen wijziging aan het aantal vragen per stage (altijd exact 4, niet
  configureerbaar).
- Geen aparte "Save"-knop per losse optie-input — bewerken gebeurt via het
  bestaande `FormPanel`-patroon (hele vraag in één keer opslaan).
