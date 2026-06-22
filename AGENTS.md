# EPS-TOPIK HANA PWA — Project Context

## Tech Stack
- Vanilla JS (no framework), PWA, LocalStorage-only
- Material Symbols icons, Lucide icons (legacy)
- `--hana-*` CSS variables for dual-theme (light/dark)
- Groq AI Chat (Llama model) — DO NOT change URL/key/model

## File Load Order (CRITICAL)
1. `data.js` → 2. `vocab-bank.js` → 3. `utils.js` → 4. `app.js` → 5. `quiz-engine.js` → 6. `dictation.js` → 7. `analytics.js` (last `Object.assign(app,{...})`) → 8. `story-mode.js` → 9. `mini-games.js`

## Key Constraints
- `analytics.js` is LAST Object.assign — methods there override prior bindings
- `Storage` object in `utils.js:75` — DO NOT rename or shadow
- Groq key/URL in `ai-chat.js` — NEVER alter
- `Bank` object in `data.js` has `beginner`/`normal`/`pro` with `reading`/`listening` arrays
- Marker `// 🟢 KODE BARU DIMASUKKAN DI SINI (SANGAT AMAN)` in `app.js` is safe insertion point

## HANA Design Tokens
- `--hana-primary: #5C54E8` (light) / `#8B84FF` (dark)
- `--hana-danger: #E24B4A` (both themes)
- `--hana-surface: #FFFFFF` / `#1C1B1A`
- `--hana-canvas: #F6F5F2` / `#141313`
- `--hana-border: #E4E2DE` / `#2E2C2A`
- `--hana-text-1: #19181A` / `#F0EFEC`
- `--hana-text-2`, `--hana-text-3` for secondary/muted

## Z-Index Stacking
- `#settings-overlay: 9998`
- `#settings-screen: 9999`
- `#profile-screen: 10000`
- `#modal-edit-username: 10000`
- `.modal-overlay` base: 100
- `z-[60]` modals → CSS override to 99998
- `z-[70]` modals (modal-mission, modal-date-picker): 70 — no override

## Stitch Redesign Status
### ✅ FULLY STITCH (5)
Settings, Profile, AI Chat, Help Modal, Tour Overlay

### ✅ STITCH VISUALLY (via bridge vars + CSS overrides)
Dashboard, Quiz Screen, Chapter Grid, Smart Review, Game Hub, Bookmark Hub, Quiz Path, Game Selector, Missions, Edit Username, Feedback, All Missions, Micro Quiz, Chapter Info, Confirm Exit, Tour Celebration, Match Madness, Listen & Strike, Flashcard Tinder, Flashcard Modal

### ❌ NOT YET STITCH (8)
Story Mode, Dictation, Result Screen, Date Picker Modal, Roulette, Reset Modal, Exit Quiz Modal, Sandbox (app.js)

## Key Components
- `closeSettings(callback)` — accepts optional callback after 350ms animation
- `openProfile()` / `closeProfile()` — full-screen profile panel
- `toggleHistoryDetail()` / `renderHistoryDetail()` — expandable quiz history in profile
- `renderStreakCalendar()` — animated weekly bars (analytics.js)
- `renderBadges()` — elegant grid cards (analytics.js)
- `app.data.userEmail` gates login/logout
- `app.data.quizHistory` = [{date, score}] — last 7 entries
- `Achievements` constant (utils.js:230): 7 badges with name + icon

## Safe Insertion Point
Use `// 🟢 KODE BARU DIMASUKKAN DI SINI (SANGAT AMAN)` in `app.js` for new methods
