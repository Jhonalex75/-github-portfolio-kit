/**
 * Primavera Task Grid
 * Grid virtualizado para mostrar miles de tareas sin lag
 * Utiliza virtualización para mantener solo los items visibles en DOM
 */

'use client';

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PrimaveraAnalysis, FilterOptions, PrimaveraTask } from '@/lib/primavera-types';
import { cn } from '@/lib/utils';

interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  startOffset: number;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 15;

interface Props {
  analysis: PrimaveraAnalysis;
  filters: FilterOptions;
}

export function PrimaveraTaskGrid({ analysis, filters }: Props) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [virtualWindow, setVirtualWindow] = useState<VirtualWindow>({
    startIndex: 0,
    endIndex: VISIBLE_ITEMS,
    startOffset: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrar y ordenar tareas
  const filteredTasks = useMemo(() => {
    let tasks = [...analysis.tasks];

    // Filtro por ruta crítica
    if (filters.isCriticalPath) {
      tasks = tasks.filter((t) => t.isOnCriticalPath);
    }

    // Filtro por frentes de trabajo
    if (filters.frontOfWork && filters.frontOfWork.length > 0) {
      tasks = tasks.filter((t) => filters.frontOfWork!.includes(t.frontOfWork));
    }

    // Filtro por búsqueda
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.id.toLowerCase().includes(searchLower) ||
          t.name.toLowerCase().includes(searchLower) ||
          t.area.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por WBS y start date
    tasks.sort((a, b) => {
      const wbsCompare = a.wbs.localeCompare(b.wbs);
      if (wbsCompare !== 0) return wbsCompare;
      return a.startDate.getTime() - b.startDate.getTime();
    });

    return tasks;
  }, [analysis.tasks, filters]);

  // Manejar scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    const endIndex = Math.min(
      startIndex + VISIBLE_ITEMS + 5,
      filteredTasks.length
    );

    setVirtualWindow({
      startIndex,
      endIndex,
      startOffset: startIndex * ITEM_HEIGHT,
    });
  }, [filteredTasks.length]);

  // Elementos visibles
  const visibleTasks = useMemo(() => {
    return filteredTasks.slice(virtualWindow.startIndex, virtualWindow.endIndex);
  }, [filteredTasks, virtualWindow]);

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="space-y-2 border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Tareas ({filteredTasks.length})</h3>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Virtualizado
          </Badge>
        </div>
        <p className="text-xs text-foreground/60">
          Mostrando {visibleTasks.length} de {filteredTasks.length} tareas
        </p>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-8 text-foreground/60">
          <AlertCircle className="h-4 w-4" />
          <p>No hay tareas que coincidan con los filtros</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="max-h-96 overflow-y-auto overflow-x-auto bg-background/50"
        >
          {/* Spacer top */}
          <div style={{ height: virtualWindow.startOffset }} />

          {/* Task Rows */}
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-primary/5">
              <tr>
                <th className="border-b px-3 py-2 text-left font-semibold w-8">
                  •
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold w-32">
                  ID
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold flex-1">
                  Nombre
                </th>
                <th className="border-b px-3 py-2 text-center font-semibold w-12">
                  %
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold w-24">
                  Inicio
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold w-24">
                  Fin
                </th>
                <th className="border-b px-3 py-2 text-center font-semibold w-12">
                  Días
                </th>
                <th className="border-b px-3 py-2 text-left font-semibold w-24">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task, idx) => (
                <tr
                  key={task.id}
                  className={cn(
                    'border-b hover:bg-primary/5 transition-colors',
                    task.isOnCriticalPath && 'bg-destructive/5',
                    idx % 2 === 0 && 'bg-background/30'
                  )}
                  style={{ height: ITEM_HEIGHT }}
                >
                  {/* Expand Toggle */}
                  <td className="px-2 py-0 text-center">
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="h-6 w-6 flex items-center justify-center hover:bg-primary/20 rounded"
                    >
                      {task.predecessors.length > 0 ? (
                        expandedTasks.has(task.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )
                      ) : null}
                    </button>
                  </td>

                  {/* ID */}
                  <td className="px-3 py-0 text-left font-mono text-primary truncate">
                    {task.id}
                  </td>

                  {/* Name */}
                  <td className="px-3 py-0 text-left truncate max-w-md">
                    {task.name}
                  </td>

                  {/* Progress */}
                  <td className="px-3 py-0 text-center font-semibold">
                    {Math.round(task.percentComplete)}%
                  </td>

                  {/* Start Date */}
                  <td className="px-3 py-0 text-left text-xs">
                    {formatDate(task.startDate)}
                  </td>

                  {/* End Date */}
                  <td className="px-3 py-0 text-left text-xs">
                    {formatDate(task.endDate)}
                  </td>

                  {/* Duration */}
                  <td className="px-3 py-0 text-center">
                    <span className="px-2 py-1 rounded bg-primary/10">
                      {Math.round(task.duration)}d
                    </span>
                  </td>

                  {/* Status Badges */}
                  <td className="px-3 py-0 text-left">
                    <div className="flex gap-1 flex-wrap">
                      {task.isOnCriticalPath && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] h-5"
                        >
                          Crítica
                        </Badge>
                      )}
                      {task.percentComplete === 100 && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-5"
                        >
                          ✓
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Spacer bottom */}
          <div
            style={{
              height: Math.max(
                0,
                (filteredTasks.length - virtualWindow.endIndex) * ITEM_HEIGHT
              ),
            }}
          />
        </div>
      )}
    </Card>
  );
}
