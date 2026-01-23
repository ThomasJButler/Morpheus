# Morpheus UX Implementation Plan

> Auto-updated by the UX Loop. Last updated: Initial creation.

## Overview

This plan tracks UX and frontend improvements for Morpheus. Tasks are prioritized by user impact and organized by area.

## Task Status Legend

- `pending` - Not started
- `in_progress` - Currently being worked on
- `completed` - Done and tested
- `blocked` - Waiting on something

## Priority Legend

- **P0**: Critical - Broken or severely impacting UX
- **P1**: High - Significant user experience improvement
- **P2**: Medium - Nice to have, noticeable improvement
- **P3**: Low - Polish, minor enhancement

---

## Visual Polish

### [VISUAL] Add loading skeleton for chat messages
- **Priority**: P1
- **Complexity**: M
- **Status**: pending
- **Why**: Users see a jarring empty space while waiting for AI responses. Skeleton loading provides perceived performance improvement.
- **What**: Create a pulsing skeleton component that mimics message shape while streaming response loads.
- **Visual Test**: `chat-loading-skeleton.png`
- **Files**:
  - `frontend/src/components/Chat/ChatMessage.tsx`
  - `frontend/src/components/UI/Skeleton.tsx` (new)
  - `frontend/src/styles/matrix.css`

### [VISUAL] Improve empty state illustration
- **Priority**: P2
- **Complexity**: S
- **Status**: pending
- **Why**: Current empty state is text-heavy. A visual illustration would be more engaging and guide users better.
- **What**: Add Matrix-themed ASCII art or SVG illustration to the empty chat state.
- **Visual Test**: `chat-empty-state.png`
- **Files**:
  - `frontend/src/components/Chat/ChatInterface.tsx`
  - `frontend/src/styles/matrix.css`

### [VISUAL] Add micro-interactions to buttons
- **Priority**: P2
- **Complexity**: S
- **Status**: pending
- **Why**: Buttons feel static. Subtle animations provide feedback and delight.
- **What**: Add scale/glow transitions on hover and press states for all buttons.
- **Visual Test**: `button-interactions.png`
- **Files**:
  - `frontend/src/components/UI/Button.tsx`
  - `frontend/src/styles/matrix.css`

### [VISUAL] Enhance typing indicator animation
- **Priority**: P2
- **Complexity**: S
- **Status**: pending
- **Why**: Current thinking state could be more visually interesting and Matrix-themed.
- **What**: Create a Matrix code rain inspired typing indicator.
- **Visual Test**: `typing-indicator.png`
- **Files**:
  - `frontend/src/components/Chat/ThinkingInputState.tsx`
  - `frontend/src/styles/matrix.css`

---

## Responsiveness

### [RESPONSIVE] Fix chat input on mobile Safari
- **Priority**: P1
- **Complexity**: M
- **Status**: pending
- **Why**: iOS Safari has viewport height issues with the keyboard. Input can get hidden.
- **What**: Implement proper `dvh` units and keyboard-aware positioning.
- **Visual Test**: `mobile-input-keyboard.png`
- **Files**:
  - `frontend/src/components/Chat/InputBar.tsx`
  - `frontend/src/app/layout.tsx`

### [RESPONSIVE] Improve tablet layout
- **Priority**: P2
- **Complexity**: M
- **Status**: pending
- **Why**: Tablet viewport (768-1024px) has awkward spacing and underutilized space.
- **What**: Create optimized grid layout for tablet breakpoint.
- **Visual Test**: `tablet-layout.png`
- **Files**:
  - `frontend/src/components/Chat/ChatInterface.tsx`
  - `frontend/src/app/page.tsx`

### [RESPONSIVE] Add collapsible sidebar for documents
- **Priority**: P2
- **Complexity**: L
- **Status**: pending
- **Why**: Document panel takes too much space on smaller screens.
- **What**: Create slide-out drawer for document panel on mobile/tablet.
- **Visual Test**: `sidebar-collapsed.png`, `sidebar-expanded.png`
- **Files**:
  - `frontend/src/components/Documents/DocumentSidebar.tsx` (new)
  - `frontend/src/components/Chat/ChatInterface.tsx`

---

## Accessibility

### [A11Y] Add skip-to-content link
- **Priority**: P1
- **Complexity**: S
- **Status**: pending
- **Why**: Screen reader and keyboard users need to skip navigation.
- **What**: Add visually hidden skip link that appears on focus.
- **Visual Test**: `skip-link-focused.png`
- **Files**:
  - `frontend/src/app/layout.tsx`
  - `frontend/src/styles/matrix.css`

### [A11Y] Improve focus indicators
- **Priority**: P1
- **Complexity**: S
- **Status**: pending
- **Why**: Default focus rings are hard to see against Matrix theme.
- **What**: Add Matrix-green glow focus indicators for all interactive elements.
- **Visual Test**: `focus-indicators.png`
- **Files**:
  - `frontend/src/styles/matrix.css`
  - `frontend/tailwind.config.ts`

### [A11Y] Add reduced motion support
- **Priority**: P1
- **Complexity**: S
- **Status**: pending
- **Why**: Users with vestibular disorders need option to disable animations.
- **What**: Wrap animations in `prefers-reduced-motion` media query.
- **Visual Test**: N/A (behavior test)
- **Files**:
  - `frontend/src/styles/matrix.css`
  - `frontend/src/components/UI/MatrixRain.tsx`

### [A11Y] Add ARIA live regions for chat
- **Priority**: P2
- **Complexity**: M
- **Status**: pending
- **Why**: Screen readers need to announce new messages.
- **What**: Add `aria-live="polite"` region for incoming messages.
- **Visual Test**: N/A (screen reader test)
- **Files**:
  - `frontend/src/components/Chat/MessageList.tsx`
  - `frontend/src/components/Chat/ChatMessage.tsx`

---

## Interaction Design

### [INTERACTION] Add keyboard shortcuts overlay
- **Priority**: P2
- **Complexity**: M
- **Status**: pending
- **Why**: Users don't discover keyboard shortcuts easily.
- **What**: Add `?` or `Cmd+/` shortcut to show shortcuts modal.
- **Visual Test**: `keyboard-shortcuts-modal.png`
- **Files**:
  - `frontend/src/components/UI/KeyboardShortcuts.tsx` (new)
  - `frontend/src/app/layout.tsx`

### [INTERACTION] Improve message copy functionality
- **Priority**: P2
- **Complexity**: S
- **Status**: pending
- **Why**: Users want to copy AI responses easily.
- **What**: Add copy button to each message with success feedback.
- **Visual Test**: `message-copy-button.png`
- **Files**:
  - `frontend/src/components/Chat/ChatMessage.tsx`
  - `frontend/src/components/UI/CopyButton.tsx` (new)

### [INTERACTION] Add message regeneration
- **Priority**: P3
- **Complexity**: M
- **Status**: pending
- **Why**: Users sometimes want a different response.
- **What**: Add regenerate button for the last AI message.
- **Visual Test**: `message-regenerate.png`
- **Files**:
  - `frontend/src/components/Chat/ChatMessage.tsx`
  - `frontend/src/components/Chat/ChatInterface.tsx`

---

## Performance UX

### [PERF] Add optimistic UI for sending messages
- **Priority**: P1
- **Complexity**: M
- **Status**: pending
- **Why**: Messages feel slow to appear after hitting send.
- **What**: Immediately show user message while request is in flight.
- **Visual Test**: `optimistic-send.png`
- **Files**:
  - `frontend/src/components/Chat/ChatInterface.tsx`
  - `frontend/src/components/Chat/InputBar.tsx`

### [PERF] Lazy load Matrix rain canvas
- **Priority**: P2
- **Complexity**: S
- **Status**: pending
- **Why**: Matrix rain animation impacts initial load performance.
- **What**: Defer Matrix rain initialization until after main content loads.
- **Visual Test**: N/A (performance test)
- **Files**:
  - `frontend/src/components/UI/MatrixRain.tsx`
  - `frontend/src/app/page.tsx`

---

## Error Handling

### [ERROR] Improve error message design
- **Priority**: P1
- **Complexity**: M
- **Status**: pending
- **Why**: Error states are plain and don't fit Matrix theme.
- **What**: Create Matrix-themed error component with helpful recovery actions.
- **Visual Test**: `error-state.png`
- **Files**:
  - `frontend/src/components/ErrorFallback.tsx`
  - `frontend/src/styles/matrix.css`

### [ERROR] Add offline indicator
- **Priority**: P2
- **Complexity**: S
- **Status**: pending
- **Why**: Users don't know when they've lost connection.
- **What**: Add toast/banner when offline detected.
- **Visual Test**: `offline-indicator.png`
- **Files**:
  - `frontend/src/components/UI/OfflineIndicator.tsx` (new)
  - `frontend/src/app/layout.tsx`

---

## Completed Tasks

*(Tasks move here when completed)*

---

## Notes

- Visual tests are located in `frontend/e2e/visual/`
- Run `npm run test:visual` to verify visual changes
- Run `npm run test:visual:update` to update baselines after intentional changes
- Each task should be one commit with conventional commit format

---

*This plan is automatically updated by the UX Loop. Manual edits will be preserved.*
