'use client';

import ChatInterface from '@/components/Chat/ChatInterface';
import DocsSidebar from '@/components/Docs/DocsSidebar';
import SystemPanel from '@/components/System/SystemPanel';

/**
 * v2 AppShell body — three-pane grid (docs rail · chat · system rail).
 * Phase 4 wired the docs rail; Phase 5 wires the system rail. <ChatInterface>
 * remains embedded with `fillParent` to honour the chat-col height
 * constraints from Phase 1.
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

      <SystemPanel />
    </div>
  );
}
