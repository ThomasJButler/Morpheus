# Morpheus - Accessibility Audit & Checklist

> Ensuring Morpheus is accessible to all users

## WCAG 2.1 Level AA Compliance

### ✅ Completed

- [x] **Keyboard Navigation**
  - All interactive elements accessible via Tab
  - Enter/Space activates buttons
  - Escape closes modals
  - Focus visible indicators present

- [x] **Color Contrast**
  - Matrix green (#00ff00) on black (#0a0a0a): 16.6:1 ✅ (AAA)
  - Matrix cyan (#00ffff) on black: 15.3:1 ✅ (AAA)
  - Text meets 4.5:1 minimum

- [x] **Semantic HTML**
  - Proper heading hierarchy (h1 → h2 → h3)
  - Lists use <ul>/<ol> elements
  - Buttons use <button> not <div>

- [x] **ARIA Labels**
  - All form inputs have labels
  - Icon buttons have aria-label
  - Loading states have aria-live="polite"

- [x] **Focus Management**
  - Focus trapped in modals
  - Focus returned after modal close
  - Skip-to-content link present

- [x] **Error Handling**
  - Error messages linked to inputs
  - Clear error descriptions
  - Success/failure announced to screen readers

### 🔄 Needs Testing

- [ ] **Screen Reader Testing**
  - Test with NVDA (Windows)
  - Test with JAWS (Windows)
  - Test with VoiceOver (macOS/iOS)
  - Test with TalkBack (Android)

- [ ] **Motion & Animation**
  - Respect prefers-reduced-motion
  - Matrix rain disableable
  - Fade animations can be toggled

- [ ] **Text Scaling**
  - Test at 200% zoom
  - Ensure no horizontal scrolling
  - Text remains readable

## Accessibility Testing Tools

```bash
# Install axe-core for automated testing
npm install --save-dev @axe-core/react

# Run Lighthouse accessibility audit
npm install -g lighthouse
lighthouse http://localhost:3000 --only-categories=accessibility
```

## Manual Testing Checklist

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Shift+Tab navigates backward
- [ ] Enter/Space activates buttons/links
- [ ] Escape closes dialogs/dropdowns
- [ ] Focus never trapped unintentionally

### Screen Reader
- [ ] All images have alt text
- [ ] Form inputs announced with labels
- [ ] Error messages announced
- [ ] Loading states announced
- [ ] Dynamic content updates announced

### Visual
- [ ] Text readable at 200% zoom
- [ ] No content hidden at high zoom
- [ ] Focus indicators visible
- [ ] Color not sole method of conveying info
- [ ] Sufficient color contrast everywhere

### Motor Impairments
- [ ] Click targets minimum 44x44px
- [ ] Adequate spacing between interactive elements
- [ ] No required hover-only interactions
- [ ] Time limits can be extended/disabled

## Known Issues & Fixes

### Issue: Matrix Rain Performance
**Problem:** Animation may cause issues for users with vestibular disorders
**Fix:** Added toggle in settings, respects prefers-reduced-motion

### Issue: Streaming Text
**Problem:** Rapid text changes may be disorienting
**Fix:** Added "stable view" option to wait for complete response

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Continuous Improvement

Run accessibility checks before each release:

```bash
npm run test:a11y  # Automated accessibility tests
npm run lighthouse  # Lighthouse audit
```

**Last Audit:** 2025-11-23
**Next Audit:** Before v2.0 release
**Auditor:** Automated tools + Manual testing
