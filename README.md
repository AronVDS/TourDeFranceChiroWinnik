# 🚴 Tour de France – Chiro Edition

<div align="center">

```
████████╗ ██████╗ ███████╗     ██████╗██╗  ██╗██╗██████╗  ██████╗
╚══██╔══╝██╔══██╗██╔════╝    ██╔════╝██║  ██║██║██╔══██╗██╔═══██╗
   ██║   ██║  ██║█████╗      ██║     ███████║██║██████╔╝██║   ██║
   ██║   ██║  ██║██╔══╝      ██║     ██╔══██║██║██╔══██╗██║   ██║
   ██║   ██████╔╝██║         ╚██████╗██║  ██║██║██║  ██║╚██████╔╝
   ╚═╝   ╚═════╝ ╚═╝          ╚═════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝
```

**Scoreboard & evenementbeheer voor het ultieme Chiro TDF-evenement**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📸 Screenshots

> _Screenshots volgen zodra het evenement live gaat._

| Home | Rankings | Strafwiel |
|------|----------|-----------|
| ![Home](https://placehold.co/300x180/0f172a/facc15?text=Home) | ![Rankings](https://placehold.co/300x180/0f172a/facc15?text=Rankings) | ![Strafwiel](https://placehold.co/300x180/0f172a/facc15?text=Strafwiel) |

---

## ✨ Features

- 🏆 **Live scorebord** met real-time updates per team
- 🚴 **Race track visualisatie** — zie de teams rijden op de parcours
- 👑 **MVP speler tracking** — automatische MVP-berekening per ploeg
- 🎯 **Challenge & punten systeem** — stages met unieke uitdagingen
- 🎡 **Strafwiel met animaties** — draai het wiel bij verlies
- ⏱️ **Timer overlay** voor pauzes en countdowns
- 📱 **Mobile + Desktop responsive** — werkt op elk scherm
- 🔐 **Beveiligd admin paneel** — puntenbeheer afgeschermd

---

## 🛠️ Tech Stack

| Technologie | Versie | Gebruik |
|-------------|--------|---------|
| [React](https://react.dev) | 19 | UI framework |
| [Vite](https://vite.dev) | 8 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Styling |
| [Framer Motion](https://www.framer.com/motion) | 12 | Animaties |
| [Lucide React](https://lucide.dev) | latest | Iconen |
| [React Router](https://reactrouter.com) | 7 | Client-side routing |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | latest | Confetti-effecten |

> **Data:** alles wordt opgeslagen in `localStorage` — geen backend nodig.

---

## 🚀 Getting Started

### Vereisten

- [Node.js](https://nodejs.org) v18 of hoger
- npm v9 of hoger

### Installatie

```bash
# 1. Clone de repository
git clone https://github.com/AronVDS/tdf-chiro.git
cd tdf-chiro

# 2. Installeer dependencies
npm install

# 3. Start de dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in je browser.

### Build voor productie

```bash
npm run build
npm run preview
```

---

## 📁 Project Structuur

```
tdf-chiro/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   ├── ChallengeCard.jsx   # Kaart voor een uitdaging
│   │   ├── ErrorBoundary.jsx   # Error handling wrapper
│   │   ├── Navbar.jsx          # Navigatiebalk
│   │   ├── RaceTrack.jsx       # Race track visualisatie
│   │   ├── SpinWheel.jsx       # Strafwiel component
│   │   └── TeamCard.jsx        # Team overzichtskaart
│   ├── context/
│   │   └── AppContext.jsx      # Globale state (teams, scores, config)
│   ├── pages/
│   │   ├── Admin.jsx           # Beheerdersdashboard
│   │   ├── Home.jsx            # Startpagina
│   │   ├── Live.jsx            # Live scorebord view
│   │   ├── Rankings.jsx        # Rangschikking
│   │   ├── Stage.jsx           # Stage detail pagina
│   │   ├── Strafwiel.jsx       # Strafwiel pagina
│   │   └── Teams.jsx           # Teams overzicht
│   ├── utils/
│   │   ├── influence.js        # Invloed-berekeningen
│   │   ├── mvp.js              # MVP-algoritme
│   │   └── points.js           # Puntensysteem logica
│   ├── App.jsx                 # Root component & routing
│   ├── index.css               # Tailwind + design tokens
│   └── main.jsx                # React entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 📄 License

Dit project valt onder de [MIT License](LICENSE).

---

<div align="center">
Gemaakt met ❤️ voor Chiro &nbsp;•&nbsp; <a href="https://github.com/AronVDS">AronVDS</a>
</div>
