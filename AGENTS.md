# EPS-TOPIK HANA PWA — Project Context

## Tech Stack
- Vanilla JS (no framework), PWA, LocalStorage-only
- Material Symbols icons, Lucide icons (legacy)
- `--hana-*` CSS variables for dual-theme (light/dark)
- Cerebras AI Chat (`gpt-oss-120b`) via backend proxy — DO NOT change URL/key/model
- Backend: Express + PostgreSQL (Neon) — `server/`
- PWA icons: Hana Studying (500x500 source → 192x192 + 512x512 maskable)

## File Load Order (CRITICAL)
1. `data.js` → 2. `vocab-bank.js` → 3. `utils.js` → 4. `app.js` → 5. `quiz-engine.js` → 6. `dictation.js` → 7. `analytics.js` (last `Object.assign(app,{...})`) → 8. `story-mode.js` → 9. `mini-games.js`

## Key Constraints
- `analytics.js` is LAST Object.assign — methods there override prior bindings
- `Storage` object in `utils.js:75` — DO NOT rename or shadow
- Cerebras key in `server/.env` (`CEREBRAS_KEY`) — DO NOT expose to client
- `Bank` object in `data.js` has `beginner`/`normal`/`pro` with `reading`/`listening` arrays
- Marker `// 🟢 KODE BARU DIMASUKKAN DI SINI (SANGAT AMAN)` in `app.js` is safe insertion point
- `confirmAndLogout()` in `app.js` — async modal, must await before calling `logout()`
- `_updateAllUserInfoDisplays()` — syncs nav/profile/settings name+email after login/logout
- `handleSettingsLogout()` — for inline onclick in settings (awaits confirmAndLogout internally)

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
- `z-[100000]` — AI Chat modals (login required, limit reached), logout confirm, delete account confirm

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
- `app.data.userEmail` — stores actual email from Google OAuth (synced from server)
- `app.data.userGoogleName` — stores actual name from Google OAuth (synced from server)
- `app.data.isPremium` — boolean from server sync
- `app.data.quizHistory` = [{date, score}] — last 7 entries
- `Achievements` constant (utils.js:230): 7 badges with name + icon
- `confirmAndLogout()` — reusable async modal with Batal/Ya buttons
- `deleteAccount()` — confirm modal + `DELETE /api/account` + clear storage + reload

## Server Routes
| Route | File | Auth |
|-------|------|------|
| `POST /api/chat` | `server/src/routes/chat.js` | JWT + token limit (10K/day free, unlimited premium) |
| `GET/PUT /api/sync` | `server/src/routes/sync.js` | JWT — sync progress + profile (name, avatar) |
| `DELETE /api/account` | `server/src/routes/account.js` | JWT — hapus user + cascade |
| `POST /api/feedback` | `server/src/routes/feedback.js` | Optional JWT — 3 jenis (saran/bug/dukungan) |
| `GET /api/admin/*` | `server/src/routes/admin.js` | Admin middleware — stats, users, feedback mgmt |
| `GET /api/auth/google` | `server/src/routes/auth.js` | Google OAuth redirect + callback |

## AI Chat Limit System
- Guest: blokir (401), modal "Login Diperlukan"
- Free user: 10K token/hari, hitung dari `usage.total_tokens` Cerebras
- Premium: unlimited (`is_premium` flag di DB)
- Token counter di header AI Chat (`#chat-tokens-remaining`)
- `remaining_tokens` dikembalikan di response chat

## Admin Panel Features
- Statistik (total user, XP, feedback)
- User table: search, pagination, premium toggle (optimistic UI), hapus user
- Feedback management: status (baru→dibaca→selesai), balas, auto-poll 15s, unread badge
- Toast notifications + custom confirm modals
- Cache busting di semua API request

## User Profile/Account
- Nama + avatar tersimpan di server via `syncToServer()` (field `profile: {name, avatar}`)
- Email ditampilkan di Settings ("Masuk sebagai ...") dan Profile
- Nama nav/profile: `userGoogleName` → `userName` → "Pelajar" (fallback)
- Logout: modal konfirmasi + toast + clear storage
- Hapus Akun: di Settings → Danger Zone → modal → `DELETE /api/account` → reload
- Session expiry: 401 auto-logout + toast "Sesi habis"

## Safe Insertion Point
Use `// 🟢 KODE BARU DIMASUKKAN DI SINI (SANGAT AMAN)` in `app.js` for new methods
