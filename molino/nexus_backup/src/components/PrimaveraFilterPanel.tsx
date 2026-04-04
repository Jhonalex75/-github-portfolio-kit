/**
 * Primavera Filter Panel
 * Panel de filtros para análisis de tareas
 */

'use client';

import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PrimaveraAnalysis, FilterOptions } from '@/lib/primavera-types';

interface Props {
  analysis: PrimaveraAnalysis;
  onFilterChange: (filters: FilterOptions) => void;
}

export function PrimaveraFilterPanel({ analysis, onFilterChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchText, setSearchText] = useState('');

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    onFilterChange({
      ...newFilters,
      searchText: searchText || undefined,
    });
  };

  const handleAddFrontFilter = (front: string) => {
    const newFronts = filters.frontOfWork || [];
    if (!newFronts.includes(front)) {
      handleFilterChange({
        ...filters,
        frontOfWork: [...newFronts, front],
      });
    }
  };

  const handleRemoveFrontFilter = (front: string) => {
    handleFilterChange({
      ...filters,
      frontOfWork: filters.frontOfWork?.filter((f) => f !== front),
    });
  };

  const handleToggleCriticalPath = () => {
    handleFilterChange({
      ...filters,
      isCriticalPath: !filters.isCriticalPath,
    });
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onFilterChange({
      ...filters,
      searchText: text || undefined,
    });
  };

  const activeFilterCount =
    (filters.frontOfWork?.length || 0) +
    (filters.isCriticalPath ? 1 : 0) +
    (searchText ? 1 : 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Ocultar' : 'Mostrar'}
        </Button>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar en tareas</label>
            <Input
              placeholder="ID, nombre..."
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8"
            />
          </div>

          {/* Critical Path */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ruta Crítica</label>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filters.isCriticalPath || false}
                onCheckedChange={handleToggleCriticalPath}
                id="critical-path"
              />
              <label
                htmlFor="critical-path"
                className="text-sm cursor-pointer flex-1"
              >
                Mostrar solo ruta crítica ({analysis.criticalPathTasks.length} tareas)
              </label>
            </div>
          </div>

          {/* Front of Work */}
          {analysis.frontOfWorks.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Frentes de Trabajo</label>
              <div className="space-y-2">
                {analysis.frontOfWorks.map((front) => (
                  <div key={front} className="flex items-center gap-2">
                    <Checkbox
                      checked={filters.frontOfWork?.includes(front) || false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleAddFrontFilter(front);
                        } else {
                          handleRemoveFrontFilter(front);
                        }
                      }}
                      id={`front-${front}`}
                    />
                    <label
                      htmlFor={`front-${front}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {front}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas */}
          {analysis.areas.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Áreas WBS</label>
              <div className="flex flex-wrap gap-2">
                {analysis.areas.slice(0, 10).map((area) => (
                  <Badge key={area} variant="outline">
                    {area}
                  </Badge>
                ))}
                {analysis.areas.length > 10 && (
                  <Badge variant="outline">+{analysis.areas.length - 10}</Badge>
                )}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({});
                setSearchText('');
                onFilterChange({});
              }}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar filtros
            </Button>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-primary/5 p-3 text-xs">
            <div>
              <p className="text-foreground/60">Total de tareas</p>
              <p className="font-semibold">{analysis.totalTasks}</p>
            </div>
            <div>
              <p className="text-foreground/60">Ruta crítica</p>
              <p className="font-semibold">{analysis.criticalPathDuration}d</p>
            </div>
            <div>
              <p className="text-foreground/60">Frentes</p>
              <p className="font-semibold">{analysis.frontOfWorks.length}</p>
            </div>
            <div>
              <p className="text-foreground/60">Áreas</p>
              <p className="font-semibold">{analysis.areas.length}</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
