# DevDocs AI — Stitch Design System Export

> **Design system:** Stitch (Vellum Academic Journal)
> **Framework:** Next.js 14 + Tailwind CSS 3.4 + shadcn/ui
> **Generated:** 2026-07-24

---

## 1. Design Philosophy

Stitch is a warm, academic-inspired design system built on a vellum/parchment palette. It pairs a serif display typeface (Lora) with a clean sans-serif body font (Inter) to convey thoughtfulness and clarity. The system avoids harsh contrasts in favor of muted, earthy tones — ink blacks, dusty grays, and a single terra-cotta accent for warmth.

---

## 2. Color Palette

### Core Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `ink-black` | `#141413` | Primary text, dark backgrounds, primary buttons |
| `onyx` | `#1f1e1d` | Deep accent, secondary dark |
| `graphite` | `#3d3d3a` | Hover state for primary buttons |
| `dusty-gray` | `#73726c` | Muted/secondary text |
| `stone` | `#9c9a92` | Placeholder text, tertiary text, disabled |
| `parchment` | `#dedcd1` | Borders, dividers, separators |
| `vellum-white` | `#faf9f5` | Card/panel backgrounds |
| `snow-white` | `#ffffff` | Input backgrounds, pure white |
| `pale-azure` | `#ccdbe8` | Cool accent (informational) |
| `terra-cotta` | `#d97757` | Warm accent, CTAs, active indicators |

### Surface System (Material Design 3 Inspired)

| Token | Hex | Usage |
|-------|-----|-------|
| `surface` | `#fdf8f7` | Page background |
| `surface-dim` | `#ddd9d8` | Dimmed surface |
| `surface-bright` | `#fdf8f7` | Elevated surfaces |
| `surface-container-lowest` | `#ffffff` | Deepest container layer |
| `surface-container-low` | `#f7f3f2` | Hover backgrounds, secondary surfaces |
| `surface-container` | `#f1edec` | Active nav items, progress bars |
| `surface-container-high` | `#ebe7e6` | Badge backgrounds, avatar fallbacks |
| `surface-container-highest` | `#e5e2e1` | Highest elevation container |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#000000` | Primary actions |
| `on-primary` | `#ffffff` | Text on primary |
| `secondary` | `#99462a` | Secondary brand (burnt orange) |
| `secondary-container` | `#fe9572` | Secondary accent container |
| `error` | `#ba1a1a` | Error states |
| `error-container` | `#ffdad6` | Error background |
| `outline` | `#767872` | Focus rings, active borders |
| `outline-variant` | `#c7c7c0` | Subtle outlines |

### CSS Custom Properties (Landing Page)

```css
:root {
  --vellum: #faf9f5;
  --vellum-dim: #f1edec;
  --ink: #141413;
  --onyx: #1f1e1d;
  --graphite: #3d3d3a;
  --dusty: #73726c;
  --stone: #9c9a92;
  --parchment: #dedcd1;
  --snow: #ffffff;
  --azure: #ccdbe8;
  --terra: #d97757;
  --terra-light: #f5e8e2;
}
```

---

## 3. Typography

### Font Families

| Role | Family | Stack | CSS Variable |
|------|--------|-------|--------------|
| Display / Headings | Lora | `Lora, serif` | `--font-stitch-lora` |
| Body / UI | Inter | `Inter, sans-serif` | `--font-stitch-inter` |
| Code | JetBrains Mono | `JetBrains Mono, monospace` | `--font-jetbrains-mono` |

### Type Scale

| Token | Size | Line Height | Weight | Family | Tailwind Class |
|-------|------|-------------|--------|--------|----------------|
| `display` | 56px | 1.2 | 330 | Lora | `text-stitch-display font-stitch-display` |
| `h2` | 30px | 1.33 | 400 | Lora | `text-stitch-h2 font-stitch-h2` |
| `h3` | 24px | 1.33 | 400 | Lora | `text-stitch-h3 font-stitch-h3` |
| `h4` | 18px | 1.33 | 400 | Lora | `text-stitch-h4 font-stitch-h4` |
| `body-lg` | 16px | 1.5 | 400 | Inter | `text-stitch-body-lg font-stitch-body-lg` |
| `body-md` | 15px | 1.4 | 400 | Inter | `text-stitch-body-md font-stitch-body-md` |
| `body-sm` | 14px | 1.4 | 400 | Inter | `text-stitch-body-sm font-stitch-body-sm` |
| `caption` | 12px | 1.33 | 400 | Inter | `text-stitch-caption font-stitch-caption` |
| `label-caps` | 11px | 1.33 | 500 | Inter | `text-stitch-label-caps font-stitch-label-caps` |

**Note:** `label-caps` also uses `letter-spacing: 0.05em` and is always rendered uppercase.

### Usage Conventions

- **Headings:** Always use Lora serif (`font-stitch-serif`)
- **Body/UI:** Always use Inter sans-serif (`font-stitch-sans`)
- **Display text:** Extra-light weight (330) for large, elegant headings
- **Labels/Caps:** 11px uppercase with letter-spacing for section labels and badges

---

## 4. Spacing

### Spacing Tokens

| Token | Value | Tailwind Prefix | Usage |
|-------|-------|-----------------|-------|
| `unit` | 8px | `stitch-unit` | Base unit, smallest gaps, internal padding |
| `gap-xs` | 8px | `stitch-gap-xs` | Small gaps (same as unit) |
| `gap-md` | 24px | `stitch-gap-md` | Standard component padding, section gaps |
| `gap-lg` | 32px | `stitch-gap-lg` | Larger gaps, nav padding |
| `section-xl` | 40px | `stitch-section-xl` | Section-level vertical padding |
| `container-max` | 1200px | `max-w-stitch-container-max` | Maximum content width |

### Usage Examples

```html
<!-- Component padding -->
<div class="p-stitch-gap-md">...</div>

<!-- Gap between items -->
<div class="flex gap-stitch-unit">...</div>

<!-- Section padding -->
<section class="py-stitch-section-xl">...</section>

<!-- Container -->
<div class="max-w-stitch-container-max mx-auto px-stitch-gap-lg">...</div>
```

---

## 5. Border Radius

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| `DEFAULT` | 4px (0.25rem) | `rounded-stitch-DEFAULT` | Buttons, cards, general elements |
| `lg` | 8px (0.5rem) | `rounded-stitch-lg` | Larger elements, modals |
| `xl` | 12px (0.75rem) | `rounded-stitch-xl` | Panels, overlays |
| `full` | 9999px | `rounded-stitch-full` | Pills, badges, avatars |
| `input` | 9.6px | `rounded-stitch-input` | Inputs, textareas, selects |

### CSS Custom Properties (Landing)

```css
:root {
  --r: 9.6px;       /* Base radius (inputs, small cards) */
  --r-lg: 16px;     /* Medium cards */
  --r-hero: 24px;   /* Hero elements, large cards */
}
```

---

## 6. Shadows

Minimal shadow usage. The system relies on borders and surface color hierarchy instead of elevation shadows.

| Context | Value |
|---------|-------|
| Toast notifications | Tailwind `shadow-lg` |
| Cards | No shadow (border-based elevation) |
| Modals | No shadow defined |

---

## 7. Icons

**System:** Google Material Symbols (Outlined)
**CDN:** Loaded in root layout via Google Fonts
**Default settings:** `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`

### Icon Sizes

| Size | Pixel | Class |
|------|-------|-------|
| `sm` | 16px | `text-[16px]` |
| `md` | 20px | `text-[20px]` |
| `lg` | 24px | `text-[24px]` |
| `xl` | 32px | `text-[32px]` |

### Icon States

- **Default:** Outlined (`FILL 0`)
- **Active/Selected:** Filled (`FILL 1`) via `fontVariationSettings: "'FILL' 1"`

### Common Icons Used

| Purpose | Icon Name |
|---------|-----------|
| Dashboard | `dashboard` |
| Settings | `settings` |
| API Keys | `vpn_key` |
| Drafts | `description` |
| Review | `rate_review` |
| Add/New | `add` |
| Send | `send` |
| User | `person` |
| AI/Assistant | `psychology` |
| More | `more_horiz` |
| Check | `check_circle` |
| Pending | `radio_button_unchecked` |
| Loading | `progress_activity` (with `animate-spin`) |

---

## 8. Animation & Motion

### Keyframes

```css
@keyframes stitch-fadeIn {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

@keyframes stitch-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### Animation Classes

| Class | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `.animate-fadeIn` | 100ms | ease-out | Content appearing |
| `.animate-blink` | 500ms | ease-in-out (infinite) | Streaming cursor |
| `.animate-spin` | — | — | Loading spinners |

### Transition Defaults

| Context | Duration | Property |
|---------|----------|----------|
| Color changes | 200ms | `transition-colors` |
| Card hover | 300ms | `transition-colors` |
| Nav items | 200ms | `transition-all` |
| Focus rings | instant | — |

---

## 9. Component Library

### Architecture: Atomic Design

```
components/stitch/
  atoms/        → Primitive UI elements
  molecules/    → Composed multi-atom patterns
  organisms/    → Full page sections
```

### Atoms

#### Button

| Prop | Values | Default |
|------|--------|---------|
| `variant` | `primary`, `secondary`, `ghost`, `danger` | `primary` |
| `size` | `sm`, `md`, `lg` | `md` |
| `icon` | Material Symbol name | — |
| `iconPosition` | `left`, `right` | `left` |
| `loading` | boolean | `false` |

**Variant Styles:**

| Variant | Background | Border | Text | Hover |
|---------|-----------|--------|------|-------|
| `primary` | ink-black | — | snow-white | graphite bg |
| `secondary` | transparent | parchment | ink-black | surface-container-low bg |
| `ghost` | transparent | — | ink-black | surface-container-low bg |
| `danger` | transparent | terra-cotta | terra-cotta | error-container/20 bg |

**Size Styles:**

| Size | Padding | Text |
|------|---------|------|
| `sm` | `px-4 py-2` | body-sm |
| `md` | `px-6 py-3` | body-md |
| `lg` | `px-8 py-4` | body-lg |

#### Input

| Prop | Type | Default |
|------|------|---------|
| `icon` | Material Symbol name | — |
| `error` | boolean | `false` |

**States:**
- Default: white bg, parchment border, 9.6px radius
- Focus: outline border + ring-1
- Error: red border
- Placeholder: stone color

#### Badge

| Variant | Style |
|---------|-------|
| `default` | surface-container-high bg, parchment border |
| `in-progress` | terra-cotta dot + text |
| `complete` | outline-color dot + ink text |
| `archived` | stone dot + stone text |

#### Avatar

| Size | Dimensions |
|------|-----------|
| `sm` | 32 x 32px |
| `md` | 40 x 40px |
| `lg` | 48 x 48px |

- Circular with parchment border
- Fallback: initials (2 chars) or Material Symbol icon
- Surface-container-high background for fallback

#### Icon

Wraps Google Material Symbols with size and fill control.

#### Toggle

- Track: 44x24px, parchment bg (off), ink-black bg (on)
- Thumb: 20x20px white circle
- Disabled: 50% opacity

#### Skeleton

Loading placeholder with animation. Variants: text, circular, rectangular.

---

### Molecules

#### ChatMessage

| Role | Alignment | Background | Border Radius |
|------|-----------|-----------|--------------|
| `user` | Right-aligned | surface-container-low | rounded-lg, flat top-right |
| `assistant` | Left-aligned | vellum-white | rounded-lg, flat top-left |

- Max width: 85% of container
- Avatar: sm size, person icon (user) / psychology icon (assistant)
- Streaming state: blinking cursor bar (2px wide, ink-black)

#### ProjectCard

- Background: vellum-white
- Border: parchment (hover: outline)
- Padding: gap-md (24px)
- Min-height: 220px
- Rounded: stitch-DEFAULT (4px)
- Transition: 300ms color change on hover
- Structure: badge (type) → title (h3) → description (body-sm) → footer (status + date)

#### NavLink

- No border-radius (square edges)
- Active: bold text, surface-container bg, translate-x-1, filled icon
- Inactive: stone text, hover surface-container-low bg

#### DomainProgressItem

- Rounded: 9.6px (input radius)
- Completed: surface-container-low bg, parchment border, strikethrough text, terra-cotta check icon
- Active: surface bg, left border 2px ink-black, bold text
- Pending: stone icon + text, hover bg

#### FormField

Label + input/select/textarea with error message support.

#### Breadcrumb

Separator-linked navigation trail.

---

### Organisms

#### TopNavBar

- Sticky top, z-50
- Background: surface
- Bottom border: parchment
- Height: 64px (h-16)
- Max-width: container-max, centered
- Variants: `marketing` (full nav links) / `app` (simplified)
- Logo: display font at h3 size
- Links: body-md, stone color, hover terra-cotta

#### SideNavBar

- Fixed left, full height
- Width: 256px (w-64)
- Background: vellum-white
- Right border: parchment
- Contains: project header (avatar + name), nav links, bottom CTA

#### ChatInterface

- Flex column, full height
- Messages area: overflow-y-auto, gap-md spacing
- Input area: sticky bottom, parchment top border
- Input container: white bg, parchment border, 9.6px radius, focus outline
- Auto-scroll on new messages
- Enter to send, Shift+Enter for newline

#### DomainProgressPanel

- Width: 256px on md+
- Background: vellum-white
- Right border: parchment
- Progress bar: ink-black fill on surface-container track, 8px height, full radius
- Domain list: unit gap spacing

#### ToastProvider

- Position: fixed bottom-right
- z-index: 50
- Type-based border colors (success/error/info/warning)
- Slide-in-from-right animation
- Auto-dismiss: 5 seconds

---

## 10. Layout Patterns

### Page Structure

```
┌─────────────────────────────────────┐
│ TopNavBar (sticky, z-50)            │
├──────────┬──────────────────────────┤
│ SideNav  │ Main Content             │
│ (fixed,  │ (ml-64, flex-grow)       │
│  w-64)   │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

### Interview Layout

```
┌─────────────────────────────────────┐
│ TopNavBar                           │
├───────────┬────────────┬────────────┤
│ Domain    │ Chat       │ Preview    │
│ Progress  │ Interface  │ Panel      │
│ (w-64)   │ (flex-grow)│ (w-80)     │
└───────────┴────────────┴────────────┘
```

### Container Widths

| Context | Max Width |
|---------|-----------|
| Main container | 1200px |
| Landing page | 1120px |
| shadcn container | 1400px |
| Side nav | 256px |
| Preview panel | 320px (w-80) |

---

## 11. Dark Mode

Dark mode is configured via Tailwind's `class` strategy (`darkMode: ['class']`). The shadcn CSS variable layer swaps values in `.dark`:

| Variable | Light | Dark |
|----------|-------|------|
| `--background` | `0 0% 100%` | `222.2 84% 4.9%` |
| `--foreground` | `222.2 84% 4.9%` | `210 40% 98%` |
| `--primary` | `222.2 47.4% 11.2%` | `210 40% 98%` |
| `--secondary` | `210 40% 96.1%` | `217.2 32.6% 17.5%` |
| `--muted` | `210 40% 96.1%` | `217.2 32.6% 17.5%` |
| `--border` | `214.3 31.8% 91.4%` | `217.2 32.6% 17.5%` |

**Note:** The Stitch token layer currently operates in light mode only. Dark mode for Stitch components is not yet implemented.

---

## 12. Utility Function

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 13. Tailwind Configuration

### Preset Structure

```
tailwind.config.js
  └── presets: ['./lib/stitch/tailwind-preset.cjs']
        └── requires: './lib/stitch/tokens.cjs'
```

All Stitch tokens are namespaced with the `stitch-` prefix to avoid conflicts with shadcn/ui defaults:

- Colors: `bg-stitch-ink-black`, `text-stitch-terra-cotta`
- Spacing: `p-stitch-gap-md`, `gap-stitch-unit`
- Typography: `text-stitch-h3 font-stitch-h3`
- Radius: `rounded-stitch-DEFAULT`, `rounded-stitch-input`
- Max-width: `max-w-stitch-container-max`

### Key Config Snippets

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class'],
  presets: [require('./lib/stitch/tailwind-preset.cjs')],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

---

## 14. Dependencies

| Package | Version | Role |
|---------|---------|------|
| `tailwindcss` | ^3.4.19 | Utility CSS framework |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities |
| `class-variance-authority` | ^0.7.1 | Component variant management |
| `clsx` | ^2.1.1 | Conditional class composition |
| `tailwind-merge` | ^3.5.0 | Tailwind class deduplication |
| `postcss` | ^8.5.14 | CSS processing |
| `autoprefixer` | ^10.5.0 | Vendor prefixing |

---

## 15. Design Conventions Summary

1. **Warm over cool** — vellum backgrounds, earthy text, terra-cotta accents
2. **Borders over shadows** — elevation communicated via border color hierarchy
3. **Serif for display, sans for body** — Lora for headings, Inter for everything else
4. **Material Symbols for icons** — outlined by default, filled for active states
5. **Minimal animation** — 100-300ms transitions, no complex choreography
6. **Consistent spacing** — 8px base unit, multiples of 8 (8, 24, 32, 40)
7. **Accessible contrast** — ink-black on vellum/white for primary text
8. **Stitch prefix** — all custom tokens namespaced to avoid collision with shadcn defaults
9. **Component composition** — atoms → molecules → organisms (Atomic Design)
10. **Single accent** — terra-cotta (`#d97757`) is the only warm highlight color
