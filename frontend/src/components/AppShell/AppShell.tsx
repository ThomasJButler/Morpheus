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

  // Bridge header → ChatInterface modal triggers via CustomEvents so we don't
  // have to prop-drill through Body. ChatInterface listens with useEffect.
  const openGuide = useCallback(
    () => window.dispatchEvent(new CustomEvent('morpheus:open-guide')),
    [],
  );
  const openSettings = useCallback(
    () => window.dispatchEvent(new CustomEvent('morpheus:open-settings')),
    [],
  );

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
