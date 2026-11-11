---https://stitch.googleapis.com/mcp
colors:
  surface: '#f8f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#43474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#74777e'
  outline-variant: '#c4c6ce'
  surface-tint: '#49607e'
  primary: '#000f22'
  on-primary: '#ffffff'
  primary-container: '#0a2540'
  on-primary-container: '#768dad'
  inverse-primary: '#b0c8eb'
  secondary: '#1e629a'
  on-secondary: '#ffffff'
  secondary-container: '#87c0fe'
  on-secondary-container: '#004e82'
  tertiary: '#1c0a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#3b1c00'
  on-tertiary-container: '#d27200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e4ff'
  primary-fixed-dim: '#b0c8eb'
  on-primary-fixed: '#001c37'
  on-primary-fixed-variant: '#314865'
  secondary-fixed: '#d0e4ff'
  secondary-fixed-dim: '#9ccaff'
  on-secondary-fixed: '#001d35'
  on-secondary-fixed-variant: '#00497b'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an authoritative, highly accessible, and utilitarian digital environment tailored for government and correctional services. The brand personality is grounded, official, and reassuringly dependable. The UI evokes a sense of absolute clarity, transparency, and institutional trust, ensuring that critical data and public services are communicated without ambiguity.

The aesthetic follows a strict, highly legible **Corporate / Modern** style heavily informed by institutional accessibility standards. It features high-contrast boundaries, structured data presentation, zero decorative ornamentation, and a deliberate focus on cognitive ergonomics.

## Colors

The color palette is built on authoritative navy tones paired with a clean, light slate foundation. Deep navy (`#0A2540`) provides institutional gravity for primary headers and key interactive anchors, while secondary slate blue (`#20639B`) supports structural navigation and active states. 

A restrained amber (`#D97706`) is reserved strictly for alerts, pending states, and important warnings, maintaining high visibility without inducing alarm. The neutral foundation (`#F4F6F8` canvas with stark white surfaces and high-contrast charcoal text) ensures optimal legibility and meets rigorous WCAG AAA contrast requirements across all data-heavy displays.

## Typography

Typography is strictly utilitarian, prioritizing instant legibility and scanning efficiency for dense informational environments. Inter is deployed across all weights to maintain a consistent, neutral voice. Scale steps are mathematically proportional to prevent layout shifts. Large display sizes automatically scale down on mobile viewports to preserve screen real estate without sacrificing readability.

## Layout & Spacing

The layout relies on a strict **fixed grid** system designed to anchor structured data tables, official records, and administrative dashboards. A 12-column desktop grid transitions gracefully to a fluid 4-column layout on mobile devices. 

Spacing is anchored to a predictable 4px/8px baseline rhythm, ensuring that high-density data tables, filters, and form controls maintain clear separation and prevent user error during high-stakes data entry or record retrieval.

## Elevation & Depth

Visual hierarchy is communicated strictly through **low-contrast outlines** and structured tonal layering. Avoid decorative drop shadows; instead, use crisp 1px borders in neutral grey (`#CBD5E1`) to delineate panels, cards, and table rows. Depth is achieved purely through surface background shifts (from white containers on slate canvas) to maintain the austere, uncompromising tone required for official government records.

## Shapes

The shape language uses a soft institutional radius (`0.25rem` base, `0.5rem` for large containers). Elements are intentionally restrained—neither overly pill-shaped nor completely sharp—striking a balance between approachability and formal precision. Interactive elements feature distinct, predictable geometric boundaries to ensure clear target acquisition.

## Components

- **Buttons:** High-contrast primary actions rendered in deep navy with white text. Secondary actions use outlined borders with dark text. Destructive or critical actions use solid amber or high-contrast red variants. Focus states must feature a highly visible 2px solid offset ring.
- **Chips & Status Badges:** Used extensively for record statuses (e.g., *Active*, *Pending Review*, *Archived*). High-contrast background tints with matching deep text colors; never rely solely on color—always pair badges with explicit text labels and standard iconography.
- **Data Tables:** The cornerstone of the portal. Must feature sticky headers, alternating row background tints for scannability, clear column dividers, and right-aligned numeric data. Support dense padding variants for desktop administrative views.
- **Checkboxes & Radio Controls:** Oversized, native-aligned touch targets with distinct border contrasts. Selected states must feature prominent checkmarks or filled indicators in primary navy.
- **Input Fields:** Form controls feature crisp full borders, clear internal labels, persistent helper text below, and inline validation messaging. Disabled states are clearly muted.
- **Cards:** White background containers resting on the slate canvas, defined by a 1px solid neutral border and structured with internal section dividers for metadata categorization.
- **Additional Components:** Mandatory inclusion of pagination controllers, breadcrumb navigation trails for deep document trees, expandable accordion record drawers, and persistent global banner alerts for system-wide advisories.