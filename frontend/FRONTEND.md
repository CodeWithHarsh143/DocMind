# DocMind Frontend — Architecture & Conventions

Short "what changed and where" notes for future contributors. This doc focuses
on the pieces touched by the Aug 2026 visual/UX polish pass. UI is React 19 +
Vite + Tailwind v4 + `lucide-react` + `framer-motion`.

---

## 1. Theme system (Dark / Light)

- **Where the tokens live:** `src/index.css`. The root `:root { }` block contains
  the **dark** theme (the app default). A `[data-theme='light'] { }` block
  overrides the same design tokens (surfaces, borders, text, shadows, accent-soft,
  on-accent, hover fills).
- **State + persistence:** `src/context/ThemeContext.tsx` exposes
  `useTheme()` → `{ theme, toggleTheme, setTheme }`.
  - Preference is stored in `localStorage` under key `docmind:theme`
    (defaults to `dark`).
  - On every change it sets `document.documentElement.setAttribute('data-theme', …)`
    which drives the CSS variable swap. No page reload; all colors use CSS vars.
  - Wired once at the top of the app in `src/App.tsx` (`ThemeProvider` wrapping
    the router), so every page gets it automatically.
- **Toggle UI:** `src/components/ui/ThemeToggle.tsx` (sun/moon `lucide` icon).
  Mounted in:
  - `src/components/layout/TopBar.tsx` — right side, next to the "AI Online" pill.
  - `src/pages/Landing.tsx` navbar — next to the auth CTAs.
  - `src/components/auth/AuthLayout.tsx` — top-right of the login/register panel.
- **Rules for contributing:**
  - NEVER hardcode a surface/text/border color. Use the design tokens
    (`--bg-0/1`, `--surface-1/2/3`, `--text-1/2/3`, `--border*`, etc).
  - Use `var(--hover)` / `var(--hover-strong)` for hover/fill tints instead of
    raw `rgba(255,255,255,…)` (those only worked on dark and would be invisible
    in light mode). `text-[var(--bg-0)]` and `text-white` are fine because the
    accent gradient is dark-accent in both modes.
  - Brand accent stays the purple/blue `--accent-grad` in both themes — don't
    change it per theme.
- **Current gap:** preference is local-only. Cross-device sync is a separate
  backend task — see `backend/backendtasks.txt` (TASK 12/13).

---

## 2. Shared logo / brand asset (single source of truth)

- **All logo/icon-mark visuals live in `src/components/ui/Brand.tsx`:**
  - `DocGlyph` — the raw "D" SVG path (fill `var(--on-accent)`).
  - `BrandMark({ size, className })` — the gradient rounded square +
    glyph. The standalone brand square used for empty states, dropzones, etc.
  - `Logo({ markSize })` — `BrandMark` + the "DocMind" wordmark text.
- **Where it's used:** Landing navbar + footer, auth layout, sidebar, 404/500
  pages (all via `Logo`), the chat empty-state circle and the documents
  drag-and-drop icon (via `BrandMark`).
- **Rule:** if you need a brand logo square anywhere, import `BrandMark` or
  `Logo` from `Brand.tsx`. Do NOT hand-draw a new logo SVG in a page/component.
  A brand refresh only needs editing `DocGlyph` in one file.
- The browser favicon is an inline SVG data-URI in `frontend/index.html` (kept
  in sync manually with the same look).

---

## 3. Button vs link conventions

- **Actions (do something / mutate state):** use the `<Button>` component from
  `src/components/ui/Button.tsx` (variants: `primary`, `secondary`, `ghost`,
  `outline`, `danger`).
- **Navigation (go somewhere):** wrap a `<Button>` in a `react-router `<Link>`,
  or use a plain text link styled `text-[var(--accent-hi)] hover:underline`
  for inline nav.
- **File/avatar pickers:** `src/components/ui/AvatarUpload.tsx` renders the
  avatar/logo square **and** a small secondary-styled "Change picture" button,
  so every picker exposes a consistent button (not a stray text link).
  - Profile uses picker + a "Save changes" `primary` button.
  - Organization settings uses the picker (its own "Change picture" button) plus
    a separate `outline` "Save logo" — both are genuine buttons now.
- Gotchas found in the audit (Aug 2026): the old AvatarUpload "Change picture"
  caption was a plain accent-colored text label masquerading as a link — it was
  re-styled as a small secondary button for consistency with `org`/`profile`.

---

## 4. Quick file index (most touched this pass)

| Concern | Files |
| --- | --- |
| Theme tokens | `src/index.css` |
| Theme state/toggle | `src/context/ThemeContext.tsx`, `src/components/ui/ThemeToggle.tsx`, `src/App.tsx` |
| Shared logo | `src/components/ui/Brand.tsx` |
| Toggle mount points | `src/components/layout/TopBar.tsx`, `src/pages/Landing.tsx`, `src/components/auth/AuthLayout.tsx` |
| Brand mark in content | `src/components/chat/ChatEmptyState.tsx`, `src/components/documents/UploadDropzone.tsx` |
| Avatar/logo picker button | `src/components/ui/AvatarUpload.tsx` |

Verify work with `npm run build` and `npm run lint` in `frontend/`.

---

## 5. Collapsible chat history panel (Ask & Chat)

- **What / where:**
  - `src/components/chat/ChatHistoryPanel.tsx` — a slide-in panel (from the left)
    scoped to the Ask & Chat page. It is NOT a permanent second sidebar; it toggles
    over the chat area with a dimmed backdrop.
  - `src/hooks/useChatSessions.ts` — owns all session state.
  - `src/lib/chatSessions.ts` — the persistence layer (`localStorage`, keyed per
    workspace) plus `relativeTime()` and `titleFromMessage()` helpers.
  - `src/pages/Chat.tsx` — wires the hook + panel + header buttons.
- **How it's toggled:** a **History** button in the Chat page header opens/closes the
  panel; the **+ New Chat** button above the messages clears the view to the
  empty-state (suggestion cards). The panel closes on: outside click, selecting a
  session, toggling the button again, or starting a new chat.
- **Workspace scoping:** sessions are stored under `docmind:chat:sessions:{orgId}` and
  the hook resets + reloads whenever the active workspace changes — messages never
  mix across workspaces.
- **Session row:** auto title (first ~40 chars of the first user message), relative
  timestamp, active highlight, delete-on-hover with `ConfirmDialog`.
- **Restore on refresh:** the most recently updated session for the workspace is
  restored as active on load.
- **Streaming integration:** a session is created/updated the first time you send a
  message; a running stream updates the assistant message in place via
  `updateAssistantMessage`. Streaming state is a single global flag (one active
  stream at a time).
- **Moving to real backend:** replace the localStorage calls in `chatSessions.ts`
  with the API tasks in `backend/backendtasks.txt` (TASK 14–18).

---

## 6. Shared Button — variants & theme-token usage

- **Component:** `src/components/ui/Button.tsx`. Variants:
  - `primary` — accent gradient business (the main CTA; keeps accent in both themes).
  - `secondary` — neutral surface (`--surface-2`) for secondary page actions.
  - `ghost` — text-only, subtle hover (`--hover`).
  - `outline` — border + transparent bg; hover uses `--accent-soft` bg + accent text
    (theme-safe — it no longer turns text white on hover, which broke light mode).
  - `danger` — destructive.
- **Theme safety rules for buttons:**
  - Backgrounds/borders/text must come from design tokens, never a fixed hex that
    only reads in one mode. This is why `outline` `hover:text-white` was removed.
  - Exceptions: buttons on the accent gradient keep `text-white` (the gradient is
    mid-brightness in both modes), and third-party brand buttons may hardcode their
    brand colors **for that button only**.
- **"Continue with Google"** (`src/components/auth/GoogleButton.tsx`): intentionally
  hardcodes `background:#fff`, dark text, and a full-color "G" via inline style so it
  never inherits theme text color (which could go white-on-white in dark mode).
- **Icon/spacing convention:** every icon+text button uses `gap-2` (set on the Button
  base class). Avoid per-call `gap-*` overrides unless the brand demands otherwise.
- **Type of action → component:**
  - Mutating action → `<Button>` (with a variant).
  - Navigation → wrap a `<Button>` in `<Link>`, or use an inline accent text link for
    secondary inline nav.

---

## 7. Premium polish patterns (Part 3)

- **Toasts / snackbars:** `src/context/ToastContext.tsx` + `useToast()` provides
  `success` / `error` / `info`. Positioned bottom-right via the `.toast-region` rule
  in `src/index.css`, auto-dismiss ~3.2s. Use it for async confirmations ("Member
  invited", "Organization updated", "Conversation deleted").
- **Loading skeletons:** `SkeletonRows` in `src/components/ui/Feedback.tsx` (grey
  shimmer blocks). Prefer it over bare spinners for list/card surfaces — already used
  on Documents (document cards), Members (roster), and the Chat history panel.
- **Empty states:** `EmptyState` in `src/components/ui/Feedback.tsx` — icon + title +
  one helpful line + optional action. Icons are real (lucide / `BrandMark`), never
  blank boxes.
- **Micro-interactions:** interactive rows/buttons use a `transition-all duration-150`
  (snappy, not sluggish) with hover bg/scale + active translate. Example: session
  rows in the history panel.
- **Page transitions:** `src/components/layout/AppLayout.tsx` fades (+6px) the main
  `<Outlet>` on route change (`key={location.pathname}`, ~150ms).
- **Focus states:** global `:focus-visible` ring in `index.css` + `Button` has its own
  `focus-visible` outline — keyboard users always see where they are.
- **Radii & shadows:** use the design tokens (`--radius-*`, `--shadow-*`, `--glow-accent`)
  so cards/buttons/modals stay on one consistent scale rather than mixing literals.

---

## 8. Quick file index (this pass)

| Concern | Files |
| --- | --- |
| History panel + state | `src/components/chat/ChatHistoryPanel.tsx`, `src/hooks/useChatSessions.ts`, `src/lib/chatSessions.ts`, `src/pages/Chat.tsx` |
| Button theme fixes | `src/components/ui/Button.tsx`, `src/components/auth/GoogleButton.tsx` |
| Page transition | `src/components/layout/AppLayout.tsx` |
| Toasts bottom-right + 3s | `src/context/ToastContext.tsx`, `src/index.css` |

Verify work with `npm run build` and `npm run lint` in `frontend/`.
