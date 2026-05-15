'use client';

interface HeaderProps {
  onToggleDocs: () => void;
  onToggleSys: () => void;
  docsOpen: boolean;
  sysOpen: boolean;
}

/**
 * v2 AppShell header — sticky, compact, 56px tall.
 * Phase 7 wires the docs / system toggle buttons to drawer state owned by
 * AppShell. Settings stays disabled here — it's owned by ChatInterface's
 * toolbar (Phase 6). aria-controls + aria-expanded reflect the live drawer
 * state so assistive tech announces it correctly.
 */
export default function Header({
  onToggleDocs,
  onToggleSys,
  docsOpen,
  sysOpen,
}: HeaderProps) {
  return (
    <header
      className="
        relative z-30
        flex items-center justify-between gap-3
        px-4 sm:px-6
        border-b border-edge-subtle
        bg-surface-elev/80 backdrop-blur-sm
      "
      style={{ height: 'var(--header-h)' }}
    >
      {/* Brand — stacked: name over tagline, visible at all widths */}
      <div className="flex flex-col leading-tight min-w-0" aria-label="Morpheus · AI Document Intelligence">
        <span className="font-mono text-base sm:text-lg font-bold tracking-wide text-accent">
          MORPHEUS
        </span>
        <span className="font-geist text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-fg-muted truncate">
          AI · Document Intelligence
        </span>
      </div>

      {/* Action cluster */}
      <div className="flex items-center gap-1.5">
        <HeaderIconButton
          label={docsOpen ? 'Close constructs' : 'Open constructs'}
          onClick={onToggleDocs}
          aria-controls="docs-rail"
          aria-expanded={docsOpen}
          active={docsOpen}
        >
          <IconLibrary />
        </HeaderIconButton>
        <HeaderIconButton
          label={sysOpen ? 'Close system panel' : 'Open system panel'}
          onClick={onToggleSys}
          aria-controls="sys-rail"
          aria-expanded={sysOpen}
          active={sysOpen}
        >
          <IconActivity />
        </HeaderIconButton>
        <a
          href="https://github.com/ThomasJButler/Morpheus"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          className="
            inline-flex items-center justify-center
            w-11 h-11 rounded-v2-sm
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
  active?: boolean;
  onClick?: () => void;
  'aria-controls'?: string;
  'aria-expanded'?: boolean;
  children: React.ReactNode;
}

function HeaderIconButton({
  label,
  title,
  disabled,
  active,
  onClick,
  'aria-controls': ariaControls,
  'aria-expanded': ariaExpanded,
  children,
}: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      className={`
        inline-flex items-center justify-center
        w-11 h-11 rounded-v2-sm
        border transition-colors
        ${active
          ? 'border-accent/50 text-accent bg-accent/10'
          : 'border-edge-subtle text-fg-muted hover:text-accent hover:border-accent/50 hover:bg-surface-card-hover'}
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-fg-muted disabled:hover:bg-transparent
      `}
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

function IconGithub() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}
