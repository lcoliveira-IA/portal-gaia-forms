---
name: Lumina Precision
colors:
  surface: '#faf8fe'
  surface-dim: '#dad9df'
  surface-bright: '#faf8fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f8'
  surface-container: '#eeedf3'
  surface-container-high: '#e9e7ed'
  surface-container-highest: '#e3e2e7'
  on-surface: '#1a1b1f'
  on-surface-variant: '#46464a'
  inverse-surface: '#2f3034'
  inverse-on-surface: '#f1f0f5'
  outline: '#77767b'
  outline-variant: '#c7c6ca'
  surface-tint: '#5f5e60'
  primary: '#030304'
  on-primary: '#ffffff'
  primary-container: '#1d1d1f'
  on-primary-container: '#868587'
  inverse-primary: '#c8c6c8'
  secondary: '#005ab7'
  on-secondary: '#ffffff'
  secondary-container: '#0372e4'
  on-secondary-container: '#fefcff'
  tertiary: '#000400'
  on-tertiary: '#ffffff'
  tertiary-container: '#002308'
  on-tertiary-container: '#009a3b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4e2e4'
  primary-fixed-dim: '#c8c6c8'
  on-primary-fixed: '#1b1b1d'
  on-primary-fixed-variant: '#474649'
  secondary-fixed: '#d7e2ff'
  secondary-fixed-dim: '#abc7ff'
  on-secondary-fixed: '#001b3f'
  on-secondary-fixed-variant: '#00458f'
  tertiary-fixed: '#72fe88'
  tertiary-fixed-dim: '#53e16f'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#00531c'
  background: '#faf8fe'
  on-background: '#1a1b1f'
  surface-variant: '#e3e2e7'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style
The design system embodies a synthesis of Apple’s quiet tactile luxury and the functional clarity found in Linear and Google’s refined toolsets. Designed specifically for high-stakes enterprise onboarding and complex deployments, the experience prioritizes composure, structural calm, and typographic authority over decorative distraction. 

The aesthetic is Modern Minimalist Editorial. It relies on generous negative space, translucent structural boundaries, and near-weightless elevation to remove cognitive friction. Micro-interactions are deliberate and crisp, evoking an uncompromising standard of precision. Every container, interactive element, and typography token feels intentional, grounded, and quiet.

## Colors
The palette is built upon a canvas of warm, luminous off-whites, anchored by deep carbon neutrals and precise functional accents:

- **Canvas & Surfaces:**
  - Base Canvas (`#FBFBFD`): Pristine, inviting foundation with minimal optical glare.
  - Surface Secondary (`#F5F5F7`): Subdued secondary fill for sidebars, section segmentation, and sunken utility areas.
  - Surface Card / Raised (`#FFFFFF`): Pure white, providing subtle structural lift against the canvas.
- **Primary Text & High-Emphasis Accents (`#1D1D1F`):** Deep obsidian carbon for primary typography, authoritative buttons, and key interactive focal points.
- **Interactive & Functional Blue (`#0071E3`):** High-clarity cobalt used for primary links, system highlights, focus rings, and explicit progress states.
- **Borders & Micro-Dividers (`rgba(0, 0, 0, 0.08)` / `#E5E5EA`):** Ultrafine, whisper-thin boundaries engineered to avoid heavy blocking and visually separate data without visual weight.
- **Muted & Neutral Tone (`#86868B`):** Restrained secondary typography, empty state metadata, and inactive track indicators.

## Typography
Typographic scale and hierarchy are structured around editorial discipline. Headings use **Plus Jakarta Sans** with negative letter-tracking to deliver structured, contemporary character without sacrificing institutional gravity. Body copy, form controls, and technical telemetry rely on **Inter** to ensure optical legibility at dense enterprise data volumes.

Line heights remain airy and comfortable to prevent dense deployment logs from becoming visually exhausting. Numbers and tabular data should leverage OpenType tabular lining figures (`tnum`) to maintain alignment across system matrices and verification lists.

## Layout & Spacing
The layout follows a balanced 12-column responsive fluid grid with strict maximum container bounds (`1360px`) to preserve reading lengths and analytical clarity on ultra-wide screens.

- **Desktop (>= 1200px):** 12 columns, 24px (`1.5rem`) gutters, and generous 48px (`3rem`) page margins. Section blocks employ `space-2xl` to define clear, natural resting points without relying on dividing rules.
- **Tablet (768px – 1199px):** 8 columns, 20px gutters, and 32px margins. Auxiliary sidebars collapse into contextual sheet trays or unified navigation rails.
- **Mobile (< 768px):** 4 columns, 16px (`1rem`) gutters, and 20px (`1.25rem`) edge margins. Complex multi-column workflows reflow vertically with stacked inline controls.

## Elevation & Depth
Elevation is achieved using ambient "feather" diffusion and hairline structural contours rather than dramatic drops. Components float effortlessly above surfaces without producing visual noise:

- **Level 0 (Flat / Canvas):** Surface color `#FBFBFD` or `#F5F5F7` with no shadow.
- **Level 1 (Resting Cards & Surfaces):** Pure `#FFFFFF` surface accompanied by a 1px border of `rgba(0, 0, 0, 0.06)` and an ambient shadow: `0 1px 2px rgba(0, 0, 0, 0.02), 0 4px 16px rgba(0, 0, 0, 0.03)`.
- **Level 2 (Hovered Cards & Interactive Controls):** `0 2px 6px rgba(0, 0, 0, 0.03), 0 10px 24px rgba(0, 0, 0, 0.05)`.
- **Level 3 (Modals, Command Bars & Overlays):** Frosted backdrop blur (`backdrop-filter: blur(20px) saturate(180%)`) with background `rgba(255, 255, 255, 0.82)`, bounded by a 1px border of `rgba(0, 0, 0, 0.08)`, and cushioned by `0 20px 48px rgba(0, 0, 0, 0.08)`.

## Shapes
The shape language combines ergonomic curvature with tailored geometry:
- Interactive micro-elements (buttons, input fields, dropdown toggles, and select menus) use **10px to 12px** corner radii, maintaining tactile comfort without appearing cartoonish.
- Cards, panels, and data surfaces use **14px to 16px** corner radii.
- Badges, status tags, and avatar representations employ full circular curvature (pill shapes) to cleanly distinguish metadata from structural framing.

## Components

### Buttons
- **Primary:** Background `#1D1D1F`, text `#FFFFFF`, radius 10px. Interactive hover transitions slightly to `#323236` with a gentle `scale(0.995)` active compression.
- **Secondary / Ghost:** Translucent background `rgba(0, 0, 0, 0.04)`, text `#1D1D1F`, radius 10px. Hover shifts to `rgba(0, 0, 0, 0.07)`.
- **Accent / Action:** Background `#0071E3`, text `#FFFFFF`, radius 10px. Hover subtly shifts to `#0077ED`.

### Input Fields & Controls
- **Text Inputs:** Height 40px, radius 10px, background `#FFFFFF`, border 1px solid `rgba(0, 0, 0, 0.1)`. Focus state features a crisp 3px ring of `rgba(0, 113, 227, 0.2)` with an inner border of `#0071E3`.
- **Checkboxes & Radios:** 18px dimensions, 6px radius for checkboxes, full circle for radios. Active state fills with `#0071E3` accompanied by crisp white iconography.

### Cards & Panels
- Constructed with `#FFFFFF` backgrounds, rounded-lg (14px–16px) corners, and micro-borders (`1px solid rgba(0, 0, 0, 0.06)`). Content within uses explicit padding tiers (`space-lg` to `space-xl`) with clear hierarchy between section headers and metrics.

### Chips & Badges
- Pill-shaped tags (radius 9999px) with horizontal padding of 10px and vertical padding of 3px. Backgrounds are low-saturation tints (e.g., `rgba(0, 113, 227, 0.08)` for progress, `rgba(52, 199, 89, 0.1)` for healthy/deployed status) paired with high-contrast text.

### Deployment Process Flow & Steppers
- Linear, uninterrupted visual timelines. Active and completed steps utilize hairline connecting tracks (`1px solid rgba(0, 0, 0, 0.12)`) and minimalistic circular nodes (24px) that indicate state through refined icons or subtle pulses rather than loud banners.