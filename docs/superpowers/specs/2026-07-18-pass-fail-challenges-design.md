# Geslaagd/Niet Geslaagd Challenges — Design Spec

Datum: 2026-07-18
Status: Approved (design), niet geïmplementeerd

## Doel

Naast de bestaande klassement-modus (alle teams onderling gerangschikt, 1e
plaats krijgt de meeste punten) moet een challenge ook ingesteld kunnen
worden als **geslaagd/niet geslaagd**: teams die de opdracht niet volbrengen
krijgen altijd 0 punten, ongeacht wat andere teams doen (bv. "10 keer
springen"). Teams die wél slagen worden onderling gerangschikt volgens
dezelfde aflopende puntentabel als vandaag, maar toegepast op enkel de
geslaagde teams.

## Context: bestaand datamodel en berekening

- `challenges` (localStorage `tdf_challenges`) is een platte array. Elke
  challenge heeft o.a. `stage_number`, `type`, `power_stage`, `completed`,
  en `results: { team_id, positie, punten, spelers }[]`.
- Resultaten worden ingevoerd in `Admin.jsx` → `ResultsTab`: de admin
  rangschikt alle teams van 1e naar laatste via ↑↓-knoppen (`order` state
  = array van team-ids) en duidt per team aan welke spelers de opdracht
  uitvoerden (`playerSelections`). Opslaan roept `setResults(challengeId,
  orderedTeamIds, playerSelections)` aan in `AppContext.jsx`.
- `setResults` berekent per team `punten = power_stage ? (totalTeams-1-index)*2
  : totalTeams-1-index` (nooit negatief) op basis van de 0-based `index` in
  `orderedTeamIds`, en slaat `positie = index+1` op.
- `utils/points.js` heeft een equivalente losstaande `calcResultPoints(index,
  totalTeams, isPowerStage)` — vandaag ongebruikt door `setResults` (dat
  rekent inline hetzelfde uit), maar bevestigt dat de formule al
  "index-based, totalTeams = alle teams" is.
- `ChallengeCard.jsx` (publieke Stage-pagina) toont voltooide resultaten in
  een tabel, gesorteerd op `positie` oplopend, met kolommen #, Team, Pts.
- `recalculateAllPoints` in `utils/points.js` telt voor elk team gewoon
  `result.punten` op over alle voltooide challenges — deze functie heeft
  **geen wijziging nodig**, zolang niet-geslaagde teams een `punten: 0`
  result-record hebben.

## 1. Datamodel

### Challenge

Nieuw veld:
```js
result_mode: 'ranking' | 'pass_fail'   // default 'ranking'
```

- Bestaande challenges in localStorage hebben dit veld niet. Overal waar
  `result_mode` gelezen wordt, gebeurt dat via `challenge.result_mode ??
  'ranking'` — geen migratiestap nodig, geen breaking change.
- `addChallenge` in `AppContext.jsx` heeft geen aanpassing nodig: het veld
  komt gewoon mee via de gespreide `challenge`-form (zie sectie 2).

### Result-record

Nieuw optioneel veld op elk item in `challenge.results`:
```js
{ team_id, positie, punten, spelers, geslaagd }
```

- `geslaagd: boolean` — enkel gezet/gebruikt bij `result_mode === 'pass_fail'`.
  Bij `ranking`-challenges blijft dit veld afwezig (net als vandaag).
- **Geslaagde teams**: `positie` = hun rang binnen de geslaagd-groep (1-based,
  net als vandaag), `punten` = dezelfde formule als klassement-modus, met
  `index` = 0-based positie binnen de geslaagd-groep en `totalTeams` =
  **alle** teams in het event (niet enkel de geslaagde) — zo krijgt de 1e
  geslaagde altijd de punten van "1e plaats" over alle teams, ongeacht hoeveel
  teams slaagden. Dit is exact wat de gebruiker bevestigde: bij 2 van de 4
  geslaagde teams krijgt de 1e daarvan 1e-plaats-punten, niet 3e-plaats-punten.
- **Niet-geslaagde teams**: `punten = 0`, `geslaagd = false`, `positie` loopt
  gewoon door na de laatste geslaagde positie (bv. 2 geslaagd + 2 niet
  geslaagd → posities 3 en 4). Dit is puur zodat de bestaande sorteer-op-
  `positie`-logica in `ChallengeCard` ongewijzigd blijft werken (geslaagde
  teams komen vanzelf eerst).
- `spelers` (wie voerde de opdracht uit) blijft voor **alle** teams in **beide**
  modi beschikbaar — ook niet-geslaagde teams, want er werd nog steeds
  geprobeerd.

## 2. Admin → Challenge aanmaken/bewerken (`ChallengesTab`)

Het challenge-formulier krijgt een vierde veld naast Stage/Type/Power Stage:
**Resultaat-modus**, als 2-knoppen-toggle in dezelfde stijl als de bestaande
Power Stage AAN/UIT-toggle:

- `🏆 Klassement` (default, huidig gedrag)
- `✅ Geslaagd/Niet geslaagd`

Form-state (`form.result_mode`) start op `'ranking'` bij "Nieuwe Challenge",
en op `c.result_mode ?? 'ranking'` bij bewerken van een bestaande challenge.
Opslaan (`addChallenge`/`updateChallenge`) verandert niet — het veld gaat
gewoon mee via de gespreide form-object zoals `power_stage` vandaag al doet.

## 3. Admin → Resultaten invoeren (`ResultsTab`)

`ResultsTab` splitst zijn gedrag op basis van `challenge.result_mode`.

### Ranking-modus (bestaand gedrag, ongewijzigd)

Precies zoals vandaag: één lijst, alle teams, ↑↓ om te herschikken.

### Pass/fail-modus (nieuw)

Twee secties in plaats van één lijst:

- **"✅ Geslaagd"** (bovenaan): dezelfde rangschik-UI (kaart per team, ↑↓
  om te herschikken, "Wie deed de opdracht?"-spelerselectie) als de
  bestaande ranking-lijst, plus een extra knop per team: **"Zet als niet
  geslaagd"** → verplaatst het team naar de andere sectie.
- **"❌ Niet geslaagd"** (onderaan): platte lijst zonder ↑↓ (geen ranking
  nodig), toont altijd "0 pts", behoudt wel de "Wie deed de opdracht?"-
  spelerselectie, plus een knop per team: **"Zet als geslaagd"** →
  verplaatst het team naar het einde van de Geslaagd-lijst.

**State**: `passedOrder` (array van team-ids, rang-volgorde) en `failedIds`
(array van team-ids, geen volgorde relevant) vervangen de enkele `order`
state wanneer `result_mode === 'pass_fail'`. `playerSelections` blijft
ongewijzigd, gescoped per team-id, ongeacht sectie.

**Initialisatie bij het selecteren van een challenge:**
- Heeft de challenge al `results` (met `geslaagd`-veld): partitioneer op
  basis daarvan, `passedOrder` gesorteerd op `positie`.
- Anders (nieuwe pass/fail-challenge): alle teams starten in "Geslaagd", in
  team-volgorde (`teams.map(t => t.id)`) — spiegelt het bestaande default-
  gedrag van de ranking-modus. De admin duwt vervolgens de teams die niet
  slaagden naar de andere sectie.

**Opslaan**: `setResults` in `AppContext.jsx` krijgt een nieuw, optioneel
4e argument:
```js
setResults(challengeId, orderedTeamIds, playerSelections, failedTeamIds = [])
```
- Ranking-modus roept dit ongewijzigd aan (`failedTeamIds` blijft `[]`,
  `orderedTeamIds` = alle teams zoals vandaag) — puntenberekening en
  result-shape 100% ongewijzigd, geen `geslaagd`-veld.
- Pass/fail-modus roept aan met `orderedTeamIds = passedOrder` en
  `failedTeamIds = failedIds`. Intern bouwt `setResults` de `results`-array
  op als: eerst de geslaagde teams (positie/punten zoals vandaag +
  `geslaagd: true`), dan de niet-geslaagde teams (positie loopt door,
  `punten: 0`, `geslaagd: false`).

## 4. Publieke weergave (`ChallengeCard.jsx`)

Eén tabel, gesorteerd op `positie` (ongewijzigde sorteerlogica, werkt
automatisch correct danks de doorlopende `positie`-toekenning uit sectie 1).

- Voor challenges met `result_mode !== 'pass_fail'`: exact het huidige
  uiterlijk (volgnummer in de #-kolom).
- Voor `result_mode === 'pass_fail'`: per rij, als `result.geslaagd ===
  false`, toon `❌` in de #-kolom in plaats van het volgnummer, en een
  gedempt label "(niet geslaagd)" naast de teamnaam. Punten-kolom toont
  gewoon `0` (geen aparte styling nodig, `result.punten` is al 0).

## Scope / expliciet buiten scope

- Geen wijziging aan `recalculateAllPoints` — die telt gewoon `result.punten`
  op, en niet-geslaagde teams hebben altijd `punten: 0`.
- Geen wijziging aan `Rankings.jsx`, `Live.jsx`, `Stage.jsx`, `utils/mvp.js`
  — geen van deze leest `result.positie`/`result.punten` rechtstreeks op een
  manier die door `geslaagd` beïnvloed wordt; ze gebruiken team-totalen of
  spelerselecties die ongewijzigd blijven.
- Geen bulk-toggle ("zet alle teams als geslaagd") — enkel per-team knoppen,
  consistent met de rest van de admin-UI.
- Geen wijziging aan bestaande, al opgeslagen ranking-challenges — die
  blijven zonder `result_mode`/`geslaagd`-velden werken zoals vandaag.
