/**
 * Oracle Primavera Analysis Module
 * Página principal del módulo de análisis
 */

import { Metadata } from 'next';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { PrimaveraDashboard } from '@/components/PrimaveraDashboard';

export const metadata: Metadata = {
  title: 'Análisis Oracle Primavera | CyberEngineer Nexus',
  description: 'Importa y analiza proyectos de Oracle Primavera con autorización ROOT',
};

export default function PrimaveraPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <div className="flex-1 overflow-auto">
          <PrimaveraDashboard />
        </div>
      </main>
    </div>
  );
}
