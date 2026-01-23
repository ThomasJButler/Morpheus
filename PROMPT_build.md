# Morpheus UX Build Phase

You are an expert UX engineer implementing frontend improvements for Morpheus, an intelligent document reasoning system with a Matrix-themed interface.

## Your Mission

**Implement exactly ONE task** from IMPLEMENTATION_PLAN.md, validate it with tests, and commit.

## Critical Rules

1. **ONE TASK PER ITERATION** - Select the highest priority pending task
2. **DON'T ASSUME** not implemented - always read the code first
3. **Study existing patterns** - match the codebase style exactly
4. **Test visually** - run Playwright visual tests after changes
5. **Small commits** - one logical change per commit
6. **Ultrathink** before writing - ensure minimal, elegant solutions

## Files to Read First

1. `IMPLEMENTATION_PLAN.md` - Select your task
2. `AGENTS.md` - Patterns and learnings
3. Task-specific files listed in the plan

## Tech Stack Reference

- **Framework**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS + custom matrix.css
- **Components**: `frontend/src/components/`
- **Styles**: `frontend/src/styles/matrix.css`
- **Tests**: Jest (unit) + Playwright (e2e + visual)

## Matrix Theme Tokens

```css
/* Colors */
--matrix-black: #0a0a0a
--matrix-green: #00ff00
--matrix-cyan: #00ffff
--matrix-white: #e0e0e0
--glass-bg: rgba(0, 255, 0, 0.03)

/* Shadows */
--glow-green: 0 0 10px rgba(0, 255, 0, 0.5)
--glow-cyan: 0 0 10px rgba(0, 255, 255, 0.5)
```

## Implementation Process

### Step 1: Select Task
Read IMPLEMENTATION_PLAN.md and select the highest priority (P0 > P1 > P2 > P3) pending task that is not blocked.

### Step 2: Study Code
Read ALL files listed in the task. Understand existing patterns before making changes.

### Step 3: Implement
Make minimal, focused changes:
- Match existing code style exactly
- Use existing utilities from `src/lib/`
- Prefer Tailwind classes over custom CSS
- Add CSS to matrix.css only when Tailwind isn't sufficient
- Keep accessibility in mind (ARIA, keyboard, focus)

### Step 4: Add Visual Test
Create or update a visual test in `frontend/e2e/visual/`:

```typescript
// Example: visual-chat.spec.ts
import { test, expect } from '@playwright/test';

test('chat interface matches baseline', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Wait for animations to settle
  await page.waitForTimeout(1000);

  await expect(page).toHaveScreenshot('chat-interface.png', {
    maxDiffPixels: 100,
    threshold: 0.2,
  });
});
```

### Step 5: Run Tests
```bash
cd frontend
npm run lint
npm run test:ci
npm run test:e2e
```

All tests must pass before committing.

### Step 6: Update Plan
Mark the task as `completed` in IMPLEMENTATION_PLAN.md.

### Step 7: Commit
Use conventional commits:
```
feat(ux): add loading skeleton for chat messages

- Add shimmer animation to message placeholders
- Improve perceived performance during API calls
- Visual test: chat-loading-state.png

Closes: #task-id
```

## Quality Checklist

Before committing, verify:
- [ ] Code matches existing patterns
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Unit tests pass (`npm run test:ci`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Visual tests pass or baseline updated
- [ ] Mobile responsive (test at 375px width)
- [ ] Keyboard accessible
- [ ] No console errors
- [ ] IMPLEMENTATION_PLAN.md updated

## Common Patterns

### Adding a New Animation
```css
/* In matrix.css */
@keyframes your-animation {
  from { opacity: 0; }
  to { opacity: 1; }
}

.your-class {
  animation: your-animation 0.3s ease-out;
}
```

### Conditional Styling
```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-classes',
  condition && 'conditional-classes',
  variant === 'primary' && 'primary-classes'
)} />
```

### Responsive Design
```tsx
<div className="
  p-2 text-sm          /* mobile */
  md:p-4 md:text-base  /* tablet+ */
  lg:p-6 lg:text-lg    /* desktop */
" />
```

### Adding Visual Test
```typescript
test.describe('Component Visual Tests', () => {
  test('default state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.component')).toHaveScreenshot();
  });

  test('hover state', async ({ page }) => {
    await page.goto('/');
    await page.locator('.component').hover();
    await expect(page.locator('.component')).toHaveScreenshot();
  });
});
```

## Backpressure

If any of these fail, DO NOT commit:
- TypeScript compilation errors
- ESLint errors (warnings OK)
- Jest test failures
- Playwright test failures

Fix the issues first, then commit.

## Output

After implementation:
1. Summary of changes made
2. Files modified
3. Test results
4. Commit message used

---

Begin by reading IMPLEMENTATION_PLAN.md to select your task, then implement it.
