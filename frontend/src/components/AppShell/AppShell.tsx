'use client';

import { useState, useCallback, useEffect } from 'react';
import MatrixRain from '@/components/UI/MatrixRain';
import { DRAWER_BREAKPOINT_PX } from '@/lib/breakpoints';
import Header from './Header';
import Body from './Body';
import ColdStart from './ColdStart';
import MobileScrim from './MobileScrim';

interface AppShellProps {
  showMatrixRain?: boolean;
}

type MobileDrawer = 'docs' | 'sys' | null;

export default function AppShell({ showMatrixRain = false }: AppShellProps) {
  const [drawer, setDrawer] = useState<MobileDrawer>(null);
  // Desktop-only: persistent collapse state for the two rails. Below the
  // drawer breakpoint we rely on `drawer` (slide-over pattern); above it
  // these flags drive --rail-w-docs/--rail-w-sys to fold the column flush.
  const [docsCollapsed, setDocsCollapsed] = useState(false);
  const [sysCollapsed, setSysCollapsed] = useState(false);

  const isDesktop = () =>
    typeof window !== 'undefined' && window.innerWidth > DRAWER_BREAKPOINT_PX;

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const toggleDocs = useCallback(() => {
    if (isDesktop()) {
      setDocsCollapsed((c) => !c);
    } else {
      setDrawer((d) => (d === 'docs' ? null : 'docs'));
    }
  }, []);
  const toggleSys = useCallback(() => {
    if (isDesktop()) {
      setSysCollapsed((c) => !c);
    } else {
      setDrawer((d) => (d === 'sys' ? null : 'sys'));
    }
  }, []);

  // Write the per-rail width vars onto .app-shell so the grid responds.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.app-shell');
    if (!el) return;
    el.style.setProperty('--rail-w-docs', docsCollapsed ? '0px' : 'var(--rail-w)');
    el.style.setProperty('--rail-w-sys', sysCollapsed ? '0px' : 'var(--rail-w)');
  }, [docsCollapsed, sysCollapsed]);

  // Bridge header → ChatInterface action triggers via CustomEvents so we don't
  // have to prop-drill through Body. ChatInterface (and UploadButton) listen
  // with useEffect. Subscribe to message-count broadcasts so the header can
  // dim Save/Clear when there's nothing to act on.
  const [hasMessages, setHasMessages] = useState(false);
  useEffect(() => {
    const onCount = (e: Event) => {
      const n = (e as CustomEvent<{ count: number }>).detail?.count ?? 0;
      setHasMessages(n > 0);
    };
    window.addEventListener('morpheus:messages-count', onCount as EventListener);
    return () => window.removeEventListener('morpheus:messages-count', onCount as EventListener);
  }, []);

  const dispatch = (name: string) =>
    window.dispatchEvent(new CustomEvent(name));
  const openGuide = useCallback(() => dispatch('morpheus:open-guide'), []);
  const openSettings = useCallback(() => dispatch('morpheus:open-settings'), []);
  const openUpload = useCallback(() => dispatch('morpheus:open-upload'), []);
  const toggleDocStats = useCallback(() => dispatch('morpheus:toggle-doc-stats'), []);
  const saveChat = useCallback(() => dispatch('morpheus:save-chat'), []);
  const clearChat = useCallback(() => dispatch('morpheus:clear-chat'), []);

  // The rail headers also need to be able to toggle collapse from inside the
  // rail (more discoverable than the header icons alone). Same CustomEvent
  // pattern — DocsSidebar / SystemPanel dispatch, AppShell listens.
  useEffect(() => {
    const onDocs = () => toggleDocs();
    const onSys = () => toggleSys();
    window.addEventListener('morpheus:toggle-docs', onDocs);
    window.addEventListener('morpheus:toggle-sys', onSys);
    return () => {
      window.removeEventListener('morpheus:toggle-docs', onDocs);
      window.removeEventListener('morpheus:toggle-sys', onSys);
    };
  }, [toggleDocs, toggleSys]);

  // Close any open drawer when the viewport grows past the mobile breakpoint;
  // otherwise the drawer state stays "open" silently and re-appears on the
  // next resize down. Matches the CSS breakpoint at 920px in globals.css.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > DRAWER_BREAKPOINT_PX) setDrawer(null);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Escape closes the open drawer (matches the Modal pattern).
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setDrawer(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  // Lock body scroll while the drawer is open (mirrors Modal.tsx).
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  return (
    <div className="app-shell relative">
      {showMatrixRain && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
          <MatrixRain />
        </div>
      )}
      <Header
        onToggleDocs={toggleDocs}
        onToggleSys={toggleSys}
        onOpenGuide={openGuide}
        onOpenSettings={openSettings}
        onOpenUpload={openUpload}
        onToggleDocStats={toggleDocStats}
        onSaveChat={saveChat}
        onClearChat={clearChat}
        canSave={hasMessages}
        canClear={hasMessages}
        docsOpen={drawer === 'docs' || (!docsCollapsed && typeof window !== 'undefined' && window.innerWidth > DRAWER_BREAKPOINT_PX)}
        sysOpen={drawer === 'sys' || (!sysCollapsed && typeof window !== 'undefined' && window.innerWidth > DRAWER_BREAKPOINT_PX)}
      />
      <Body
        docsMobileOpen={drawer === 'docs'}
        sysMobileOpen={drawer === 'sys'}
        onCloseDrawer={closeDrawer}
      />
      <MobileScrim open={drawer !== null} onClose={closeDrawer} />
      <ColdStart />
    </div>
  );
}
