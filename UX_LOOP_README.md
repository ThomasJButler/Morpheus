# Morpheus UX Improvement Loop

An agentic loop for continuous UX and frontend improvements, inspired by [The Ralph Wiggum Technique](https://ghuntley.com/loop/).

## Overview

This loop automates UX improvements through two phases:
1. **Planning** - Analyze screenshots and code, identify gaps, update the implementation plan
2. **Building** - Implement one task at a time, test, and commit

## Quick Start

```bash
# Run the build loop (implement UX improvements)
./loop.sh build

# Run the planning loop (analyze and prioritize)
./loop.sh plan

# Run visual regression tests only
./loop.sh visual

# Limit iterations
./loop.sh build --max 5
```

## Directory Structure

```
Morpheus/
├── loop.sh                    # Main orchestration script
├── PROMPT_plan.md             # Planning phase instructions
├── PROMPT_build.md            # Build phase instructions
├── AGENTS.md                  # Operational learnings
├── IMPLEMENTATION_PLAN.md     # Task tracker (auto-updated)
├── specs/                     # UX specifications
│   ├── visual-design.md       # Colors, typography, animations
│   ├── responsive-design.md   # Breakpoints, layouts
│   ├── accessibility.md       # WCAG compliance
│   └── interactions.md        # Buttons, inputs, gestures
├── scripts/
│   └── compare-screenshots.sh # Screenshot diff utility
└── frontend/
    ├── e2e/
    │   ├── visual/            # Visual regression tests
    │   ├── __snapshots__/     # Baseline screenshots (tracked)
    │   └── capture-screenshots.spec.ts
    └── screenshots/           # Analysis screenshots (gitignored)
```

## How It Works

### Planning Phase

1. Captures fresh screenshots of the current UI
2. Claude analyzes screenshots against UX specs
3. Identifies gaps and improvement opportunities
4. Updates `IMPLEMENTATION_PLAN.md` with prioritized tasks

```bash
./loop.sh plan
```

### Build Phase

1. Reads the implementation plan
2. Selects the highest priority pending task
3. Implements the change
4. Runs visual regression tests
5. Commits if tests pass
6. Marks task as completed

```bash
./loop.sh build
```

## Visual Testing

### Capture Screenshots for Analysis

```bash
cd frontend
npm run screenshots:capture
```

Screenshots are saved to `frontend/screenshots/` for the planning phase.

### Run Visual Regression Tests

```bash
# Run all visual tests
npm run test:visual

# Run specific viewport
npm run test:visual:desktop
npm run test:visual:mobile

# Update baselines after intentional changes
npm run test:visual:update
```

### Compare Before/After

```bash
# Save "before" screenshots
mv frontend/screenshots frontend/screenshots/before

# Capture new screenshots
npm run screenshots:capture
mv frontend/screenshots frontend/screenshots/after

# Generate diff report
./scripts/compare-screenshots.sh
```

## Test Commands

```bash
# All tests
npm run test:all

# Unit tests only
npm run test:ci

# E2E tests only
npm run test:e2e

# Visual tests only
npm run test:visual

# Screenshot capture
npm run screenshots:capture
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOOP_MAX_ITERATIONS` | unlimited | Max iterations before stopping |
| `LOOP_AUTO_PUSH` | true | Auto-push after each commit |
| `LOOP_VISUAL_BASELINE` | false | Update visual baselines |
| `CLAUDE_FLAGS` | - | Additional flags for Claude CLI |

### Loop Options

```bash
./loop.sh [mode] [options]

Modes:
  plan          Run planning phase
  build         Run build phase (default)
  visual        Run visual tests only

Options:
  --max N       Maximum iterations
  --no-push     Disable auto-push
  --update-baseline  Update visual baselines
```

## Task Priority Levels

| Priority | Description | When to Use |
|----------|-------------|-------------|
| P0 | Critical | Broken functionality, major UX issues |
| P1 | High | Significant improvements |
| P2 | Medium | Nice to have |
| P3 | Low | Polish, minor enhancements |

## Best Practices

1. **One task per iteration** - Keep changes focused and reviewable
2. **Visual test everything** - Add a visual test for each component change
3. **Mobile-first** - Test at 375px before desktop
4. **Accessibility always** - Check focus states, ARIA labels
5. **Small commits** - Easier to review and revert

## Troubleshooting

### Visual tests failing unexpectedly

```bash
# Update baselines if the change was intentional
npm run test:visual:update

# Or run with higher tolerance
npx playwright test --update-snapshots
```

### Loop not picking up changes

The loop reads files fresh each iteration. Check:
- `IMPLEMENTATION_PLAN.md` has pending tasks
- `AGENTS.md` doesn't have conflicting instructions

### Screenshots look different on CI

Playwright uses different rendering on different platforms. Consider:
- Using Docker for consistent environments
- Increasing `maxDiffPixels` tolerance
- Running visual tests on the same platform

## Contributing

1. Add new UX requirements to `specs/`
2. Run the planning loop to update the implementation plan
3. Run the build loop to implement changes
4. Review commits and visual diffs
5. Push to the feature branch

---

*This loop is part of the Morpheus project. For more information, see the main [README.md](README.md).*
