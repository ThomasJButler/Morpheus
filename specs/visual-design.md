# Visual Design Specification

## Design Principles

1. **Matrix Authenticity** - Every visual element should feel like it belongs in the Matrix universe
2. **Functional Beauty** - Aesthetics serve usability, never hinder it
3. **Subtle Animation** - Movement should guide attention, not distract
4. **Dark-First** - Designed for dark mode comfort during long sessions

## Color System

### Primary Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `matrix-black` | `#0a0a0a` | Primary background |
| `matrix-green` | `#00ff00` | Primary accent, success states |
| `matrix-cyan` | `#00ffff` | Secondary accent, links |
| `matrix-white` | `#e0e0e0` | Primary text |
| `matrix-red` | `#ff0040` | Error states, danger |

### Semantic Colors

| State | Color | Opacity Variants |
|-------|-------|------------------|
| Success | `matrix-green` | 100%, 50%, 20% |
| Info | `matrix-cyan` | 100%, 50%, 20% |
| Warning | `#ffcc00` | 100%, 50%, 20% |
| Error | `matrix-red` | 100%, 50%, 20% |
| Muted | `matrix-white` | 60%, 40%, 20% |

### Glass Effect

```css
.glass-panel {
  background: rgba(0, 255, 0, 0.03);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 255, 0, 0.1);
  border-radius: 8px;
}
```

## Typography

### Font Stack

```css
font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
```

### Scale

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| xs | 12px | 16px | Captions, badges |
| sm | 14px | 20px | Secondary text, buttons |
| base | 16px | 24px | Body text |
| lg | 18px | 28px | Emphasis |
| xl | 20px | 28px | Headings |
| 2xl | 24px | 32px | Page titles |
| 3xl | 30px | 36px | Hero text |

### Text Effects

```css
/* Matrix glow */
.text-glow {
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

/* Scanline overlay (subtle) */
.scanline-text {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  background-clip: text;
}
```

## Spacing

Use Tailwind's spacing scale (4px base):

| Token | Value | Usage |
|-------|-------|-------|
| 1 | 4px | Tight gaps |
| 2 | 8px | Related elements |
| 3 | 12px | Button padding |
| 4 | 16px | Section padding |
| 6 | 24px | Card padding |
| 8 | 32px | Section margins |

## Shadows

### Glow Shadows

```css
/* Primary glow */
.glow-green {
  box-shadow:
    0 0 10px rgba(0, 255, 0, 0.3),
    0 0 20px rgba(0, 255, 0, 0.1);
}

/* Secondary glow */
.glow-cyan {
  box-shadow:
    0 0 10px rgba(0, 255, 255, 0.3),
    0 0 20px rgba(0, 255, 255, 0.1);
}

/* Error glow */
.glow-red {
  box-shadow:
    0 0 10px rgba(255, 0, 64, 0.3),
    0 0 20px rgba(255, 0, 64, 0.1);
}
```

### Elevation

For components that need depth:

```css
.elevation-1 { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); }
.elevation-2 { box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); }
.elevation-3 { box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5); }
```

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| none | 0 | Sharp edges (Matrix style) |
| sm | 4px | Small elements, badges |
| md | 8px | Cards, panels |
| lg | 12px | Modals, large containers |
| full | 9999px | Pills, avatars |

## Animation

### Timing Functions

```css
--ease-matrix: cubic-bezier(0.25, 0.8, 0.25, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-snappy: cubic-bezier(0.4, 0, 0.2, 1);
```

### Duration Scale

| Token | Duration | Usage |
|-------|----------|-------|
| instant | 0ms | No animation |
| fast | 100ms | Hover states |
| normal | 200ms | State changes |
| slow | 300ms | Enter/exit |
| slower | 500ms | Complex transitions |

### Standard Animations

```css
/* Fade in */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slide-up {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Pulse glow */
@keyframes glow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Matrix rain (character fall) */
@keyframes matrix-rain {
  from { transform: translateY(-100%); }
  to { transform: translateY(100vh); }
}
```

### Reduced Motion

Always wrap animations:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Iconography

### Icon Size Scale

| Size | Dimensions | Usage |
|------|------------|-------|
| xs | 12x12 | Inline text |
| sm | 16x16 | Buttons, badges |
| md | 20x20 | Default |
| lg | 24x24 | Standalone |
| xl | 32x32 | Empty states |

### Icon Style

- Stroke width: 1.5px (consistent with Matrix line aesthetic)
- Color: Inherit from text color
- Hover: Add subtle glow

## Components Visual Specs

### Buttons

```
┌─────────────────────────┐
│     Button Text         │  Height: 40px (touch target)
└─────────────────────────┘  Padding: 12px 24px
                             Border-radius: 4px
States:
- Default: bg-transparent, border-matrix-green
- Hover: bg-matrix-green/10, glow
- Active: bg-matrix-green/20, scale(0.98)
- Disabled: opacity-50, cursor-not-allowed
```

### Input Fields

```
┌─────────────────────────┐
│ Placeholder text...     │  Height: 44px
└─────────────────────────┘  Padding: 12px
                             Border: 1px solid matrix-green/30
States:
- Default: border-matrix-green/30
- Focus: border-matrix-green, glow
- Error: border-matrix-red, glow-red
- Disabled: opacity-50
```

### Cards/Panels

```
╔═════════════════════════╗
║  Header (optional)      ║
╠═════════════════════════╣
║                         ║
║  Content Area           ║  Padding: 24px
║                         ║  Border-radius: 8px
╚═════════════════════════╝  Glass effect
```

### Messages

```
User message (right-aligned):
                    ┌─────────────────────┐
                    │ User message text   │ bg-matrix-green/10
                    └─────────────────────┘ border-matrix-green/30

AI message (left-aligned):
┌─────────────────────────────┐
│ AI response with            │ bg-glass-bg
│ possible code blocks        │ border-matrix-cyan/20
└─────────────────────────────┘
```

## Visual Testing Checkpoints

Each component should have visual tests for:
- [ ] Default state
- [ ] Hover state (desktop)
- [ ] Focus state (keyboard)
- [ ] Active/pressed state
- [ ] Disabled state
- [ ] Loading state (if applicable)
- [ ] Error state (if applicable)
- [ ] Mobile viewport
- [ ] Reduced motion mode
