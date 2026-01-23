# Responsive Design Specification

## Breakpoints

| Name | Width | Target Devices |
|------|-------|----------------|
| mobile | < 640px | Phones (portrait) |
| sm | 640px+ | Phones (landscape), small tablets |
| md | 768px+ | Tablets (portrait) |
| lg | 1024px+ | Tablets (landscape), laptops |
| xl | 1280px+ | Desktops |
| 2xl | 1536px+ | Large monitors |

## Layout Grid

### Mobile (< 640px)
- Single column layout
- Full-width content
- Bottom-aligned input
- Hidden document sidebar (slide-out drawer)
- Stacked toolbar icons

### Tablet (640px - 1024px)
- Two-column optional (chat + collapsed sidebar)
- Collapsible document panel
- Horizontal toolbar

### Desktop (1024px+)
- Two/three column layout
- Always-visible document sidebar
- Full toolbar with labels
- Keyboard shortcuts visible

## Touch Targets

Minimum touch target sizes per platform:
- iOS: 44x44 px
- Android: 48x48 px
- **Morpheus standard: 44x44 px minimum**

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
}
```

## Viewport Units

### Height Handling

Use dynamic viewport height for mobile:

```css
/* Fallback for older browsers */
height: 100vh;

/* Modern mobile-friendly */
height: 100dvh;

/* Safe for keyboard */
height: 100svh;
```

### Safe Areas

Handle notches and rounded corners:

```css
.main-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

## Component Responsive Behaviors

### Header

| Viewport | Behavior |
|----------|----------|
| Mobile | Logo only, hamburger menu |
| Tablet | Logo + condensed nav |
| Desktop | Full logo + nav + actions |

### Chat Interface

| Viewport | Behavior |
|----------|----------|
| Mobile | Full-screen chat, FAB for docs |
| Tablet | Chat with collapsible sidebar |
| Desktop | Chat + persistent sidebar |

### Input Bar

| Viewport | Behavior |
|----------|----------|
| Mobile | Fixed bottom, auto-grow height, max 3 lines |
| Tablet | Fixed bottom, max 5 lines |
| Desktop | Fixed bottom, max 10 lines |

### Document Panel

| Viewport | Behavior |
|----------|----------|
| Mobile | Drawer (slide from right) |
| Tablet | Collapsible panel (280px) |
| Desktop | Fixed panel (320px) |

### Message List

| Viewport | Behavior |
|----------|----------|
| Mobile | Full width, compact padding |
| Tablet | Max 720px centered |
| Desktop | Max 800px centered |

### Toolbar

| Viewport | Behavior |
|----------|----------|
| Mobile | Icons only, overflow menu |
| Tablet | Icons with tooltips |
| Desktop | Icons with labels |

## Typography Scaling

```css
/* Mobile-first responsive type */
.heading {
  font-size: 1.25rem;  /* 20px mobile */
}

@media (min-width: 640px) {
  .heading {
    font-size: 1.5rem;  /* 24px tablet */
  }
}

@media (min-width: 1024px) {
  .heading {
    font-size: 1.875rem;  /* 30px desktop */
  }
}
```

## Spacing Scaling

```css
/* Container padding */
.container {
  padding: 1rem;  /* 16px mobile */
}

@media (min-width: 640px) {
  .container {
    padding: 1.5rem;  /* 24px tablet */
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 2rem;  /* 32px desktop */
  }
}
```

## Images and Media

### Responsive Images

```tsx
<Image
  src="/image.png"
  width={800}
  height={600}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 800px"
  alt="Description"
/>
```

### Video/Canvas (Matrix Rain)

- Disable on mobile to save battery
- Reduce particle count on tablet
- Full effect on desktop only

```tsx
const isMobile = useMediaQuery('(max-width: 640px)');
const isTablet = useMediaQuery('(max-width: 1024px)');

const particleCount = isMobile ? 0 : isTablet ? 50 : 100;
```

## Orientation Handling

### Portrait vs Landscape

```css
/* Portrait-specific styles */
@media (orientation: portrait) {
  .sidebar {
    display: none;
  }
}

/* Landscape-specific styles */
@media (orientation: landscape) {
  .sidebar {
    display: block;
  }
}
```

### Orientation Change

Handle keyboard visibility on mobile:

```tsx
useEffect(() => {
  const handleResize = () => {
    // Detect virtual keyboard
    const isKeyboardOpen = window.innerHeight < window.outerHeight * 0.75;
    setKeyboardOpen(isKeyboardOpen);
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

## Testing Viewports

### Required Visual Test Viewports

| Name | Width | Height | Device |
|------|-------|--------|--------|
| iPhone SE | 375px | 667px | Small phone |
| iPhone 14 | 390px | 844px | Standard phone |
| iPhone 14 Pro Max | 430px | 932px | Large phone |
| iPad Mini | 768px | 1024px | Small tablet |
| iPad Pro 11" | 834px | 1194px | Medium tablet |
| MacBook Air | 1280px | 800px | Laptop |
| Desktop | 1920px | 1080px | Monitor |

### Playwright Viewport Config

```typescript
// playwright.config.ts
projects: [
  {
    name: 'mobile-portrait',
    use: { viewport: { width: 375, height: 667 } },
  },
  {
    name: 'mobile-landscape',
    use: { viewport: { width: 667, height: 375 } },
  },
  {
    name: 'tablet',
    use: { viewport: { width: 768, height: 1024 } },
  },
  {
    name: 'desktop',
    use: { viewport: { width: 1280, height: 800 } },
  },
]
```

## Responsive Checklist

For every component, verify:

- [ ] Readable on 320px width (smallest phone)
- [ ] Touch targets >= 44px
- [ ] No horizontal scroll
- [ ] Images scale properly
- [ ] Text doesn't overflow
- [ ] Interactive elements reachable
- [ ] Keyboard doesn't obscure inputs
- [ ] Portrait and landscape work
- [ ] Animations respect reduced motion
