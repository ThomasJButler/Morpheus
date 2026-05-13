'use client';

export interface EmptyStateProps {
  onSelectPrompt: (text: string) => void;
}

const QUICK_PROMPTS = [
  'What is this document about?',
  'Summarize the key points',
  'Find references to…',
];

const STEPS: Array<{ n: number; verb: string; rest: string; meta: string }> = [
  { n: 1, verb: 'Upload',   rest: 'your documents', meta: 'PDF · DOCX · TXT · MD' },
  { n: 2, verb: 'Ask',      rest: 'questions',      meta: 'Natural language queries' },
  { n: 3, verb: 'Get',      rest: 'cited answers',  meta: 'With source references' },
];

export default function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label="Welcome — start a conversation"
      className="flex-1 min-h-0 grid px-4 py-8 overflow-y-auto"
      style={{ alignContent: 'safe center', justifyItems: 'center' }}
    >
      <div className="max-w-2xl w-full flex flex-col items-center gap-6 sm:gap-8 text-center">
        {/* Soft accent logo */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-v2-lg border border-edge-default bg-surface-card flex items-center justify-center shadow-glow-md">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Matrix quote */}
        <p className="font-mono text-sm sm:text-base italic text-fg-secondary leading-relaxed">
          &ldquo;I can only show you the door. You&apos;re the one that has to walk through it.&rdquo;
        </p>

        {/* Step cards */}
        <ol className="hidden sm:grid sm:grid-cols-3 gap-3 w-full text-left">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="
                p-4 rounded-v2-md
                bg-surface-card border border-edge-subtle
                hover:bg-surface-card-hover hover:border-edge-default
                transition-colors
              "
            >
              <div className="w-6 h-6 mb-2 rounded-full border border-edge-default flex items-center justify-center font-mono text-[11px] text-accent">
                {s.n}
              </div>
              <p className="font-geist text-sm text-fg-primary">
                <span className="text-accent font-medium">{s.verb}</span> {s.rest}
              </p>
              <p className="font-mono text-[10px] text-fg-muted mt-1 tracking-wide uppercase">
                {s.meta}
              </p>
            </li>
          ))}
        </ol>

        {/* Quick prompts */}
        <div className="w-full flex flex-col items-center gap-2">
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
                  px-3 py-1.5 rounded-full
                  font-mono text-xs
                  bg-surface-card border border-edge-default text-fg-secondary
                  hover:border-accent/60 hover:bg-surface-card-hover hover:text-fg-primary
                  transition-colors
                "
              >
                &ldquo;{text}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Keyboard hints (desktop only) */}
        <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-fg-faint">
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
