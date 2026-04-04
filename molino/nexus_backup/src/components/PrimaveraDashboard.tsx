/**
 * Primavera Analysis Dashboard
 * Componente principal del módulo de análisis
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Filter, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/firebase';
import { logger } from '@/lib/logger';
import { PrimaveraAnalysis, FilterOptions } from '@/lib/primavera-types';
import { parsePrimaveraFile } from '@/lib/primavera-parser';
import { PrimaveraFilterPanel } from './PrimaveraFilterPanel';
import { PrimaveraTaskGrid } from './PrimaveraTaskGrid';
import { PrimaveraStats } from './PrimaveraStats';

export function PrimaveraDashboard() {
  const { user } = useUser();
  const [analysis, setAnalysis] = useState<PrimaveraAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});

  // Verificar que sea ROOT
  const isROOT = user?.email === 'jhonalexandervm@outlook.com' || 
                 user?.email === 'jhonalexanderv@gmail.com';

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);

      try {
        logger.log(`Uploading Primavera file: ${file.name}`, 'PrimaveraDashboard');

        const result = await parsePrimaveraFile(file);
        setAnalysis(result);

        logger.log(
          `Successfully loaded ${result.totalTasks} tasks`,
          'PrimaveraDashboard'
        );
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Error al cargar el archivo';
        setError(errorMsg);

        logger.error(
          'Error uploading Primavera file',
          err instanceof Error ? err : new Error(String(err)),
          'PrimaveraDashboard'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleExport = useCallback(() => {
    if (!analysis?.tasks) return;

    logger.log('Exporting analysis data', 'PrimaveraDashboard');

    // Export as JSON
    const json = JSON.stringify(analysis, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `primavera-analysis-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis]);

  if (!isROOT) {
    return (
      <div className="w-full p-6">
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este módulo requiere privilegios de autoridad ROOT para acceder.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Análisis Oracle Primavera</h1>
        <p className="text-foreground/70">
          Importa y analiza proyectos de Oracle Primavera con acceso ROOT
        </p>
      </div>

      {/* Upload Section */}
      {!analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Importar Archivo</CardTitle>
            <CardDescription>Carga un archivo Excel de Oracle Primavera</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-primary/20 p-8">
              <Upload className="h-12 w-12 text-primary/40" />
              <div className="text-center">
                <p className="font-medium">Selecciona un archivo Excel</p>
                <p className="text-sm text-foreground/60">
                  .xlsx, .xls - Hasta 50MB
                </p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="hidden"
                id="excel-upload"
              />
              <Button
                asChild
                variant="outline"
                disabled={isLoading}
                onClick={() => document.getElementById('excel-upload')?.click()}
              >
                <label className="cursor-pointer" htmlFor="excel-upload">
                  {isLoading ? 'Cargando...' : 'Seleccionar archivo'}
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis View */}
      {analysis && (
        <>
          {/* Stats Overview */}
          <PrimaveraStats analysis={analysis} />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAnalysis(null);
                setFilters({});
              }}
            >
              Cargar otro archivo
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>

          {/* Filters */}
          <PrimaveraFilterPanel analysis={analysis} onFilterChange={setFilters} />

          {/* Task Grid */}
          <PrimaveraTaskGrid analysis={analysis} filters={filters} />
        </>
      )}
    </div>
  );
}
