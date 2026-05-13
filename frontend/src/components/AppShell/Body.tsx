'use client';

import ChatInterface from '@/components/Chat/ChatInterface';
import DocsSidebar from '@/components/Docs/DocsSidebar';

/**
 * v2 AppShell body — three-pane grid (docs rail · chat · system rail).
 * Phase 4 swaps the docs-rail placeholder for the real <DocsSidebar />,
 * which owns its own fetch + collapse + upload-modal state. The
 * system-rail placeholder lands in Phase 5; <ChatInterface> remains
 * embedded with `fillParent` to honour the chat-col height constraints.
 */
export default function Body() {
  return (
    <div className="app-body relative z-10">
      <DocsSidebar />

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
