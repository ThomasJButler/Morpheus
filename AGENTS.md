# Morpheus UX Loop - Agent Learnings

This file captures operational learnings for agents working on Morpheus UX improvements. Keep it brief and actionable.

## Project Context

Morpheus is an intelligent document reasoning system with a Matrix-themed UI. The frontend is Next.js 15 + React 19 + Tailwind CSS.

## Code Patterns

### Component Structure
- Components live in `frontend/src/components/{Category}/`
- Use `'use client'` directive for interactive components
- Export named components, not default exports
- Co-locate tests in `__tests__/` subdirectories

### Styling Hierarchy
1. **Tailwind classes first** - Use for spacing, layout, colors
2. **matrix.css second** - Use for complex animations, Matrix effects
3. **Inline styles never** - Avoid `style={{}}` props

### State Management
- `useSettings()` - User preferences (localStorage)
- `useSession()` - Session/conversation state
- `useChat()` - Vercel AI SDK chat hook

### Utility Imports
```typescript
import { cn } from '@/lib/utils';  // Class name merger
import { api } from '@/lib/api-client';  // API calls
```

## Testing Patterns

### Visual Tests Location
- `frontend/e2e/visual/` - Visual regression tests
- `frontend/e2e/screenshots/` - Baseline screenshots (gitignored)
- `frontend/screenshots/` - Analysis screenshots (gitignored)

### Visual Test Structure
```typescript
test('component state', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);  // Let animations settle
  await expect(page.locator('.target')).toHaveScreenshot('name.png', {
    maxDiffPixels: 100,
  });
});
```

### Running Tests
```bash
npm run test:ci          # Jest unit tests
npm run test:e2e         # Playwright E2E
npm run test:visual      # Visual regression only
npm run test:visual:update  # Update baselines
```

## Matrix Theme

### Colors (use Tailwind classes)
- `bg-matrix-black` / `text-matrix-black` - #0a0a0a
- `bg-matrix-green` / `text-matrix-green` - #00ff00
- `bg-matrix-cyan` / `text-matrix-cyan` - #00ffff
- `text-matrix-white` - #e0e0e0

### Glass Effect
```tsx
<div className="glass-panel">  {/* From matrix.css */}
  {/* or */}
</div>
<div className="bg-glass-bg backdrop-blur-sm border border-matrix-green/20">
  {/* Tailwind equivalent */}
</div>
```

### Glow Effects
```css
/* In matrix.css */
.matrix-glow {
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3),
              0 0 20px rgba(0, 255, 0, 0.1);
}
```

## Common Mistakes to Avoid

1. **Don't break mobile** - Always test at 375px width
2. **Don't forget focus states** - Keyboard users need visible focus
3. **Don't hardcode colors** - Use theme tokens
4. **Don't skip loading states** - Users need feedback
5. **Don't ignore animations** - Support `prefers-reduced-motion`

## File Locations Quick Reference

| What | Where |
|------|-------|
| Main page | `frontend/src/app/page.tsx` |
| Layout | `frontend/src/app/layout.tsx` |
| Chat UI | `frontend/src/components/Chat/ChatInterface.tsx` |
| Theme CSS | `frontend/src/styles/matrix.css` |
| Tailwind config | `frontend/tailwind.config.ts` |
| E2E tests | `frontend/e2e/` |
| Visual tests | `frontend/e2e/visual/` |
| Unit tests | `frontend/src/**/__tests__/` |
| API client | `frontend/src/lib/api-client.ts` |
| Types | `frontend/src/lib/types.ts` |

## Performance Notes

- Matrix rain canvas: ~60fps target, disable on mobile for battery
- Streaming responses: Use Vercel AI SDK's `useChat`
- Images: Next.js Image component with proper sizing
- Animations: Use `transform` and `opacity` for GPU acceleration

## Accessibility Checklist

- [ ] Focus visible on all interactive elements
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast ratio >= 4.5:1
- [ ] Keyboard navigable (Tab, Enter, Escape)
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] Reduced motion support

---

*Update this file when discovering new patterns or learnings during implementation.*
