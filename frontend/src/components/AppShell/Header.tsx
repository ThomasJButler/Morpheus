'use client';

/**
 * v2 AppShell header — sticky, compact, 56px tall.
 * Phase 1 scope: branding row + GitHub link + placeholder icon buttons.
 * Real interactions (docs/system drawer toggles, settings modal) wire up
 * in Phases 4 / 5 / 6.
 */
export default function Header() {
  return (
    <header
      className="
        relative z-10
        flex items-center justify-between gap-3
        px-4 sm:px-6
        border-b border-edge-subtle
        bg-surface-elev/80 backdrop-blur-sm
      "
      style={{ height: 'var(--header-h)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="font-mono text-base sm:text-lg font-bold tracking-wide text-accent"
          aria-label="Morpheus"
        >
          MORPHEUS
        </span>
        <span className="hidden sm:inline text-edge-strong">·</span>
        <span className="hidden sm:inline font-geist text-xs uppercase tracking-[0.18em] text-fg-muted truncate">
          AI-powered Document Intelligence
        </span>
      </div>

      {/* Action cluster */}
      <div className="flex items-center gap-1.5">
        <HeaderIconButton label="Toggle constructs" disabled title="Docs sidebar (Phase 4)">
          <IconLibrary />
        </HeaderIconButton>
        <HeaderIconButton label="Toggle system panel" disabled title="System panel (Phase 5)">
          <IconActivity />
        </HeaderIconButton>
        <HeaderIconButton label="Settings" disabled title="Settings (Phase 6)">
          <IconSettings />
        </HeaderIconButton>
        <a
          href="https://github.com/ThomasJButler/Morpheus"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          className="
            inline-flex items-center justify-center
            w-9 h-9 rounded-v2-sm
            border border-edge-subtle text-fg-muted
            hover:text-accent hover:border-accent/50 hover:bg-surface-card-hover
            transition-colors
          "
        >
          <IconGithub />
        </a>
      </div>
    </header>
  );
}

interface HeaderIconButtonProps {
  label: string;
  title?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function HeaderIconButton({ label, title, disabled, children }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      className="
        inline-flex items-center justify-center
        w-9 h-9 rounded-v2-sm
        border border-transparent text-fg-muted
        hover:text-accent hover:bg-surface-card-hover
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-fg-muted disabled:hover:bg-transparent
        transition-colors
      "
    >
      {children}
    </button>
  );
}

/* Inline icon glyphs — kept local for Phase 1; Phase 4+ may migrate to
   lucide-react if we adopt it for the sidebar / system panel. */

function IconLibrary() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5h6v14H3zM10 5h4v14h-4zM15 7l4-1 3 13-4 1z" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}
