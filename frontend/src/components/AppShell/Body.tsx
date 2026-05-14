'use client';

import ChatInterface from '@/components/Chat/ChatInterface';
import DocsSidebar from '@/components/Docs/DocsSidebar';
import SystemPanel from '@/components/System/SystemPanel';

interface BodyProps {
  /** Whether the docs rail is shown as an open mobile drawer (below 920px). */
  docsMobileOpen: boolean;
  /** Whether the system rail is shown as an open mobile drawer (below 920px). */
  sysMobileOpen: boolean;
  /** Called by the rails on swipe-to-close. */
  onCloseDrawer: () => void;
}

/**
 * v2 AppShell body — three-pane grid (docs rail · chat · system rail).
 * Above 920px the rails are static side panels. Below that they become
 * fixed drawers; the open state is owned by AppShell and passed in here so
 * the rails (which already render their own content) just need a single
 * `mobileOpen` prop to toggle their `is-open` class and a close callback
 * for the swipe gesture.
 */
export default function Body({
  docsMobileOpen,
  sysMobileOpen,
  onCloseDrawer,
}: BodyProps) {
  return (
    <div className="app-body relative z-10">
      <DocsSidebar mobileOpen={docsMobileOpen} onMobileClose={onCloseDrawer} />

      <main className="chat-col">
        <div className="chat-col__messages">
          <ChatInterface fillParent />
        </div>
      </main>

      <SystemPanel mobileOpen={sysMobileOpen} onMobileClose={onCloseDrawer} />
    </div>
  );
}
