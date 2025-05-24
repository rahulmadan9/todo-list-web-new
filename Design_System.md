# To‑Do List App – Design System (Dark Theme)

> **Version:** 1.0 · **Last updated:** 15 May 2025
> **Scope:** Design tokens, visual language, interaction patterns, accessibility rules for a modern & contemporary UI with an easy‑to‑use UX, optimized for a dark‑first palette.

---

## 1. Principles

1. **Clarity first** – interface elements communicate purpose at a glance.
2. **Delight through subtlety** – restrained motion & micro‑interactions add polish without distraction.
3. **Effortless flow** – core tasks (add, check‑off, filter) are reachable in one gesture or ≤2 taps.
4. **Inclusive by default** – color‑contrast, keyboard paths, screen‑reader semantics meet WCAG 2.2 AA.

---

## 2. Color System (Dark Palette)

All colors are defined in **OKLCH** (P3‑safe) then exported as HEX for fallback.

| Token           | Role               | HEX       | Usage                 |
| --------------- | ------------------ | --------- | --------------------- |
| `bg/900`        | App background     | `#0E1015` | viewport, body        |
| `bg/800`        | Surface base       | `#141720` | cards, list container |
| `bg/700`        | Elevated surface   | `#1B1F29` | modals, popovers      |
| `border/600`    | Subtle stroke      | `#262B37` | divider lines         |
| `text/100`      | Primary text       | `#E5E7EB` | headings, body        |
| `text/200`      | Secondary text     | `#9CA3AF` | metadata              |
| `text/300`      | Disabled text      | `#6B7280` | placeholders          |
| `brand/500`     | **Primary accent** | `#2DD4BF` | CTA buttons, links    |
| `brand/600`     | Brand hover        | `#14B8A6` | hover, focus overlay  |
| `brand/700`     | Brand active       | `#0D9488` | pressed state         |
| `accent/amber`  | Secondary accent   | `#F59E0B` | highlights, warnings  |
| `state/success` | Success            | `#22C55E` | toast‑success         |
| `state/error`   | Error              | `#EF4444` | toast‑error           |
| `state/info`    | Info               | `#0EA5E9` | info banner           |

> **Contrast:** All text tokens maintain ≥ 4.5:1 contrast on their respective backgrounds.

### 2.1 Gradients & Overlays

```
--brand-gradient: linear-gradient(135deg,#14B8A6 0%,#2DD4BF 100%);
--overlay-60: rgba(14,16,21,.60);
```

---

## 3. Typography

| Level   | Size / Line | Weight | Letter‑spacing |
| ------- | ----------- | ------ | -------------- |
| Display | 48 / 56     | 700    | -0.5 px        |
| H1      | 32 / 40     | 600    | -0.25 px       |
| H2      | 24 / 32     | 600    | -0.2 px        |
| H3      | 20 / 28     | 500    | -0.1 px        |
| Body    | 16 / 24     | 400    | 0 px           |
| Small   | 14 / 20     | 400    | 0 px           |
| Caption | 12 / 16     | 400    | 0.1 px         |

*Font family:* `"Inter", system-ui, -apple-system, sans-serif`.

---

## 4. Spacing & Layout

* **Base unit:** 4 px.
* **Spacing scale (px):** `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 64`.
* **Radii:** `radius/sm 4 px`, `md 8 px`, `lg 12 px`, `full 999 px`.
* **Grid:** 12‑column, 72 px gutter desktop; fluid single column mobile.
* **Breakpoints:** `sm ≥ 640 px`, `md ≥ 768 px`, `lg ≥ 1024 px`, `xl ≥ 1280 px`.

---

## 5. Elevation & Shadows

| Level | Shadow                       | Usage                      |
| ----- | ---------------------------- | -------------------------- |
| 0     | none                         | base surfaces              |
| 1     | `0 1px 2px rgba(0,0,0,.32)`  | buttons, chips             |
| 2     | `0 2px 4px rgba(0,0,0,.36)`  | cards, list item hover     |
| 3     | `0 4px 12px rgba(0,0,0,.46)` | modals, popovers           |
| 4     | `0 8px 24px rgba(0,0,0,.56)` | drawers, dialog fullscreen |

> Shadows use **multiply blending** to preserve depth in dark UI.

---

## 6. Components

### 6.1 Buttons

| Variant     | BG                                   | Text       | Interaction                           |
| ----------- | ------------------------------------ | ---------- | ------------------------------------- |
| Primary     | `brand/500`                          | `text/100` | hover `brand/600`, active `brand/700` |
| Secondary   | transparent + inset `1px border/600` | `text/100` | hover adds `bg/700` │                 |
| Ghost       | transparent                          | `text/200` | hover `bg/800`                        |
| Destructive | `state/error`                        | `text/100` | hover darkens 8 %                     |

*Focus ring:* 2 px outline `brand/500` offset 2 px, visible on keyboard focus only.

### 6.2 Form Elements

* Inputs & TextArea:
  – BG `bg/800`, border `border/600`, radius `md`.
  – On focus: border `brand/500`, shadow level 1.
* Checkbox / Switch: toggle thumb `brand/500` when checked, track `border/600`.

### 6.3 Data Display

* **Card:** radius `lg`, shadow level 2, padding 24 px.
* **List Item:** min‑height 56 px, drag‑handle at 20 × 4 px dots `text/300`.
* **Badge:** height 20 px, radius `full`, color by status tokens.

### 6.4 Feedback Components

* Snackbar/Toast: stacked bottom‑center, max‑width 360 px, shadow level 3.
* Tooltip: delay 200 ms, arrow size 6 px, transition fade‑in 120 ms.
* Modal/Dialog: width min(480 px, 90vw), enters with scale 95 → 100 %, opacity 0 → 1.

---

## 7. Motion & Interaction

| Token         | Duration | Curve                     | Usage                   |
| ------------- | -------- | ------------------------- | ----------------------- |
| `anim/fast`   | 120 ms   | `cubic-bezier(.4,0,.2,1)` | fade, color hover       |
| `anim/medium` | 200 ms   | same                      | scale, slide            |
| `anim/slow`   | 400 ms   | same                      | drawers, skeleton pulse |

Gestures: swipe‑right to complete task (mobile), long‑press to reorder.

---

## 8. Iconography & Illustration

* Library: **Lucide** 1.5 px stroke, rounded joins.
* Size: 20 × 20 px inside 24 × 24 containers.
* Illustration style: minimal, flat duotone using `brand/500` & `bg/700`.

---

## 9. Accessibility Guidelines

1. **Contrast:** maintain 4.5:1 for text, 3:1 for icons.
2. **Focus order:** DOM order matches visual flow; roving tabindex in lists.
3. **Screen‑reader roles:** `role="checkbox"`, `aria-checked` state updates.
4. **Reduced motion:** respect `prefers-reduced-motion`; disable non‑essential anims.
5. **Localization:** support RTL mirroring via logical CSS (`margin‑inline‑start`).

---

## 10. Voice & Tone

* **Friendly‑professional**: "Add your first task" not "You have no tasks".
* Avoid jargon, keep sentences ≤ 20 words.
* Use sentence‑case for labels, headline‑style for page titles.

---

## 11. Implementation Tokens (CSS‑vars)

```css
:root {
  /* base */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* colors */
  --bg-900: #0E1015;
  --bg-800: #141720;
  --bg-700: #1B1F29;
  --border-600: #262B37;
  --text-100: #E5E7EB;
  --text-200: #9CA3AF;
  --brand-500: #2DD4BF;
  --brand-600: #14B8A6;
  --brand-700: #0D9488;
  --state-success: #22C55E;
  --state-error: #EF4444;
  --state-info: #0EA5E9;
}
```

---

## 12. Assets & References

* **Figma file:** *To‑Do Dark DS* (shared team drive)
* **Icon set:** Lucide JSON spritesheet
* **Type specimen:** Inter 3.19 variable fonts
* **Accessibility checklist:** WCAG 2.2 AA template

---

*End of Design System Document* 