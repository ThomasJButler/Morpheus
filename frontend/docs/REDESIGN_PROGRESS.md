# Morpheus v2 Redesign — Progress

Tracked ledger for the multi-phase v2 redesign integration branch
(`redesign/v2`). The full plan lives at
`frontend/Morpheus-Redesign/HANDOFF.md` (gitignored, kept local).
Update this file when each phase ships.

## Phase ledger

- [x] **Phase 0 — Foundation.** Design tokens, Geist font, `REDESIGN_V2` feature flag.
  PR: [#13](https://github.com/ThomasJButler/Morpheus/pull/13) (`redesign/v2-tokens` → `redesign/v2`)
- [ ] **Phase 1 — Layout shell ⚡.** Three-pane `AppShell`, scroll-bug fix via the `min-height: 0` chain. Branch: `redesign/v2-layout-shell`.
- [ ] **Phase 2 — Chat polish.** `Composer`, `EmptyState`, restyled `ChatMessage`. Branch: `redesign/v2-chat-polish`.
- [ ] **Phase 3 — Cold-start UX.** Multi-stage progress strip driven by real `/api/health` telemetry. Branch: `redesign/v2-cold-start`.
- [ ] **Phase 4 — Docs sidebar.** Left rail, collapsible. Branch: `redesign/v2-docs-sidebar`.
- [ ] **Phase 5 — System panel.** Right rail with Status / Sources / System tabs. Branch: `redesign/v2-system-panel`.
- [ ] **Phase 6 — Modals.** Shared `Modal` shell, restyled Settings / Upload / Guide. Branch: `redesign/v2-modals`.
- [ ] **Phase 7 — Mobile & polish.** Drawer pattern, ≥44px touch targets, safe-area-inset. Branch: `redesign/v2-mobile`.
- [ ] **Phase 8 — A11y, perf, QA.** `@lhci/cli`, Playwright, reduced-motion, ARIA, contrast. Lands on `redesign/v2` directly.
- [ ] **Final** — merge `redesign/v2` → `main`, remove the flag, tag `v2.0.0-redesign`.

## Definition of done (top-level)

- [ ] Chat scrolls on all viewports (the canonical bug from Phase 1).
- [ ] Cold-start UX visible and accurate on first load (Phase 3).
- [ ] Mobile flow works end-to-end — verified on real iOS Safari (Phase 7).
- [ ] Lighthouse ≥ 95 in Performance, Accessibility, Best Practices (Phase 8).
- [ ] No new test regressions (test-suite stabilisation pass, Phase 8 or `fix/test-suite`).
- [ ] Old route still works behind `NEXT_PUBLIC_REDESIGN_V2` for one release cycle before flag removal.
