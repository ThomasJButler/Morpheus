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

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const toggleDocs = useCallback(
    () => setDrawer((d) => (d === 'docs' ? null : 'docs')),
    [],
  );
  const toggleSys = useCallback(
    () => setDrawer((d) => (d === 'sys' ? null : 'sys')),
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
        docsOpen={drawer === 'docs'}
        sysOpen={drawer === 'sys'}
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
