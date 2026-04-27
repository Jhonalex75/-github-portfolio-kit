'use client';

/**
 * PROPUESTA — ReportPrintPreview.tsx
 *
 * Componente de previsualización/impresión del Reporte Diario de Montaje Industrial.
 * Renderiza un HTML profesional consumiendo la estructura de datos del reporte.
 *
 * USO:
 *   <ReportPrintPreview data={reportData} onClose={() => setShowPrint(false)} />
 *
 * Para imprimir: window.print() — los estilos @media print ocultan el overlay
 * y dejan solo el documento en papel tamaño carta/A4.
 */

import React from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SGS_ETSA_DATA_URL, ARIS_MINING_DATA_URL } from '@/lib/report-logos';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HsePermit {
  riesgo: string;
  estado: string;
}
interface AvanceItem {
  actividad: string;
  porcentaje: string;
  estado: string;
}
interface WeldingMetricRow {
  estructura:  string;
  metrajeMl:   number;
  soldadores:  number;
}

interface ContractorSection {
  contratista: string;
  sistema?: string;
  activities: string[];
  personal: Record<string, number>;
  equipment: {
    grua:           number;
    generador:      number;
    andamios:       number;
    camionGrua:     number;
    torreGrua:      number;
    equipoEspecial: string;
  };
  hsePermisos: HsePermit[];
  seguridad: {
    comentarios:         string;
    incidentes:          number;
    cuasiAccidentes:     number;
    observacionesEpp:    string;
    leccionesAprendidas: string;
  } | null;
  weldingMetrics?: WeldingMetricRow[];
}

export interface PrintReportData {
  documentControl: {
    empresaSupervisora:   string;
    normativa:            string;
    cliente:              string;
    tipoReporte:          string;
    proyecto:             string;
    folio:                string;
    fechaOperacion:       string;
    codigoDocumento:      string;
    revision:             string;
    emisor:               string;
    matriculaProfesional: string;
    ubicacion:            string;
    especialidad:         string;
    showLicense:          boolean;
    showCodeAndFolio:     boolean;
  };
  condicionClimatica: string;
  estadoFolio:        string;
  novedades?:         string;
  contratistas:       ContractorSection[];
  evidence:           Array<{ urlOrBase64: string; name: string }>;
  adminActivities:    AvanceItem[];
}

interface Props {
  data: PrintReportData;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CONTRACTOR_COLOR: Record<string, string> = {
  'HL-GISAICO':   '#1565C0',  // Azul corporativo
  'TECNITANQUES': '#2E7D32',  // Verde industrial
  'CYC':          '#6A1B9A',  // Púrpura técnico
};

function getContractorColor(name: string): string {
  return CONTRACTOR_COLOR[name] ?? '#37474F';
}

function totalPersonal(p: ContractorSection['personal']): number {
  return Object.values(p).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
}

const PERSONNEL_LABELS: Record<string, string> = {
  soldadoresCalificados: 'Soldadores Calificados',
  auxiliaresAyudantes:   'Auxiliares / Ayudantes',
  armadores:             'Armadores',
  pailero:               'Pailero',
  operadorGatos:         'Operador Gatos',
  andamieros:            'Andamieros',
  directorObra:          'Director de Obra',
  ingResidente:          'Ing. Residente',
  supervisorMecanico:    'Supervisor Mecánico',
  ingQAQC:               'Ing. QAQC',
  inspectoresHSE:        'Inspectores HSE',
  almacenista:           'Almacenista',
  programador:           'Programador',
  administrador:         'Administrador',
  rescatista:            'Rescatista',
  operadorGrua:          'Operador Grúa',
  aparejador:            'Aparejador',
  // legacy fallbacks
  mecanicos:   'Mecánicos Armadores',
  soldadores:  'Soldadores Calificados',
  auxiliares:  'Auxiliares / Ayudantes',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children, color = '#1A1A2E' }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      backgroundColor: color,
      color: '#FFFFFF',
      padding: '6px 14px',
      fontWeight: 'bold',
      fontSize: '11px',
      letterSpacing: '0.08em',
      marginTop: '14px',
      marginBottom: '4px',
      borderLeft: '4px solid #FF6B00',
      fontFamily: 'Arial, sans-serif',
    }}>
      {children}
    </div>
  );
}

function DataRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40% 60%',
      borderBottom: '1px solid #E0E0E0',
      minHeight: '24px',
    }}>
      <div style={{
        backgroundColor: highlight ? '#ECEFF1' : '#F5F5F5',
        padding: '4px 10px',
        fontSize: '9.5px',
        fontWeight: 'bold',
        color: '#37474F',
        fontFamily: 'Arial, sans-serif',
        borderRight: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
      }}>
        {label}
      </div>
      <div style={{
        backgroundColor: '#FFFFFF',
        padding: '4px 10px',
        fontSize: '9.5px',
        color: '#212121',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        alignItems: 'center',
      }}>
        {value}
      </div>
    </div>
  );
}

function HseTable({ permisos }: { permisos: HsePermit[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'Arial, sans-serif' }}>
      <thead>
        <tr>
          <th style={{ backgroundColor: '#FF6B00', color: '#FFF', padding: '4px 8px', textAlign: 'left', width: '35%' }}>RIESGO</th>
          <th style={{ backgroundColor: '#FF6B00', color: '#FFF', padding: '4px 8px', textAlign: 'left' }}>ESTADO / APT</th>
        </tr>
      </thead>
      <tbody>
        {permisos.map((p, i) => (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#F5F5F5' }}>
            <td style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0', fontWeight: '600' }}>{p.riesgo}</td>
            <td style={{ padding: '4px 8px', borderBottom: '1px solid #E0E0E0' }}>{p.estado}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProgressBar({ pct, estado }: { pct: number; estado: string }) {
  const color = estado.includes('CRÍTICO') ? '#D32F2F' : estado.includes('PROGRESO') ? '#FFA000' : '#2E7D32';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, backgroundColor: '#E0E0E0', borderRadius: '3px', height: '8px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '9px', fontWeight: 'bold', color, minWidth: '28px' }}>{pct}%</span>
      <span style={{ fontSize: '8px', color: '#757575' }}>{estado}</span>
    </div>
  );
}

// ─── Main Contractor Card ─────────────────────────────────────────────────────
function ContractorCard({ section }: { section: ContractorSection }) {
  const color = getContractorColor(section.contratista);
  const total = totalPersonal(section.personal);

  return (
    <div style={{
      border: `2px solid ${color}`,
      borderRadius: '4px',
      marginBottom: '16px',
      overflow: 'hidden',
    }}>
      {/* Contractor header bar */}
      <div style={{
        backgroundColor: color,
        color: '#FFFFFF',
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pageBreakAfter: 'avoid',
      }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', letterSpacing: '0.05em' }}>
            🏗️ {section.contratista}
          </span>
          {section.sistema && (
            <span style={{
              marginLeft: '10px',
              fontSize: '9px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontFamily: 'Arial, sans-serif',
            }}>
              Sistema: {section.sistema}
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '3px' }}>
          👷 {total} personas
        </span>
      </div>

      <div style={{ padding: '8px 12px' }}>

        {/* Activities */}
        <SectionTitle color="#37474F">◆ ACTIVIDADES EJECUTADAS</SectionTitle>
        <div style={{
          backgroundColor: '#FAFAFA',
          border: '1px solid #E0E0E0',
          borderRadius: '3px',
          padding: '8px 12px',
          fontSize: '9.5px',
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.7',
        }}>
          {section.activities.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: '16px' }}>
              {section.activities.map((act, i) => (
                <li key={i} style={{ marginBottom: '3px', color: '#212121' }}>{act}</li>
              ))}
            </ol>
          ) : (
            <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>Sin actividades registradas.</span>
          )}
        </div>

        {/* Resources: Personnel + Equipment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px', pageBreakInside: 'avoid' }}>

          {/* Personnel */}
          <div>
            <SectionTitle color="#455A64">◆ RECURSO HUMANO</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'Arial, sans-serif' }}>
              <thead>
                <tr>
                  <th style={{ backgroundColor: '#455A64', color: '#FFF', padding: '4px 8px', textAlign: 'left' }}>ESPECIALIDAD</th>
                  <th style={{ backgroundColor: '#455A64', color: '#FFF', padding: '4px 8px', textAlign: 'center', width: '50px' }}>CANT.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(section.personal)
                  .filter(([, val]) => typeof val === 'number' && val > 0)
                  .map(([key, val], i) => (
                    <tr key={key} style={{ backgroundColor: i % 2 === 0 ? '#FFF' : '#F5F5F5' }}>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0' }}>
                        {PERSONNEL_LABELS[key] ?? key}
                      </td>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0', textAlign: 'center', fontWeight: 'bold' }}>{val}</td>
                    </tr>
                  ))}
                <tr style={{ backgroundColor: '#E3F2FD' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 'bold', fontSize: '10px' }}>TOTAL PERSONAL</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>{total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Equipment */}
          <div>
            <SectionTitle color="#455A64">◆ EQUIPOS Y MAQUINARIA</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'Arial, sans-serif' }}>
              <thead>
                <tr>
                  <th style={{ backgroundColor: '#455A64', color: '#FFF', padding: '4px 8px', textAlign: 'left' }}>EQUIPO</th>
                  <th style={{ backgroundColor: '#455A64', color: '#FFF', padding: '4px 8px', textAlign: 'center', width: '50px' }}>CANT.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Grúa',                   section.equipment.grua],
                  ['Generador',              section.equipment.generador],
                  ['Andamios (m³)',           section.equipment.andamios],
                  ['Camión Grúa',            section.equipment.camionGrua],
                  ['Torre Grúa',             section.equipment.torreGrua],
                ].map(([label, val], i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFF' : '#F5F5F5' }}>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0' }}>{String(label)}</td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0', textAlign: 'center', fontWeight: 'bold' }}>{String(val)}</td>
                  </tr>
                ))}
                {section.equipment.equipoEspecial && (
                  <tr style={{ backgroundColor: '#FFF9C4' }}>
                    <td colSpan={2} style={{ padding: '3px 8px', fontSize: '8px', fontStyle: 'italic' }}>
                      Equipo especial: {section.equipment.equipoEspecial}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* HSE Checklist */}
        {section.hsePermisos.length > 0 && (
          <>
            <SectionTitle color="#B71C1C">◆ CHECKLIST HSE — PERMISOS DE TRABAJO ACTIVOS</SectionTitle>
            <HseTable permisos={section.hsePermisos} />
          </>
        )}

        {/* Safety */}
        {section.seguridad ? (
          <>
            <SectionTitle color="#4A148C">◆ CONDICIONES DE SEGURIDAD Y MEDIO AMBIENTE</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#E0E0E0' }}>
              <DataRow label="Comentarios Generales"     value={section.seguridad.comentarios || '—'} />
              <DataRow label="Observaciones EPP"         value={section.seguridad.observacionesEpp || '—'} />
              <DataRow label="🔴 Incidentes"             value={section.seguridad.incidentes} highlight />
              <DataRow label="🟡 Cuasi-Accidentes"       value={section.seguridad.cuasiAccidentes} highlight />
            </div>
            {section.seguridad.leccionesAprendidas && (
              <div style={{
                marginTop: '4px',
                padding: '6px 10px',
                backgroundColor: '#E8F5E9',
                border: '1px solid #A5D6A7',
                borderRadius: '3px',
                fontSize: '9px',
                fontFamily: 'Arial, sans-serif',
                color: '#1B5E20',
              }}>
                📚 <strong>Lección Aprendida:</strong> {section.seguridad.leccionesAprendidas}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '6px 10px', backgroundColor: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: '3px', fontSize: '9px', fontFamily: 'Arial, sans-serif', color: '#9E9E9E', fontStyle: 'italic' }}>
            Sección de Seguridad no aplicable para este contratista en esta jornada.
          </div>
        )}

        {/* ── METRAJES DE SOLDADURA — solo TECNITANQUES y CYC ── */}
        {(section.contratista === 'TECNITANQUES' || section.contratista === 'CYC') &&
          section.weldingMetrics && section.weldingMetrics.length > 0 && (() => {
            const totalMl   = section.weldingMetrics!.reduce((s, r) => s + r.metrajeMl,  0);
            const totalSold = section.weldingMetrics!.reduce((s, r) => s + r.soldadores, 0);
            const weldColor = section.contratista === 'TECNITANQUES' ? '#1B5E20' : '#4A148C';
            const weldLight = section.contratista === 'TECNITANQUES' ? '#E8F5E9'  : '#F3E5F5';
            return (
              <div style={{ pageBreakInside: 'avoid' }}>
                <SectionTitle color={weldColor}>◆ METRAJES DE SOLDADURA — RENDIMIENTO DIARIO</SectionTitle>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'Arial, sans-serif' }}>
                  <thead>
                    <tr>
                      <th style={{ backgroundColor: weldColor, color: '#FFF', padding: '4px 8px', textAlign: 'center', width: '28px' }}>N°</th>
                      <th style={{ backgroundColor: weldColor, color: '#FFF', padding: '4px 8px', textAlign: 'left' }}>ESTRUCTURA / TANQUE</th>
                      <th style={{ backgroundColor: weldColor, color: '#FFF', padding: '4px 8px', textAlign: 'center', width: '88px' }}>METRAJE (ml)</th>
                      <th style={{ backgroundColor: weldColor, color: '#FFF', padding: '4px 8px', textAlign: 'center', width: '88px' }}>SOLDADORES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.weldingMetrics!.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFFFFF' : weldLight }}>
                        <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0', textAlign: 'center', fontWeight: 'bold', color: weldColor }}>{i + 1}</td>
                        <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0', fontWeight: '600' }}>{row.estructura || '—'}</td>
                        <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0', textAlign: 'center', fontWeight: 'bold', color: weldColor }}>
                          {row.metrajeMl % 1 === 0 ? row.metrajeMl : row.metrajeMl.toFixed(1)}
                        </td>
                        <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0', textAlign: 'center', fontWeight: 'bold' }}>{row.soldadores}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: weldColor }}>
                      <td colSpan={2} style={{ padding: '5px 8px', color: '#FFFFFF', fontWeight: 'bold', fontSize: '9.5px' }}>
                        🔥 TOTAL SOLDADURA DEL DÍA
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: '#FFD700', fontWeight: 'bold', fontSize: '11px' }}>
                        {totalMl % 1 === 0 ? totalMl : totalMl.toFixed(1)} ml
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: '#FFD700', fontWeight: 'bold', fontSize: '10px' }}>
                        {totalSold} sold.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()
        }
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export function ReportPrintPreview({ data, onClose }: Props) {
  const { documentControl: dc } = data;

  // Open a clean window with ONLY the document — no overlay, no blank pages
  const handlePrint = () => {
    const content = document.getElementById('report-print-root');
    if (!content) return;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>${dc.folio} — Reporte Diario SGS</title>
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body {
      margin: 0; padding: 20px;
      background: #FFFFFF;
      font-family: Arial, sans-serif;
    }
    @page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }
  </style>
</head>
<body>${content.innerHTML}</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const pw   = window.open(url, '_blank', 'width=960,height=800,scrollbars=yes');
    if (!pw) { URL.revokeObjectURL(url); alert('Permite las ventanas emergentes para imprimir.'); return; }
    // Revoke blob URL after window loads, then trigger print
    pw.addEventListener('load', () => {
      URL.revokeObjectURL(url);
      setTimeout(() => { pw.focus(); pw.print(); }, 300);
    });
  };

  return (
    <>
      {/* Overlay backdrop — screen only, never printed */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.85)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
      }}>
        {/* Toolbar */}
        <div style={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <div style={{ color: '#FFF', fontSize: '13px', fontFamily: 'monospace', opacity: 0.7 }}>
            Vista Previa — {dc.folio}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" onClick={handlePrint} className="bg-orange-600 hover:bg-orange-700 gap-2">
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-white border border-white/20 gap-2">
              <X className="w-4 h-4" /> Cerrar
            </Button>
          </div>
        </div>

        {/* Document root */}
        <div id="report-print-root" style={{
          width: '100%',
          maxWidth: '900px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
          padding: '20px 24px',
          fontFamily: 'Arial, sans-serif',
          color: '#212121',
        }}>

          {/* ── ENCABEZADO PRINCIPAL ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0', border: '2px solid #B0BEC5' }}>
            <tbody>
              {/* Row 1: Logo SGS|ETSA  ·  Título  ·  Logo Aris Mining */}
              <tr style={{ backgroundColor: '#FFFFFF' }}>
                {/* SGS | ETSA logo */}
                <td style={{
                  width: '150px', padding: '8px 12px',
                  verticalAlign: 'middle', borderRight: '1.5px solid #D0D7DE',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={SGS_ETSA_DATA_URL}
                    alt="SGS | ETSA — Estudios Técnicos S.A."
                    style={{ width: '138px', height: 'auto', display: 'block' }}
                  />
                </td>

                {/* Center — document title */}
                <td style={{ textAlign: 'center', padding: '10px 16px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: '7px', color: '#78909C', letterSpacing: '0.18em', marginBottom: '3px', fontFamily: 'Arial, sans-serif' }}>
                    {dc.cliente}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0D1B2A', letterSpacing: '0.03em', lineHeight: 1.2, fontFamily: 'Arial, sans-serif' }}>
                    {dc.tipoReporte}
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#455A64', marginTop: '5px', fontFamily: 'Arial, sans-serif' }}>
                    {dc.proyecto}
                  </div>
                  <div style={{ fontSize: '7.5px', color: '#90A4AE', marginTop: '2px', fontStyle: 'italic', fontFamily: 'Arial, sans-serif' }}>
                    {dc.especialidad}
                  </div>
                </td>

                {/* Aris Mining Marmato logo */}
                <td style={{
                  width: '150px', padding: '8px 12px',
                  verticalAlign: 'middle', borderLeft: '1.5px solid #D0D7DE',
                  textAlign: 'right',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ARIS_MINING_DATA_URL}
                    alt="Aris Mining — Marmato"
                    style={{ width: '138px', height: 'auto', display: 'inline-block' }}
                  />
                </td>
              </tr>

              {/* Row 2: Normativa / ISO banner */}
              <tr>
                <td colSpan={3} style={{
                  backgroundColor: '#E8651A',
                  color: '#FFF',
                  padding: '4px 14px',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  letterSpacing: '0.07em',
                  textAlign: 'center',
                  fontFamily: 'Arial, sans-serif',
                }}>
                  {dc.empresaSupervisora} &nbsp;·&nbsp; {dc.normativa}
                </td>
              </tr>

              {/* Row 3: Folio + Date + Código band */}
              <tr>
                <td colSpan={3} style={{
                  backgroundColor: '#1A1A2E',
                  color: '#FFD700',
                  padding: '5px 14px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}>
                  {dc.showCodeAndFolio && <>Folio: <strong>{dc.folio}</strong> &emsp;|&emsp;</>}
                  Fecha: <strong>{dc.fechaOperacion}</strong> &emsp;|&emsp;
                  {dc.showCodeAndFolio && <>Código: <strong>{dc.codigoDocumento}</strong> &emsp;|&emsp;</>}
                  Rev: <strong>{dc.revision}</strong> &emsp;|&emsp;
                  Ubicación: <strong>{dc.ubicacion}</strong>
                </td>
              </tr>

              {/* Row 4: Emisor + Matrícula */}
              <tr>
                <td colSpan={3} style={{
                  backgroundColor: '#ECEFF1',
                  padding: '5px 14px',
                  fontSize: '8.5px',
                  color: '#455A64',
                  borderBottom: '2px solid #B0BEC5',
                  fontFamily: 'Arial, sans-serif',
                }}>
                  Elaborado por: <strong>{dc.emisor}</strong>
                  {dc.showLicense && <> &emsp;|&emsp; Matrícula Profesional: <strong>{dc.matriculaProfesional}</strong></>}
                  &emsp;|&emsp; Especialidad: <strong>{dc.especialidad}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── IDENTIFICACIÓN ── */}
          <SectionTitle>◆ IDENTIFICACIÓN DEL REPORTE</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#E0E0E0' }}>
            <DataRow label="Proyecto"             value={dc.proyecto} />
            <DataRow label="Ubicación"             value={dc.ubicacion} />
            <DataRow label="Especialidad"          value={dc.especialidad} />
            <DataRow label="Condición Climática"   value={data.condicionClimatica} />
            <DataRow label="Estado del Folio"      value={<span style={{ fontWeight: 'bold', color: '#2E7D32' }}>✅ {data.estadoFolio}</span>} />
            <DataRow label="Contratistas Activos"  value={data.contratistas.map(c => c.contratista).join(' · ')} />
          </div>

          {/* ── CONTRATISTA SECTIONS ── */}
          {data.contratistas.map((section, i) => (
            <ContractorCard key={i} section={section} />
          ))}

          {/* ── NOVEDADES Y OBSERVACIONES ── */}
          {data.novedades && data.novedades.trim() && (
            <>
              <SectionTitle color="#4E342E">◆ NOVEDADES Y OBSERVACIONES — DESVIACIONES MECÁNICAS / LOGÍSTICAS</SectionTitle>
              <div style={{
                backgroundColor: '#FFF8E1',
                border: '1px solid #FFD54F',
                borderLeft: '4px solid #F57F17',
                borderRadius: '3px',
                padding: '10px 14px',
                fontSize: '9.5px',
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.75',
                color: '#4E342E',
                marginBottom: '8px',
                whiteSpace: 'pre-wrap',
              }}>
                {data.novedades}
              </div>
            </>
          )}

          {/* ── GESTIÓN Y ADMINISTRACIÓN — solo si hay actividades ── */}
          {data.adminActivities.length > 0 && (
            <>
              <SectionTitle color="#004D40">◆ CONTROL DE AVANCE — GESTIÓN Y ADMINISTRACIÓN</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: 'Arial, sans-serif' }}>
                <thead>
                  <tr>
                    <th style={{ backgroundColor: '#004D40', color: '#FFF', padding: '5px 10px', textAlign: 'left', width: '50%' }}>ACTIVIDAD DE GESTIÓN</th>
                    <th style={{ backgroundColor: '#004D40', color: '#FFF', padding: '5px 10px', textAlign: 'center', width: '15%' }}>% AVANCE</th>
                    <th style={{ backgroundColor: '#004D40', color: '#FFF', padding: '5px 10px', textAlign: 'left' }}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adminActivities.map((a, i) => (
                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFF' : '#F5F5F5' }}>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0' }}>{a.actividad}</td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0' }}>
                        <ProgressBar
                          pct={parseInt(a.porcentaje)}
                          estado={a.estado}
                        />
                      </td>
                      <td style={{ padding: '5px 10px', borderBottom: '1px solid #E0E0E0', fontSize: '8px' }}>{a.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── EVIDENCIA FOTOGRÁFICA ── */}
          {data.evidence && data.evidence.length > 0 && (
            <>
              <SectionTitle color="#004D40">◆ REGISTRO FOTOGRÁFICO ({data.evidence.length} imagen(es))</SectionTitle>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '12px',
              }}>
                {data.evidence.map((ev, i) => (
                  <div key={i} style={{
                    border: '1px solid #B0BEC5',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    pageBreakInside: 'avoid',
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ev.urlOrBase64}
                      alt={ev.name}
                      style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      backgroundColor: '#ECEFF1',
                      padding: '3px 6px',
                      fontSize: '8px',
                      color: '#37474F',
                      fontFamily: 'Arial, sans-serif',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      📷 {ev.name || `Evidencia ${i + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── FOOTER ── */}
          <div style={{
            marginTop: '20px',
            backgroundColor: '#FF6B00',
            padding: '6px 14px',
            textAlign: 'center',
            fontSize: '7.5px',
            color: '#FFF',
            fontFamily: 'Arial, sans-serif',
            letterSpacing: '0.05em',
          }}>
            Documento generado electrónicamente &nbsp;·&nbsp; NEXUS Command Center v2.1 — SGS Quality Portal &nbsp;·&nbsp;
            {dc.emisor}
            {dc.showLicense && <> &nbsp;·&nbsp; Mat. Prof.: {dc.matriculaProfesional}</>}
            &nbsp;·&nbsp; ISO 9001:2015
          </div>

        </div>
      </div>
    </>
  );
}
