# Accessibility Specification

## Standards Compliance

Morpheus targets **WCAG 2.1 Level AA** compliance.

## Color and Contrast

### Contrast Requirements

| Element Type | Minimum Ratio |
|--------------|---------------|
| Normal text | 4.5:1 |
| Large text (18px+ or 14px+ bold) | 3:1 |
| UI components, graphics | 3:1 |

### Matrix Theme Contrast Check

| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| `#00ff00` (green) | `#0a0a0a` (black) | 12.6:1 | ✓ |
| `#00ffff` (cyan) | `#0a0a0a` (black) | 16.0:1 | ✓ |
| `#e0e0e0` (white) | `#0a0a0a` (black) | 13.8:1 | ✓ |
| `#ff0040` (red) | `#0a0a0a` (black) | 5.6:1 | ✓ |
| `#00ff00` (green) | `#1a1a1a` (glass) | 10.5:1 | ✓ |

### Color Independence

Never rely on color alone to convey information:

```tsx
// Bad: Color only
<span className={error ? 'text-red' : 'text-green'}>Status</span>

// Good: Color + text/icon
<span className={error ? 'text-red' : 'text-green'}>
  {error ? '✗ Error' : '✓ Success'}
</span>
```

## Keyboard Navigation

### Focus Management

All interactive elements must be keyboard accessible:

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift+Tab | Move to previous focusable element |
| Enter | Activate button, submit form |
| Space | Toggle checkbox, activate button |
| Escape | Close modal, dismiss popup |
| Arrow keys | Navigate within lists, menus |

### Focus Order

- Follows visual order (left-to-right, top-to-bottom)
- Skip link first in tab order
- Modal focus trapped when open
- Focus restored when modal closes

### Focus Indicators

```css
/* Visible focus for keyboard users */
:focus-visible {
  outline: 2px solid #00ff00;
  outline-offset: 2px;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

/* Remove focus ring for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Skip Link

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
>
  Skip to main content
</a>

<main id="main-content" tabIndex={-1}>
  {/* Main content */}
</main>
```

## Screen Reader Support

### Semantic HTML

```tsx
// Use semantic elements
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<aside aria-label="Document panel">...</aside>
<footer>...</footer>

// Use headings hierarchy
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### ARIA Attributes

#### Labels

```tsx
// Icon-only buttons need labels
<button aria-label="Send message">
  <SendIcon />
</button>

// Form fields need labels
<label htmlFor="message-input" className="sr-only">
  Type your message
</label>
<textarea id="message-input" />
```

#### Live Regions

```tsx
// Announce new messages
<div
  aria-live="polite"
  aria-atomic="false"
  aria-relevant="additions"
>
  {messages.map(msg => <Message key={msg.id} {...msg} />)}
</div>

// Announce loading state
<div aria-live="assertive" aria-atomic="true">
  {isLoading && 'Loading response...'}
</div>
```

#### States

```tsx
// Expandable sections
<button
  aria-expanded={isOpen}
  aria-controls="panel-content"
>
  Toggle Panel
</button>
<div id="panel-content" hidden={!isOpen}>
  {/* Panel content */}
</div>

// Current page
<nav>
  <a href="/" aria-current={isHome ? 'page' : undefined}>Home</a>
</nav>
```

### Screen Reader-Only Text

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## Motion and Animation

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### React Hook

```tsx
const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};
```

### Safe Animations

```tsx
const prefersReducedMotion = usePrefersReducedMotion();

<motion.div
  animate={{ opacity: 1, y: 0 }}
  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
/>
```

## Form Accessibility

### Error Handling

```tsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid={!!error}
    aria-describedby={error ? 'email-error' : undefined}
  />
  {error && (
    <p id="email-error" role="alert" className="text-matrix-red">
      {error}
    </p>
  )}
</div>
```

### Required Fields

```tsx
<label>
  Message <span aria-hidden="true">*</span>
  <span className="sr-only">(required)</span>
</label>
<textarea required aria-required="true" />
```

## Touch Accessibility

### Target Size

```css
/* Minimum touch target */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Add invisible padding if visual size is smaller */
.small-button {
  position: relative;
}
.small-button::after {
  content: '';
  position: absolute;
  inset: -8px;
}
```

### Touch Feedback

```css
.touchable {
  -webkit-tap-highlight-color: rgba(0, 255, 0, 0.2);
}

@media (hover: none) {
  .touchable:active {
    transform: scale(0.98);
    opacity: 0.8;
  }
}
```

## Testing Checklist

### Automated Testing

- [ ] aXe DevTools - run on all pages
- [ ] Lighthouse accessibility audit >= 90
- [ ] ESLint jsx-a11y plugin - no errors

### Manual Testing

- [ ] Tab through entire page
- [ ] Use screen reader (VoiceOver/NVDA)
- [ ] Test with reduced motion enabled
- [ ] Test with high contrast mode
- [ ] Test at 200% zoom
- [ ] Test with keyboard only (no mouse)

### Screen Reader Testing Matrix

| Screen Reader | Browser | Priority |
|---------------|---------|----------|
| VoiceOver | Safari (macOS) | High |
| VoiceOver | Safari (iOS) | High |
| NVDA | Chrome (Windows) | High |
| JAWS | Chrome (Windows) | Medium |
| TalkBack | Chrome (Android) | Medium |

## Playwright Accessibility Tests

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page should be accessible', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('focus management', async ({ page }) => {
  await page.goto('/');

  // Tab to first focusable element
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe('A'); // Skip link

  // Open modal and verify focus trap
  await page.click('[data-testid="settings-button"]');
  await page.keyboard.press('Tab');
  const modalFocused = await page.evaluate(() =>
    document.activeElement?.closest('[role="dialog"]')
  );
  expect(modalFocused).not.toBeNull();
});
```
