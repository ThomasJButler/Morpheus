'use client';

import MatrixRain from '@/components/UI/MatrixRain';
import Header from './Header';
import Body from './Body';

interface AppShellProps {
  showMatrixRain?: boolean;
}

export default function AppShell({ showMatrixRain = false }: AppShellProps) {
  return (
    <div className="app-shell relative">
      {showMatrixRain && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
          <MatrixRain />
        </div>
      )}
      <Header />
      <Body />
    </div>
  );
}
