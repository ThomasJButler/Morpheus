'use client';

interface HeaderProps {
  onToggleDocs: () => void;
  onToggleSys: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onOpenUpload: () => void;
  onToggleDocStats: () => void;
  onSaveChat: () => void;
  onClearChat: () => void;
  docsOpen: boolean;
  sysOpen: boolean;
  canSave: boolean;
  canClear: boolean;
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
  onOpenGuide,
  onOpenSettings,
  onOpenUpload,
  onToggleDocStats,
  onSaveChat,
  onClearChat,
  docsOpen,
  sysOpen,
  canSave,
  canClear,
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
        {/* Desktop-only chat actions — mobile uses the in-chat toolbar
            (Upload / Docs visible, Save & Clear in overflow menu). */}
        <span className="hidden md:contents">
          <HeaderIconButton label="Upload document" onClick={onOpenUpload}>
            <IconUpload />
          </HeaderIconButton>
          <HeaderIconButton label="Show document statistics" onClick={onToggleDocStats}>
            <IconDocs />
          </HeaderIconButton>
          <HeaderIconButton label="Save chat" onClick={onSaveChat} disabled={!canSave}>
            <IconDownload />
          </HeaderIconButton>
          <HeaderIconButton label="Clear conversation" onClick={onClearChat} disabled={!canClear}>
            <IconTrash />
          </HeaderIconButton>
        </span>
        <HeaderIconButton label="Guide" onClick={onOpenGuide}>
          <IconHelp />
        </HeaderIconButton>
        <HeaderIconButton label="Settings" onClick={onOpenSettings}>
          <IconSettings />
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

function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconDocs() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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
