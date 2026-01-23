# Interaction Design Specification

## Core Principles

1. **Immediate Feedback** - Every action gets a response within 100ms
2. **Predictable** - Interactions behave consistently across the app
3. **Forgiving** - Easy to undo, hard to make destructive mistakes
4. **Efficient** - Power users can accomplish tasks quickly

## Button Interactions

### States

| State | Visual | Transition |
|-------|--------|------------|
| Default | Border: matrix-green/50 | - |
| Hover | Border: matrix-green, Glow, Scale: 1.02 | 150ms ease |
| Focus | Border: matrix-green, Glow, Outline | - |
| Active | Scale: 0.98, Bg: matrix-green/20 | 50ms |
| Disabled | Opacity: 0.5, Cursor: not-allowed | - |
| Loading | Spinner icon, Text: "Loading..." | - |

### Implementation

```tsx
<button
  className={cn(
    // Base
    'px-4 py-2 border rounded transition-all duration-150',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-matrix-green',
    // Default
    'border-matrix-green/50 bg-transparent',
    // Hover
    'hover:border-matrix-green hover:shadow-glow hover:scale-[1.02]',
    // Active
    'active:scale-[0.98] active:bg-matrix-green/20',
    // Disabled
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
  )}
  disabled={isLoading}
>
  {isLoading ? <Spinner /> : children}
</button>
```

## Input Interactions

### Text Input States

| State | Border | Background | Label |
|-------|--------|------------|-------|
| Default | matrix-green/30 | transparent | Above |
| Focus | matrix-green + glow | glass-bg | Scaled up |
| Filled | matrix-green/50 | transparent | Scaled up |
| Error | matrix-red + glow | red/5 | Red |
| Disabled | matrix-white/20 | gray/10 | Muted |

### Textarea Auto-grow

```tsx
const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const textarea = e.target;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
};
```

### Character Counter

```tsx
<div className="relative">
  <textarea maxLength={2000} value={value} onChange={handleChange} />
  <span
    className={cn(
      'absolute bottom-2 right-2 text-xs',
      value.length > 1800 && 'text-yellow-500',
      value.length > 1950 && 'text-matrix-red'
    )}
  >
    {value.length}/2000
  </span>
</div>
```

## Message Interactions

### Send Message Flow

```
User types → Character count updates
User hits Enter → Message appears instantly (optimistic)
API streaming starts → Thinking indicator shown
Chunks arrive → Text streams in character by character
Complete → Message finalized, citations appear
```

### Message Actions

| Action | Trigger | Feedback |
|--------|---------|----------|
| Copy | Click copy button | Button changes to checkmark for 2s |
| Regenerate | Click regenerate | Old message fades, new streams in |
| React | Thumbs up/down | Icon fills, toast confirmation |

### Streaming Animation

```tsx
// Character-by-character reveal
const [displayedText, setDisplayedText] = useState('');

useEffect(() => {
  let index = 0;
  const interval = setInterval(() => {
    if (index < fullText.length) {
      setDisplayedText(fullText.slice(0, index + 1));
      index++;
    } else {
      clearInterval(interval);
    }
  }, 10); // 10ms per character

  return () => clearInterval(interval);
}, [fullText]);
```

## Modal Interactions

### Open/Close

| Action | Animation | Duration |
|--------|-----------|----------|
| Open | Fade in + scale from 0.95 | 200ms |
| Close | Fade out + scale to 0.95 | 150ms |
| Backdrop | Fade in/out | 150ms |

### Focus Management

```tsx
const modalRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (isOpen) {
    // Save previous focus
    const previousFocus = document.activeElement;

    // Focus first focusable element
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable as HTMLElement)?.focus();

    return () => {
      // Restore focus on close
      (previousFocus as HTMLElement)?.focus();
    };
  }
}, [isOpen]);
```

### Escape to Close

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus message input |
| `Cmd/Ctrl + S` | Export chat |
| `Cmd/Ctrl + ,` | Open settings |
| `?` or `Cmd/Ctrl + /` | Show shortcuts overlay |
| `Escape` | Close modal/panel |

### Chat Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `↑` | Edit last message (when input empty) |
| `Cmd/Ctrl + ↑` | Scroll to top |
| `Cmd/Ctrl + ↓` | Scroll to bottom |

### Implementation

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;

    if (isMod && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
    }

    if (isMod && e.key === ',') {
      e.preventDefault();
      openSettings();
    }

    if (e.key === '?' && !isTyping) {
      e.preventDefault();
      showShortcuts();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isTyping]);
```

## Drag and Drop

### File Upload

| State | Visual |
|-------|--------|
| Idle | Upload zone with dashed border |
| Drag over | Border solid, background glow, scale 1.02 |
| Drop | File icon animates, progress bar starts |
| Processing | Spinner, percentage text |
| Complete | Checkmark, fade to document list |
| Error | Red border, shake animation, error text |

### Implementation

```tsx
const [isDragging, setIsDragging] = useState(false);

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(true);
};

const handleDragLeave = () => {
  setIsDragging(false);
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const files = Array.from(e.dataTransfer.files);
  handleFiles(files);
};

<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={cn(
    'border-2 border-dashed rounded-lg p-8 transition-all',
    isDragging
      ? 'border-matrix-green bg-matrix-green/10 scale-[1.02]'
      : 'border-matrix-green/30'
  )}
>
  {isDragging ? 'Drop files here' : 'Drag files or click to upload'}
</div>
```

## Toast Notifications

### Types

| Type | Icon | Color | Duration |
|------|------|-------|----------|
| Success | ✓ | matrix-green | 3s |
| Error | ✗ | matrix-red | 5s (or manual dismiss) |
| Info | ℹ | matrix-cyan | 4s |
| Warning | ⚠ | yellow | 4s |

### Animation

```css
/* Enter */
@keyframes toast-enter {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Exit */
@keyframes toast-exit {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
```

## Loading States

### Skeleton

```tsx
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'animate-pulse bg-matrix-green/10 rounded',
      className
    )}
  />
);

// Message skeleton
<div className="space-y-3">
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
  <Skeleton className="h-4 w-5/6" />
</div>
```

### Spinner

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

### Progress Bar

```tsx
<div className="h-1 bg-matrix-green/20 rounded-full overflow-hidden">
  <div
    className="h-full bg-matrix-green transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>
```

## Gesture Support (Mobile)

### Supported Gestures

| Gesture | Action |
|---------|--------|
| Swipe right | Open document drawer |
| Swipe left | Close document drawer |
| Pull down | Refresh (if at top) |
| Long press | Show message actions |
| Pinch | Zoom code blocks |

### Implementation

```tsx
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedRight: () => openDrawer(),
  onSwipedLeft: () => closeDrawer(),
  preventScrollOnSwipe: true,
  trackMouse: false,
});

<div {...handlers}>
  {/* Content */}
</div>
```

## Error Recovery

### Retry Pattern

```tsx
const [retryCount, setRetryCount] = useState(0);

const handleRetry = async () => {
  setRetryCount(c => c + 1);
  try {
    await sendMessage();
    setRetryCount(0);
  } catch (error) {
    if (retryCount < 3) {
      // Show retry button
    } else {
      // Show manual intervention needed
    }
  }
};
```

### Graceful Degradation

```tsx
{isOffline ? (
  <div className="text-center py-8">
    <OfflineIcon className="mx-auto mb-4" />
    <p>You're offline. Messages will send when you reconnect.</p>
  </div>
) : (
  <ChatInterface />
)}
```
