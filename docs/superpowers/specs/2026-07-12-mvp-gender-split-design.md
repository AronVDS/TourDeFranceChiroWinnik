# MVP Gender Split — Design Spec

Datum: 2026-07-12
Status: Approved (design), niet geïmplementeerd

## Doel

Voor de medailleceremonie op het einde van het 3-daagse evenement moet er,
naast de bestaande gecombineerde MVP-ranglijst, ook een aparte "MVP Jongen"
en "MVP Meisje" ranglijst zijn — voor alle spelers (leiding + aspis), niet
enkel aspis.

## Context: bestaand datamodel

Spelers hebben in deze app **geen eigen ID** — overal (Teams-tab,
resultaten-invoer in `ResultsTab`, MVP-berekening in `utils/mvp.js`,
`TeamCard`) wordt een speler geïdentificeerd via zijn naam-string, gescoped
per team (`team.leden.leiding: string[]`, `team.leden.aspis: string[]`).
Challenge-resultaten (`result.spelers`) verwijzen ook naar namen, niet naar
IDs. Naam is dus de facto de unieke sleutel binnen een team, in de hele
bestaande codebase.

## 1. Datamodel

`team.leden` krijgt een derde veld naast de bestaande `leiding`/`aspis`
string-arrays (die **ongewijzigd blijven**):

```js
leden: {
  leiding: ['Aron', 'Lena'],
  aspis: ['Bram', 'Jonas'],
  geslacht: { 'Aron': 'jongen', 'Lena': 'meisje', 'Bram': 'jongen' }
  // 'Jonas' ontbreekt hier bewust → status "niet ingesteld"
}
```

- `geslacht` is een lookup-map `naam → 'jongen' | 'meisje'`. Ontbreekt een
  naam als key (of ontbreekt `geslacht` volledig), dan is de status
  **"niet ingesteld"** — expliciet, geen silent default naar een van beide
  waarden.
- **Architectuurkeuze (bevestigd door gebruiker):** een parallelle
  lookup-map naast de bestaande naam-arrays, in plaats van de arrays zelf
  te herstructureren naar objecten (`{ naam, geslacht }[]`). Dit raakt geen
  van de bestaande plekken die vandaag `.includes(naam)`,
  `.map(naam => ...)`, `.filter(n => n !== naam)` doen op `leiding`/`aspis`
  (resultaten-invoer, MVP-utils, `TeamCard`, Live-scherm) — enkel de nieuwe
  gender-gefilterde MVP-weergave en de Teams-tab-badges doen een lookup in
  deze map.

### Migratie

`migrateLeden()` — bestaat al in `AppContext.jsx` én gedupliceerd in
`Live.jsx` (beide normaliseren oude flat-array `leden`-data naar
`{ leiding: [], aspis: [] }`) — krijgt er een `geslacht: leden.geslacht ?? {}`
fallback bij, in beide bestanden. Dit is exact hetzelfde defensieve patroon
als de bestaande `leiding`/`aspis`-fallback: geen crash op ontbrekende data,
geen silent default-waarde die tellingen zou vervalsen. Bestaande spelers
(gemigreerd van vóór deze feature) hebben simpelweg geen entry in
`geslacht` → "niet ingesteld" totdat iemand het invult.

### MVP-berekening

`utils/mvp.js`'s `berekenSpelerStats(speler, team, challenges)` krijgt een
extra veld in zijn return-object:
```js
geslacht: team.leden?.geslacht?.[speler] ?? null   // null = niet ingesteld
```
Dit geldt voor zowel `berekenAllSpelerStats` (gebruikt op `/live` en straks
ook voor de nieuwe gender-lijsten) als `berekenJuniorenStats`.

## 2. Teams-tab UI

### Nieuwe speler toevoegen (leiding of aspi)

Naast het bestaande naam-invoerveld komt een geslacht-toggle
(bv. "🧑 Jongen" / "👧 Meisje") die **bij openen van het formulier in geen
van beide standen staat** — geen voorgeselecteerde default. De
toevoeg-knop (`+`) blijft uitgeschakeld totdat zowel naam als geslacht zijn
ingevuld. Dit geldt voor **leiding én aspis**, identieke flow.

### Bestaande speler-pills (leiding/aspis-lijst)

**Correctie tijdens spec-review:** de klikbare, bewerkbare badge hoort
enkel thuis in het admin-beveiligde bewerkformulier van `TeamsTab`
(`/admin`, wachtwoord-beveiligd) — niet op `TeamCard` (`/teams`, publiek
zichtbaar zonder login). Alle andere roster-mutaties (leden toevoegen/
verwijderen) gebeuren vandaag al uitsluitend via `/admin`; een klikbaar,
voor iedereen bewerkbaar badge op de publieke Teams-pagina zou daarmee
inconsistent zijn en een ongewenste, niet-beveiligde schrijfmogelijkheid
introduceren.

- **In `TeamsTab` (`/admin`, bewerkformulier):** elke speler-pill krijgt een
  klikbaar geslacht-badge vóór de naam:
  - `🧑` = jongen
  - `👧` = meisje
  - `❓` = niet ingesteld — visueel duidelijk anders (bv. gele/gedempte
    accentkleur) zodat het opvalt als attentiepunt

  Klikken op het badge opent een klein inline toggle-menu (2 knoppen) om
  het geslacht in te stellen of te wijzigen, zonder de speler te moeten
  verwijderen en opnieuw toe te voegen. Dit is de enige manier om
  bestaande (gemigreerde) spelers alsnog in te vullen.

- **Op `TeamCard` (`/teams`, publiek):** hetzelfde badge-icoon (`🧑`/`👧`/`❓`)
  wordt getoond ter informatie, maar **niet-klikbaar** (puur visueel, geen
  interactie).

## 3. Rankings-pagina UI

**Nieuw tabblad "MVP"** in `Rankings.jsx`, naast de bestaande
Algemeen/Berg/Sprint/Junioren tabs. Layout: 2 kolommen naast elkaar op
desktop, onder elkaar op mobiel.

- **"Top MVP Jongens"** en **"Top MVP Meisjes"**: beide gebaseerd op
  `berekenAllSpelerStats(teams, challenges)` — dezelfde berekening als de
  bestaande gecombineerde MVP-lijst op `/live` (alle voltooide challenges,
  leiding + aspis samen) — elk gefilterd op `geslacht === 'jongen'` resp.
  `'meisje'`. Top 8 per lijst (zelfde aantal als de bestaande
  junioren-sublijst in de Junioren-tab).
- **Waarschuwingsbanner bovenaan de MVP-tab**: als er (over alle teams
  heen, leiding + aspis) spelers zijn met geslacht = "niet ingesteld",
  toon een banner, bv. "⚠️ N spelers nog niet ingesteld — vul in via de
  Teams-tab". Geen banner zichtbaar als iedereen is ingesteld.
- Spelers met "niet ingesteld" geslacht verschijnen in **geen van beide**
  ranglijsten (voorkomt vervalste tellingen) — enkel zichtbaar via de
  banner-telling.

### `/live` blijft ongewijzigd

De bestaande gecombineerde top-5 MVP-lijst op het TV-scherm (`/live`,
`berekenAllSpelerStats(...).slice(0, 5)` in `Live.jsx`) wordt **niet**
aangepast — expliciet buiten scope, zoals gevraagd.

## Scope / expliciet buiten scope

- Geen wijziging aan de bestaande `leiding`/`aspis` string-arrays of aan
  hoe spelers geïdentificeerd worden (blijft naam-gebaseerd).
- Geen aanpassing aan `/live`.
- Geen derde geslacht-optie of vrije tekstinvoer — enkel "jongen"/"meisje"/
  "niet ingesteld" (impliciet via ontbrekende data).
- Geen bulk-invulactie ("vul alles in") — enkel per-speler badge-klik.
