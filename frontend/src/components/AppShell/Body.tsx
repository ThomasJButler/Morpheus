'use client';

import ChatInterface from '@/components/Chat/ChatInterface';

/**
 * v2 AppShell body — three-pane grid (docs rail · chat · system rail).
 * Phase 1 scope: placeholder rails plus the existing <ChatInterface>
 * dropped into chat-col__messages via the new `fillParent` prop.
 * Real sidebar (Phase 4) and system panel (Phase 5) replace the
 * placeholders without changing this grid.
 */
export default function Body() {
  return (
    <div className="app-body relative z-10">
      <aside
        className="docs-rail"
        aria-label="Constructs (documents) — coming in Phase 4"
      >
        <RailPlaceholder
          title="CONSTRUCTS"
          subtitle="Document sidebar"
          phase="Phase 4"
        />
      </aside>

      <main className="chat-col">
        <div className="chat-col__messages">
          <ChatInterface fillParent />
        </div>
      </main>

      <aside
        className="sys-rail"
        aria-label="System panel — coming in Phase 5"
      >
        <RailPlaceholder
          title="SYSTEM"
          subtitle="Status · Sources · System"
          phase="Phase 5"
        />
      </aside>
    </div>
  );
}

interface RailPlaceholderProps {
  title: string;
  subtitle: string;
  phase: string;
}

function RailPlaceholder({ title, subtitle, phase }: RailPlaceholderProps) {
  return (
    <div className="p-4 flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full bg-accent"
          style={{ boxShadow: '0 0 8px var(--accent)' }}
        />
        <span className="font-mono text-[11px] tracking-[0.2em] text-fg-muted">
          {title}
        </span>
      </header>
      <p className="font-geist text-sm text-fg-secondary leading-snug">
        {subtitle}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-fg-faint">
        {phase} placeholder
      </p>
    </div>
  );
}
