/**
 * Primavera Stats
 * Muestra estadísticas del análisis
 */

'use client';

import React from 'react';
import { BarChart, Calendar, Zap, Layers, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PrimaveraAnalysis } from '@/lib/primavera-types';
import { cn } from '@/lib/utils';

interface Props {
  analysis: PrimaveraAnalysis;
}

export function PrimaveraStats({ analysis }: Props) {
  const percentComplete = Math.round(
    (analysis.tasks.reduce((sum, t) => sum + t.percentComplete, 0) /
      analysis.tasks.length) *
      100
  ) || 0;

  const stats = [
    {
      icon: BarChart,
      label: 'Total de Tareas',
      value: analysis.totalTasks.toLocaleString(),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Target,
      label: 'Ruta Crítica',
      value: `${analysis.criticalPathTasks.length}/${analysis.totalTasks}`,
      subValue: ` (${analysis.criticalPathDuration} días)`,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: Zap,
      label: 'Progreso Global',
      value: `${percentComplete}%`,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Layers,
      label: 'Frentes de Trabajo',
      value: analysis.frontOfWorks.length.toString(),
      subValue: ` áreas WBS (${analysis.areas.length})`,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Calendar,
      label: 'Importado',
      value: analysis.importDate.toLocaleDateString('es-ES'),
      subValue: ` - ${analysis.fileName}`,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card
            key={idx}
            className="overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-4 space-y-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  stat.bgColor
                )}
              >
                <Icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-foreground/60 font-medium">
                  {stat.label}
                </p>
                <p className="text-lg font-bold">
                  {stat.value}
                  {stat.subValue && (
                    <span className="text-xs text-foreground/60 font-normal">
                      {stat.subValue}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
