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
import { X, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
interface ContractorSection {
  contratista: string;   // 'HL-GISAICO' | 'TECNITANQUES' | 'CYC'
  sistema?: string;      // 'LIXIVIACIÓN' | 'CIP' | 'GENERAL'
  activities: string[];
  personal: {
    mecanicos:      number;
    soldadores:     number;
    auxiliares:     number;
    armadores:      number;
    inspectoresHSE: number;
  };
  equipment: {
    grua:           number;
    generador:      number;
    andamios:       number;
    camionGrua:     number;
    torreGrua:      number;
    equipoEspecial: string;  // aligned with ContractorEquipment
  };
  hsePermisos: HsePermit[];
  seguridad: {
    comentarios:         string;
    incidentes:          number;
    cuasiAccidentes:     number;
    observacionesEpp:    string;
    leccionesAprendidas: string;
  };
}

export interface PrintReportData {
  documentControl: {
    empresaSupervisora:  string;
    normativa:           string;
    cliente:             string;
    tipoReporte:         string;
    proyecto:            string;
    folio:               string;
    fechaOperacion:      string;
    codigoDocumento:     string;
    revision:            string;
    emisor:              string;
    matriculaProfesional: string;
  };
  condicionClimatica: string;
  estadoFolio:        string;
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
  return p.mecanicos + p.soldadores + p.auxiliares + p.armadores + p.inspectoresHSE;
}

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
      pageBreakInside: 'avoid',
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
        <SectionTitle color="#37474F">◆ NARRATIVA DE ACTIVIDADES EJECUTADAS</SectionTitle>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>

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
                {[
                  ['Mecánicos Armadores',    section.personal.mecanicos],
                  ['Soldadores Calificados', section.personal.soldadores],
                  ['Auxiliares / Ayudantes', section.personal.auxiliares],
                  ['Armadores Estructurales', section.personal.armadores],
                  ['Inspectores HSE',         section.personal.inspectoresHSE],
                ].map(([label, val], i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#FFF' : '#F5F5F5' }}>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0' }}>{String(label)}</td>
                    <td style={{ padding: '3px 8px', borderBottom: '1px solid #E0E0E0', textAlign: 'center', fontWeight: 'bold' }}>{String(val)}</td>
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
        <SectionTitle color="#B71C1C">◆ CHECKLIST HSE — PERMISOS DE TRABAJO ACTIVOS</SectionTitle>
        <HseTable permisos={section.hsePermisos} />

        {/* Safety */}
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
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────
export function ReportPrintPreview({ data, onClose }: Props) {
  const { documentControl: dc } = data;

  return (
    <>
      {/* Print CSS — injected inline to avoid Next.js style conflicts */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-print-root, #report-print-root * { visibility: visible !important; }
          #report-print-root { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
          #print-toolbar { display: none !important; }
          @page { size: A4; margin: 12mm 14mm 14mm 14mm; }
        }
      `}</style>

      {/* Overlay backdrop */}
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
        <div id="print-toolbar" style={{
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
            <Button size="sm" onClick={() => window.print()} className="bg-orange-600 hover:bg-orange-700 gap-2">
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
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
            <tbody>
              {/* Row 1: ISO/SGS banner */}
              <tr>
                <td colSpan={3} style={{
                  backgroundColor: '#FF6B00',
                  color: '#FFF',
                  padding: '5px 12px',
                  fontSize: '8.5px',
                  fontWeight: 'bold',
                  letterSpacing: '0.06em',
                  textAlign: 'center',
                }}>
                  {dc.empresaSupervisora} &nbsp;|&nbsp; {dc.normativa}
                </td>
              </tr>

              {/* Row 2: Logos + Title */}
              <tr style={{ backgroundColor: '#ECEFF1', border: '2px solid #B0BEC5' }}>
                {/* SGS Logo placeholder */}
                <td style={{ width: '140px', padding: '10px 14px', verticalAlign: 'middle', borderRight: '2px solid #B0BEC5' }}>
                  <div style={{
                    width: '110px',
                    height: '52px',
                    backgroundColor: '#FF6B00',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <span style={{ color: '#FFF', fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>SGS</span>
                    <span style={{ color: '#FFF', fontSize: '7px', letterSpacing: '0.15em', opacity: 0.9 }}>SUPERVISORA</span>
                  </div>
                </td>

                {/* Center title */}
                <td style={{ textAlign: 'center', padding: '10px 20px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: '7.5px', color: '#546E7A', letterSpacing: '0.12em', marginBottom: '4px' }}>
                    {dc.cliente}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0D1B2A', letterSpacing: '0.04em', lineHeight: 1.3 }}>
                    {dc.tipoReporte}
                  </div>
                  <div style={{ fontSize: '9px', color: '#37474F', marginTop: '4px' }}>
                    {dc.proyecto}
                  </div>
                </td>

                {/* Aris Mining Logo placeholder */}
                <td style={{ width: '140px', padding: '10px 14px', verticalAlign: 'middle', borderLeft: '2px solid #B0BEC5' }}>
                  <div style={{
                    width: '110px',
                    height: '52px',
                    backgroundColor: '#1A237E',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    marginLeft: 'auto',
                  }}>
                    <span style={{ color: '#FFD700', fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>ARIS</span>
                    <span style={{ color: '#FFF', fontSize: '9px', letterSpacing: '0.08em' }}>MINING</span>
                  </div>
                </td>
              </tr>

              {/* Row 3: Folio + Date band */}
              <tr>
                <td colSpan={3} style={{
                  backgroundColor: '#1A1A2E',
                  color: '#FFD700',
                  padding: '5px 14px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}>
                  Folio: <strong>{dc.folio}</strong> &emsp;|&emsp;
                  Fecha: <strong>{dc.fechaOperacion}</strong> &emsp;|&emsp;
                  Código: <strong>{dc.codigoDocumento}</strong> &emsp;|&emsp;
                  Rev: <strong>{dc.revision}</strong>
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
                }}>
                  Emisor: <strong>{dc.emisor}</strong> &emsp;|&emsp;
                  Matrícula Profesional: <strong>{dc.matriculaProfesional}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── IDENTIFICACIÓN ── */}
          <SectionTitle>◆ IDENTIFICACIÓN DEL REPORTE</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: '#E0E0E0' }}>
            <DataRow label="Proyecto"                  value={dc.proyecto} />
            <DataRow label="Condición Climática"        value={data.condicionClimatica} />
            <DataRow label="Estado del Folio"           value={<span style={{ fontWeight: 'bold', color: '#2E7D32' }}>✅ {data.estadoFolio}</span>} />
            <DataRow label="Contratistas Activos"       value={data.contratistas.map(c => c.contratista).join(' · ')} />
          </div>

          {/* ── CONTRATISTA SECTIONS ── */}
          {data.contratistas.map((section, i) => (
            <ContractorCard key={i} section={section} />
          ))}

          {/* ── GESTIÓN Y ADMINISTRACIÓN ── */}
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

          {/* ── EVIDENCIA FOTOGRÁFICA ── */}
          {data.evidence && data.evidence.length > 0 && (
            <>
              <SectionTitle color="#004D40">◆ BÓVEDA DE EVIDENCIA FOTOGRÁFICA ({data.evidence.length} imagen(es))</SectionTitle>
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
            {dc.emisor} &nbsp;·&nbsp; Mat. Prof.: {dc.matriculaProfesional} &nbsp;·&nbsp;
            ISO 9001:2015
          </div>

        </div>
      </div>
    </>
  );
}
