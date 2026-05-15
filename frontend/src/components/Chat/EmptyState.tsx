'use client';

export interface EmptyStateProps {
  onSelectPrompt: (text: string) => void;
}

const QUICK_PROMPTS = [
  'What is this document about?',
  'Summarise the key points',
  'Find references to…',
];

const STEPS: Array<{ n: number; verb: string; rest: string; meta: string }> = [
  { n: 1, verb: 'Upload', rest: 'your documents', meta: 'PDF · DOCX · TXT · MD' },
  { n: 2, verb: 'Ask',    rest: 'questions',      meta: 'Natural language queries' },
  { n: 3, verb: 'Get',    rest: 'cited answers',  meta: 'With source references' },
];

export default function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label="Welcome — start a conversation"
      className="flex-1 min-h-0 grid px-4 py-8 overflow-y-auto"
      style={{ alignContent: 'safe center', justifyItems: 'center' }}
    >
      <div className="max-w-[680px] w-full flex flex-col items-center gap-8 sm:gap-10 text-center">
        {/* Terminal glyph — Matrix-themed, less generic than the monitor */}
        <div
          className="
            relative w-14 h-14 sm:w-16 sm:h-16
            rounded-v2-md border border-accent/40
            bg-surface-card
            flex items-center justify-center
            shadow-glow-sm
          "
          aria-hidden
        >
          <span className="font-mono text-lg sm:text-xl font-bold text-accent leading-none">
            &gt;_
          </span>
          {/* Pulsing dot for "live cursor" — subtle in light, brighter in dark */}
          <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        </div>

        {/* Quote — display weight, decorative quote mark */}
        <figure className="max-w-md">
          <span
            aria-hidden
            className="block font-mono text-3xl leading-none text-accent/30 -mb-2"
          >
            &ldquo;
          </span>
          <blockquote className="font-geist text-[15px] sm:text-base text-fg-secondary leading-relaxed">
            I can only show you the door. You&apos;re the one that has to walk through it.
          </blockquote>
        </figure>

        {/* Step cards — bigger numerals, hover lift, dotted connector on desktop */}
        <ol className="hidden sm:grid sm:grid-cols-3 gap-3 w-full text-left relative">
          {/* Connector line between cards (decorative) */}
          <span
            aria-hidden
            className="
              absolute top-7 left-[12%] right-[12%] h-px
              bg-gradient-to-r from-transparent via-edge-default to-transparent
              pointer-events-none
            "
          />
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="
                relative p-4 rounded-v2-md
                bg-surface-card border border-edge-subtle
                hover:bg-surface-card-hover hover:border-accent/40
                hover:-translate-y-0.5
                transition-all
              "
            >
              <div
                className="
                  w-7 h-7 mb-3
                  rounded-full border border-accent/50 bg-bg-base
                  flex items-center justify-center
                  font-mono text-[13px] font-bold text-accent
                  relative z-10
                "
              >
                {s.n}
              </div>
              <p className="font-geist text-[14px] text-fg-primary">
                <span className="text-accent font-semibold">{s.verb}</span> {s.rest}
              </p>
              <p className="font-mono text-[10px] text-fg-muted mt-1.5 tracking-wide uppercase">
                {s.meta}
              </p>
            </li>
          ))}
        </ol>

        {/* Quick prompts */}
        <div className="w-full flex flex-col items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted">
            Quick prompts
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_PROMPTS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => onSelectPrompt(text)}
                className="
                  px-3.5 py-2 rounded-full
                  font-mono text-xs
                  bg-surface-card border border-accent/30 text-fg-secondary
                  hover:border-accent/70 hover:bg-accent/5 hover:text-fg-primary
                  active:scale-[0.98]
                  transition-all
                "
              >
                &ldquo;{text}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard hints (desktop only) */}
        <div className="hidden sm:flex items-center gap-4 font-mono text-[10px] text-fg-faint">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-edge-subtle bg-surface-card text-fg-secondary">⌘K</kbd>
            focus
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-edge-subtle bg-surface-card text-fg-secondary">⏎</kbd>
            send
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded border border-edge-subtle bg-surface-card text-fg-secondary">Esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
