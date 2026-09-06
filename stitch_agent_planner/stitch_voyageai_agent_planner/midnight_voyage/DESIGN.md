---
name: Midnight Voyage
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c6c6cb'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#909095'
  outline-variant: '#45474b'
  surface-tint: '#c6c6cc'
  primary: '#c6c6cc'
  on-primary: '#2f3035'
  primary-container: '#0a0c10'
  on-primary-container: '#797a7f'
  inverse-primary: '#5d5e63'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#000e12'
  on-tertiary-container: '#00869d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e8'
  primary-fixed-dim: '#c6c6cc'
  on-primary-fixed: '#1a1c20'
  on-primary-fixed-variant: '#45474b'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The brand personality is sophisticated, futuristic, and intellectually curious. It targets high-end travelers who value efficiency and technological precision in their planning process. The UI should evoke a sense of calm exploration—resembling the cockpit of a high-end spacecraft or a luxury nighttime lounge.

The design system employs a **Glassmorphic** style. It utilizes deep, layered backgrounds to create a sense of infinite digital space, while foreground elements appear as frosted glass panes floating in a dark vacuum. This is reinforced by subtle light-leak gradients and high-precision borders that give the interface a "machined" feel.

## Colors
The palette is centered on a deep "Midnight" foundation. The primary background (#0A0C10) provides a high-contrast base for the vibrant accent gradients. 

- **Primary & Neutral:** Deep navies and charcoal grays form the UI's structural surfaces.
- **Accents:** A signature gradient—Electric Purple to Deep Cyan—is reserved for primary actions, AI status highlights, and pathfinding animations.
- **Agent Status:**
    - **Active:** Electric Purple, pulsating to indicate compute cycles.
    - **Pending:** Muted Slate, representing a dormant or queued state.
    - **Completed:** Emerald Green, glowing softly to signify success.
    - **Warning:** Amber, providing high-visibility feedback against the dark background.

## Typography
The typographic hierarchy contrasts the geometric, modern personality of **Outfit** for headlines with the utilitarian clarity of **Inter** for long-form data and body text. 

Headlines should use tight tracking to maintain a "luxury tech" feel. Labels and agent status markers use Inter in all-caps with generous letter spacing to ensure maximum legibility at small sizes within dense status dashboards.

## Layout & Spacing
The design system utilizes a **fluid grid** with a 12-column structure for desktop and a 4-column structure for mobile. 

Spacing follows a strict 4px base unit. Component internal padding should favor "airy" layouts (e.g., 24px or 32px padding for cards) to prevent the dark interface from feeling cramped. For AI-generated content blocks, use wider gutters (32px) to allow the "glass" edges of separate parallel agents to breathe.

## Elevation & Depth
Depth is created through **Glassmorphism** rather than traditional drop shadows. 

1. **Base:** The fundamental application background is #0A0C10.
2. **Surface:** Content cards use a semi-transparent fill (`rgba(15, 23, 42, 0.6)`) with a 20px - 40px `backdrop-filter: blur()`.
3. **Stroke:** Every glass element must have a 1px solid border (`rgba(255, 255, 255, 0.1)`) on all sides to define its edges against the dark background.
4. **Active Elevation:** When an agent is "Active," the glass pane should gain a subtle inner glow using the primary purple accent and an increased backdrop blur to simulate lifting off the surface.

## Shapes
The shape language is consistently **Rounded**. Standard components use an 8px (0.5rem) radius to feel modern but structured. Large itinerary cards or "agent bubbles" should use `rounded-xl` (24px) to emphasize the soft, "organic" nature of the AI-driven planning process. Secondary buttons and input fields stay strictly at 8px to maintain a professional, systematic appearance.

## Components
- **Buttons:** Primary buttons use the `gradient_accent` with white text. Secondary buttons are "Ghost" style with a 1px border and blur background.
- **Agent Status Indicators:** Small circular pips next to agent names. When "Active," the pip includes a 4px outer blur (glow) in the status color.
- **Glass Cards:** The primary container for itinerary steps. Features a 1px top-highlight border to simulate light hitting the edge.
- **Input Fields:** Darker than the background (#050608) with a 1px border that glows Purple when focused.
- **Parallel Agent List:** A vertical sidebar component showing multiple "thinking" threads. Each thread item uses a subtle left-accent border matching its current status color.
- **Progress Bars:** Ultra-thin (2px) lines using the Deep Cyan accent, featuring a "comet" animation (a bright leading edge) to indicate active movement.