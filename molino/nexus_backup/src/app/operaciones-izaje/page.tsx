"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BookOpen, ListChecks, Wrench, ClipboardCheck, Hand,
  Printer, AlertTriangle, XCircle, Camera, Save, Archive,
  Clock, Loader2, HardHat, ChevronRight, Shield, Activity,
  CheckCircle2, AlertCircle, Zap, Edit2, Trash2, MapPin,
  CalendarDays, ImageIcon,
} from 'lucide-react';
import { collection, addDoc, deleteDoc, setDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

import { useFirestore, useUser, useFirebaseApp, useMemoFirebase, useCollection } from '@/firebase';
import { uploadFileToStorage } from '@/firebase/storage-utils';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { useToast } from '@/hooks/use-toast';
import { SGS_ETSA_DATA_URL, ARIS_MINING_DATA_URL } from '@/lib/report-logos';
import type {
  LiftPlanInputs, LiftPlanCalculations, InspectionDetails,
  SignalConfirmations, PlanElementsChecked, LiftOperationReport,
} from '@/lib/operaciones-izaje-types';

// ── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_PROJECT = 'default-nexus-project';
const toRadians = (angle: number) => angle * (Math.PI / 180);

const planElementsData = [
  { id: 'evaluacionCarga' as const, title: 'Evaluación de la Carga', content: 'Determinar el peso y el centro de gravedad (CG). Primer paso crítico.' },
  { id: 'seleccionEquipo' as const, title: 'Selección del Equipo', content: 'Grúa y accesorios adecuados para la carga y condiciones del sitio.' },
  { id: 'inspeccionEquipos' as const, title: 'Inspección de Equipos', content: 'Inspecciones pre-operacionales de todos los componentes de aparejo.' },
  { id: 'condicionesArea' as const, title: 'Condiciones del Área', content: 'Evaluar terreno, clima y posibles obstáculos en el radio de giro.' },
];

const rejectionCriteriaData = [
  { id: 'steelSlings' as const, title: 'Eslingas de Cable de Acero', criteria: 'Alambres rotos, corrosión severa, aplastamiento o kinks.' },
  { id: 'syntheticSlings' as const, title: 'Eslingas Sintéticas', criteria: 'Cortes, quemaduras, costuras rotas o decoloración.' },
  { id: 'hooks' as const, title: 'Ganchos', criteria: 'Deformación (>15%), desgaste en garganta (>10%), pestillo dañado.' },
];

const handSignalsData = [
  { id: 'hoist' as const, name: 'Izar', desc: 'Puño cerrado, pulgar apuntando hacia arriba' },
  { id: 'lower' as const, name: 'Bajar', desc: 'Puño cerrado, pulgar apuntando hacia abajo' },
  { id: 'stop' as const, name: 'Detener', desc: 'Palma abierta hacia el operador' },
  { id: 'emergencyStop' as const, name: 'Parada de Emergencia', desc: 'Ambos brazos extendidos horizontalmente' },
];

// ── Reusable dark-theme UI primitives ───────────────────────────────────────

const DarkCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-[#0B1018] border border-primary/20 rounded-xl shadow-2xl overflow-hidden', className)}>
    {children}
  </div>
);

const DarkCardHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-5 py-3.5 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent flex items-center gap-3', className)}>
    {children}
  </div>
);

const DarkInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1">
    <label className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest">{label}</label>
    <input
      {...props}
      className="w-full bg-[#0A0E14] border border-primary/20 rounded-lg px-3 py-2 text-sm text-white placeholder-primary/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:dark]"
    />
  </div>
);

const DarkTextArea = ({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div className="space-y-1 h-full">
    <label className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest">{label}</label>
    <textarea
      {...props}
      className="w-full h-40 bg-[#0A0E14] border border-primary/20 rounded-lg px-3 py-2 text-sm text-white placeholder-primary/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition resize-none"
    />
  </div>
);

const StatGauge = ({ label, value, unit, thresholdWarn = 75, thresholdCrit = 100 }: {
  label: string; value: number; unit: string; thresholdWarn?: number; thresholdCrit?: number;
}) => {
  const pct = Math.min(value, 150);
  const color = value > thresholdCrit ? '#EF4444' : value > thresholdWarn ? '#F59E0B' : '#22D3EE';
  const bg = value > thresholdCrit ? 'bg-red-500/10 border-red-500/30' : value > thresholdWarn ? 'bg-amber-500/10 border-amber-500/30' : 'bg-cyan-500/10 border-cyan-500/20';
  return (
    <div className={cn('p-3 rounded-lg border text-center', bg)}>
      <p className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
      <p className="text-2xl font-bold font-mono leading-none" style={{ color }}>
        {isFinite(value) ? value.toFixed(1) : '∞'}
        <span className="text-xs ml-1 opacity-60">{unit}</span>
      </p>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      {value > thresholdWarn && (
        <p className="text-[8px] font-mono mt-1 uppercase" style={{ color }}>
          {value > thresholdCrit ? '⛔ CRÍTICO' : '⚠️ ADVERTENCIA'}
        </p>
      )}
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────

const Modal = ({ children, isOpen, onClose }: { children: React.ReactNode; isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-[#0B1018] border border-primary/30 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-primary/40 hover:text-red-400 transition z-10">
          <XCircle className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
};

// ── Crane Visualization ───────────────────────────────────────────────────────

const CraneVisualization = ({ boomLength, boomAngle }: { boomLength: number; boomAngle: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0A0E14';
    ctx.fillRect(0, 0, width, height);

    const groundLevel = height - 40;
    const cranePivotX = width * 0.2;
    const cranePivotY = groundLevel - 15;

    // Ground
    ctx.fillStyle = '#1a2035';
    ctx.fillRect(0, groundLevel, width, 40);
    ctx.strokeStyle = '#00E5FF30';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundLevel);
    ctx.lineTo(width, groundLevel);
    ctx.stroke();

    // Crane base
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(cranePivotX - 25, groundLevel - 30, 50, 30);
    ctx.fillStyle = '#0d2040';
    ctx.fillRect(cranePivotX - 40, groundLevel, 80, 10);

    // Grid lines
    ctx.strokeStyle = '#00E5FF08';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, groundLevel); ctx.stroke();
    }

    const angleHorizontalRad = toRadians(boomAngle);
    const radius = boomLength * Math.cos(angleHorizontalRad);

    if (boomLength <= 0 || boomAngle <= 0 || boomAngle >= 90) {
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GEOMETRÍA INVÁLIDA', width / 2, height / 2);
      return;
    }

    const drawingWidth = radius;
    const drawingHeight = boomLength * Math.sin(angleHorizontalRad);
    const scaleX = drawingWidth > 0 ? (width * 0.75) / drawingWidth : 1;
    const scaleY = drawingHeight > 0 ? (height * 0.7) / drawingHeight : 1;
    const scale = Math.min(scaleX, scaleY, 20);

    const boomVizLength = boomLength * scale;
    const radiusViz = radius * scale;

    const boomEndX = cranePivotX + boomVizLength * Math.cos(angleHorizontalRad);
    const boomEndY = cranePivotY - boomVizLength * Math.sin(angleHorizontalRad);

    // Boom glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00E5FF';
    ctx.beginPath();
    ctx.moveTo(cranePivotX, cranePivotY);
    ctx.lineTo(boomEndX, boomEndY);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Hook rope
    const loadX = cranePivotX + radiusViz;
    const loadY = groundLevel - 45;
    ctx.beginPath();
    ctx.moveTo(loadX, boomEndY);
    ctx.lineTo(loadX, loadY);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#94a3b8';
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Load box
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#F59E0B';
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(loadX - 18, loadY, 36, 28);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CARGA', loadX, loadY + 17);

    // Radius line
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(cranePivotX, groundLevel - 2);
    ctx.lineTo(loadX, groundLevel - 2);
    ctx.strokeStyle = '#EF444460';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`R: ${radius.toFixed(1)} m`, cranePivotX + radiusViz / 2, groundLevel - 8);

    // Angle arc
    ctx.beginPath();
    ctx.arc(cranePivotX, cranePivotY, 38, 0, -angleHorizontalRad, true);
    ctx.strokeStyle = '#00E5FF60';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${boomAngle.toFixed(1)}°`, cranePivotX + 42, cranePivotY - 14);

    // Boom length label
    ctx.save();
    ctx.translate((cranePivotX + boomEndX) / 2 - 10, (cranePivotY + boomEndY) / 2);
    ctx.rotate(-angleHorizontalRad);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${boomLength.toFixed(1)} m`, 0, 4);
    ctx.restore();
  }, [boomLength, boomAngle]);

  return (
    <DarkCard>
      <DarkCardHeader>
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Visualización Geométrica</span>
      </DarkCardHeader>
      <div className="p-3">
        <canvas ref={canvasRef} width={500} height={280} className="w-full h-auto rounded-lg" />
      </div>
    </DarkCard>
  );
};

// ── Sling Tension Chart ──────────────────────────────────────────────────────

const SlingTensionChart = ({ loadWeight, numSlingLegs }: { loadWeight: number; numSlingLegs: number }) => {
  const data = useMemo(() => {
    if (numSlingLegs <= 0 || loadWeight <= 0) return [];
    return Array.from({ length: 16 }, (_, i) => {
      const angleH = 10 + i * 5;
      const cosVal = Math.cos(toRadians(90 - angleH));
      return cosVal > 0 ? { angle: `${angleH}°`, tension: parseFloat(((loadWeight / numSlingLegs) / cosVal).toFixed(0)) } : null;
    }).filter(Boolean) as { angle: string; tension: number }[];
  }, [loadWeight, numSlingLegs]);

  return (
    <DarkCard>
      <DarkCardHeader>
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">Tensión vs. Ángulo de Eslinga</span>
      </DarkCardHeader>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00E5FF10" />
            <XAxis dataKey="angle" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0B1018', border: '1px solid #00E5FF30', borderRadius: '8px', fontFamily: 'monospace', fontSize: 11 }}
              labelStyle={{ color: '#00E5FF' }}
              itemStyle={{ color: '#F59E0B' }}
            />
            <Line type="monotone" dataKey="tension" name="Tensión (kg)" stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DarkCard>
  );
};

// ── Standards Section ────────────────────────────────────────────────────────

const StandardsSection = () => (
  <DarkCard>
    <DarkCardHeader>
      <BookOpen className="w-4 h-4 text-cyan-400" />
      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Estándares Normativos</span>
      <span className="ml-auto text-[9px] font-mono text-primary/30 uppercase">ASME B30 · OSHA</span>
    </DarkCardHeader>
    <div className="p-6 space-y-6">
      {[
        { code: 'ASME B30.5', title: 'Grúas Móviles y Locomotoras', desc: 'Requisitos de seguridad para operación, inspección y mantenimiento de grúas móviles.' },
        { code: 'ASME B30.9', title: 'Eslingas', desc: 'Fabricación, uso e inspección de eslingas metálicas y sintéticas.' },
        { code: 'ASME B30.10', title: 'Ganchos', desc: 'Selección, uso e inspección de ganchos de aparejo industriales.' },
        { code: 'ASME B30.26', title: 'Herrajes de Aparejo', desc: 'Grilletes, anillas, tensores y accesorios de conexión.' },
        { code: 'ASME B30.23', title: 'Elevación de Personal', desc: 'Aplicable solo en casos excepcionales documentados y autorizados.' },
      ].map(norm => (
        <div key={norm.code} className="flex gap-4 p-4 bg-primary/5 border border-primary/10 rounded-lg hover:border-cyan-500/30 transition">
          <div className="shrink-0 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 text-xs font-mono font-bold self-start">{norm.code}</div>
          <div>
            <p className="text-sm font-bold text-white mb-1">{norm.title}</p>
            <p className="text-xs text-primary/50">{norm.desc}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/20 ml-auto shrink-0 self-center" />
        </div>
      ))}
    </div>
  </DarkCard>
);

// ── Plan Elements Checklist ──────────────────────────────────────────────────

const PlanElementsSection = ({
  planElementsChecked, setPlanElementsChecked,
}: {
  planElementsChecked: PlanElementsChecked;
  setPlanElementsChecked: React.Dispatch<React.SetStateAction<PlanElementsChecked>>;
}) => {
  const checked = Object.values(planElementsChecked).filter(Boolean).length;
  return (
    <DarkCard>
      <DarkCardHeader>
        <ListChecks className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Checklist Elementos del Plan</span>
        <span className={cn('ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border',
          checked === 4 ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        )}>
          {checked}/4 VERIFICADOS
        </span>
      </DarkCardHeader>
      <div className="p-6 space-y-3">
        {planElementsData.map((item, idx) => {
          const isChecked = !!planElementsChecked[item.id];
          return (
            <label key={item.id} className={cn(
              'flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all',
              isChecked
                ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                : 'bg-primary/5 border-primary/10 hover:border-cyan-500/30'
            )}>
              <div className={cn(
                'w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                isChecked ? 'bg-green-500 border-green-500' : 'border-primary/30'
              )}>
                {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => setPlanElementsChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className="sr-only"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-primary/30">{String(idx + 1).padStart(2, '0')}</span>
                  <span className={cn('text-sm font-bold', isChecked ? 'text-green-400' : 'text-white')}>{item.title}</span>
                </div>
                <p className="text-xs text-primary/50">{item.content}</p>
              </div>
            </label>
          );
        })}
      </div>
    </DarkCard>
  );
};

// ── Interactive Tool Section ─────────────────────────────────────────────────

const EMPTY_INPUTS: LiftPlanInputs = {
  operatorName: '', riggerName: '', craneDetails: '',
  area: '', cranePhotoUrl: null,
  liftDate: new Date().toISOString().split('T')[0],
  loadType: '',
  activityDescription: '',
  contractorPlanPhotoUrl: null,
  loadWeight: 10000, craneCapacity: 20000, safetyFactor: 1.25,
  boomLength: 25, radius: 23, slingAngle: 60, numSlingLegs: 2,
  craneWeight: 35000, boomAngle: 60,
  padLength: 1, padWidth: 1, groundCapacity: 200,
};

const InteractiveToolSection = ({
  inspectionDetails, signalConfirmations, planElementsChecked,
  editingReport, onEditDone,
}: {
  inspectionDetails: InspectionDetails;
  signalConfirmations: SignalConfirmations;
  planElementsChecked: PlanElementsChecked;
  editingReport: (LiftOperationReport & { id: string }) | null;
  onEditDone: () => void;
}) => {
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingCrane, setUploadingCrane] = useState(false);
  const [uploadingPlan, setUploadingPlan] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calculationMode, setCalculationMode] = useState<'byRadius' | 'byAngle'>('byRadius');
  const cranePhotoRef = React.createRef<HTMLInputElement>();
  const contractorPlanRef = React.createRef<HTMLInputElement>();

  const [inputs, setInputs] = useState<LiftPlanInputs>(EMPTY_INPUTS);

  // Load data when editing
  useEffect(() => {
    if (editingReport) {
      setInputs(editingReport.planInputs);
    } else {
      setInputs(EMPTY_INPUTS);
    }
  }, [editingReport]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleInput = (field: keyof LiftPlanInputs, value: string | number | null) =>
    setInputs(prev => ({ ...prev, [field]: value }));

  const handleCranePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCrane(true);
    const result = await uploadFileToStorage(firebaseApp, file, ACTIVE_PROJECT, undefined, 'General');
    if (result.success && result.downloadUrl) handleInput('cranePhotoUrl', result.downloadUrl);
    setUploadingCrane(false);
    e.target.value = '';
  };

  const handleContractorPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPlan(true);
    const result = await uploadFileToStorage(firebaseApp, file, ACTIVE_PROJECT, undefined, 'General');
    if (result.success && result.downloadUrl) handleInput('contractorPlanPhotoUrl', result.downloadUrl);
    setUploadingPlan(false);
    e.target.value = '';
  };

  const calculations = useMemo<LiftPlanCalculations>(() => {
    const { loadWeight, craneCapacity, safetyFactor, slingAngle, numSlingLegs, craneWeight, boomLength, radius, boomAngle, padLength, padWidth, groundCapacity } = inputs;
    let effectiveRadius = radius;
    let effectiveBoomAngle = boomAngle;

    if (calculationMode === 'byAngle') {
      effectiveRadius = boomLength * Math.cos(toRadians(boomAngle));
    } else if (boomLength > 0 && radius > 0 && radius < boomLength) {
      effectiveBoomAngle = Math.acos(radius / boomLength) * (180 / Math.PI);
    } else {
      effectiveBoomAngle = 0;
    }

    const radiusRatio = boomLength > 0 ? effectiveRadius / boomLength : 0;
    const chartCapacity = craneCapacity * Math.max(0, 1 - Math.pow(radiusRatio, 3));
    const sf = safetyFactor > 0 ? safetyFactor : 1;
    const deratedCapacity = chartCapacity / sf;
    const capacityPercentage = deratedCapacity > 0 ? (loadWeight / deratedCapacity) * 100 : Infinity;
    const slingTension = (numSlingLegs > 0 && slingAngle > 0 && slingAngle < 90)
      ? (loadWeight / numSlingLegs) / Math.cos(toRadians(90 - slingAngle))
      : 0;
    const padArea = padLength * padWidth;
    const pressureKPa = padArea > 0 ? ((loadWeight + craneWeight) * 9.81 / 4) / (padArea * 1000) : Infinity;
    const groundPerc = groundCapacity > 0 ? (pressureKPa / groundCapacity) * 100 : Infinity;

    return { effectiveRadius, effectiveBoomAngle, chartCapacity, deratedCapacity, capacityPercentage, slingTension, pressureKPa, groundPerc };
  }, [inputs, calculationMode]);

  const handleSave = async () => {
    if (!user || !firestore) return;
    setIsSaving(true);
    try {
      const payload = {
        authorUid: user.uid,
        authorName: user.displayName || user.email || 'Usuario',
        status: 'completado' as const,
        planInputs: inputs,
        planCalculations: calculations,
        inspectionDetails,
        signalConfirmations,
        planElementsChecked,
      };
      if (editingReport) {
        await setDoc(
          doc(firestore, 'projects', ACTIVE_PROJECT, 'operaciones_izaje', editingReport.id),
          { ...payload, createdAt: editingReport.createdAt, updatedAt: Timestamp.now() }
        );
        toast({ title: '✅ Reporte actualizado', description: `Plan "${inputs.craneDetails || 'de izaje'}" guardado.` });
        onEditDone();
      } else {
        await addDoc(collection(firestore, 'projects', ACTIVE_PROJECT, 'operaciones_izaje'), {
          ...payload, createdAt: Timestamp.now(),
        });
        toast({ title: '✅ Reporte guardado', description: 'Plan de izaje registrado en la base de datos.' });
        setInputs(EMPTY_INPUTS);
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el reporte.', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const isCritical = calculations.capacityPercentage > 100 || calculations.groundPerc > 100;
  const isWarning = !isCritical && (calculations.capacityPercentage > 75 || calculations.groundPerc > 80);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        {/* ── Inputs Panel ── */}
        <DarkCard>
          <DarkCardHeader>
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Datos de la Operación</span>
            <span className="ml-auto flex items-center gap-1.5 text-[9px] font-mono text-green-500/60">
              <Clock className="w-3 h-3" />
              {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </DarkCardHeader>
          <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
            {editingReport && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Edit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Editando reporte existente</span>
                <button onClick={onEditDone} className="ml-auto text-[10px] font-mono text-red-400 hover:text-red-300">✕ Cancelar</button>
              </div>
            )}

            <DarkInput label="Nombre del Operador" type="text" value={inputs.operatorName} onChange={e => handleInput('operatorName', e.target.value)} placeholder="Ej: Carlos Pérez" />
            <DarkInput label="Nombre del Rigger" type="text" value={inputs.riggerName} onChange={e => handleInput('riggerName', e.target.value)} placeholder="Ej: Luis Gómez" />
            <DarkInput label="Detalles de la Grúa / Modelo" type="text" value={inputs.craneDetails} onChange={e => handleInput('craneDetails', e.target.value)} placeholder="Ej: Grove RT890E - 90T" />
            <DarkInput label="Área / Ubicación de la Maniobra" type="text" value={inputs.area} onChange={e => handleInput('area', e.target.value)} placeholder="Ej: Patio de Montaje — Molino SAG" />
            <DarkInput label="Fecha de la Maniobra" type="date" value={inputs.liftDate} onChange={e => handleInput('liftDate', e.target.value)} />
            <DarkInput label="Tipo de Carga" type="text" value={inputs.loadType} onChange={e => handleInput('loadType', e.target.value)} placeholder="Ej: Cuerpo de molino SAG — 185 T" />

            {/* Activity description */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest">Descripción de la Actividad</label>
              <textarea
                value={inputs.activityDescription}
                onChange={e => handleInput('activityDescription', e.target.value)}
                rows={4}
                placeholder="Describa cómo se realizará la maniobra: secuencia de izaje, punto de enganche, maniobra de posicionamiento, condiciones de seguridad específicas..."
                className="w-full bg-[#0A0E14] border border-primary/20 rounded-lg px-3 py-2 text-sm text-white placeholder-primary/20 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition resize-none"
              />
            </div>

            {/* Contractor lift plan photo */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest">Plan de Izaje del Contratista</label>
              <div className={cn(
                'w-full rounded-lg border overflow-hidden flex items-center justify-center',
                inputs.contractorPlanPhotoUrl ? 'border-green-500/30 min-h-[140px]' : 'border-primary/10 bg-primary/5 h-28'
              )}>
                {inputs.contractorPlanPhotoUrl
                  ? <img src={inputs.contractorPlanPhotoUrl} alt="Plan contratista" className="w-full h-auto object-contain max-h-64" />
                  : <div className="text-center text-primary/20 py-4">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-[9px] font-mono">Adjuntar foto o scan del plan</p>
                    </div>
                }
              </div>
              <button
                onClick={() => contractorPlanRef.current?.click()}
                disabled={uploadingPlan}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-amber-500/10 disabled:opacity-40 transition"
              >
                {uploadingPlan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                {uploadingPlan ? 'Subiendo...' : 'Foto / Scan del Plan de Izaje'}
              </button>
              {inputs.contractorPlanPhotoUrl && (
                <button
                  onClick={() => handleInput('contractorPlanPhotoUrl', null)}
                  className="w-full text-[9px] font-mono text-red-500/40 hover:text-red-400 transition"
                >
                  ✕ Quitar imagen
                </button>
              )}
              <input type="file" accept="image/*,application/pdf" ref={contractorPlanRef} onChange={handleContractorPlan} className="hidden" />
            </div>

            {/* Crane photo */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-cyan-500/50 uppercase tracking-widest">Foto de la Grúa</label>
              <div className={cn(
                'w-full h-36 rounded-lg border overflow-hidden flex items-center justify-center',
                inputs.cranePhotoUrl ? 'border-green-500/30' : 'border-primary/10 bg-primary/5'
              )}>
                {inputs.cranePhotoUrl
                  ? <img src={inputs.cranePhotoUrl} alt="Grúa" className="w-full h-full object-cover" />
                  : <div className="text-center text-primary/20">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-[9px] font-mono">Sin foto</p>
                    </div>
                }
              </div>
              <button
                onClick={() => cranePhotoRef.current?.click()}
                disabled={uploadingCrane}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-cyan-500/10 disabled:opacity-40 transition"
              >
                {uploadingCrane ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                {uploadingCrane ? 'Subiendo...' : 'Cargar Foto de la Grúa'}
              </button>
              <input type="file" accept="image/*" ref={cranePhotoRef} onChange={handleCranePhoto} className="hidden" />
            </div>

            <div className="pt-2 border-t border-primary/10">
              <p className="text-[9px] font-mono text-cyan-500/40 uppercase tracking-widest mb-3">Modo de Cálculo</p>
              <div className="grid grid-cols-2 gap-2">
                {(['byRadius', 'byAngle'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setCalculationMode(mode)}
                    className={cn(
                      'py-2 px-3 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wide transition-all',
                      calculationMode === mode
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400'
                        : 'bg-primary/5 border-primary/10 text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400/70'
                    )}
                  >
                    {mode === 'byRadius' ? 'Por Radio' : 'Por Ángulo'}
                  </button>
                ))}
              </div>
            </div>

            <DarkInput label="Longitud Pluma (m)" type="number" value={inputs.boomLength} onChange={e => handleInput('boomLength', parseFloat(e.target.value) || 0)} />
            <DarkInput label="Radio (m)" type="number"
              value={calculationMode === 'byRadius' ? inputs.radius : parseFloat(calculations.effectiveRadius.toFixed(2))}
              onChange={e => handleInput('radius', parseFloat(e.target.value) || 0)}
              disabled={calculationMode === 'byAngle'}
            />
            <DarkInput label="Ángulo Pluma (°)" type="number"
              value={calculationMode === 'byAngle' ? inputs.boomAngle : parseFloat(calculations.effectiveBoomAngle.toFixed(2))}
              onChange={e => handleInput('boomAngle', parseFloat(e.target.value) || 0)}
              disabled={calculationMode === 'byRadius'}
            />

            <div className="pt-2 border-t border-primary/10 space-y-4">
              {([
                ['loadWeight', 'Peso Carga (kg)'],
                ['craneCapacity', 'Capacidad Nominal Grúa (kg)'],
                ['safetyFactor', 'Factor de Seguridad'],
                ['slingAngle', 'Ángulo de Eslinga (°)'],
                ['numSlingLegs', 'Número de Eslingas'],
                ['craneWeight', 'Peso de la Grúa (kg)'],
                ['padLength', 'Largo Zapata (m)'],
                ['padWidth', 'Ancho Zapata (m)'],
                ['groundCapacity', 'Capacidad Terreno (kPa)'],
              ] as [keyof LiftPlanInputs, string][]).map(([f, label]) => (
                <DarkInput
                  key={f}
                  label={label}
                  type="number"
                  step={f === 'safetyFactor' ? 0.05 : 1}
                  value={inputs[f] as number}
                  onChange={e => handleInput(f, parseFloat(e.target.value) || 0)}
                />
              ))}
            </div>
          </div>
        </DarkCard>

        {/* ── Results Panel ── */}
        <div className="space-y-6">
          {/* Status banner */}
          {(isCritical || isWarning) && (
            <div className={cn(
              'flex items-center gap-3 px-5 py-3 rounded-xl border font-mono text-sm font-bold animate-pulse',
              isCritical
                ? 'bg-red-500/10 border-red-500/40 text-red-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
            )}>
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {isCritical
                ? '⛔ IZAJE CRÍTICO — Supera capacidad o límite de terreno. DETENER OPERACIÓN.'
                : '⚠️ IZAJE EN ZONA DE ADVERTENCIA — Revisar parámetros antes de proceder.'}
            </div>
          )}

          {/* KPI Grid */}
          <DarkCard>
            <DarkCardHeader>
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Resultados del Análisis</span>
              <span className={cn(
                'ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full border',
                isCritical ? 'text-red-400 bg-red-500/10 border-red-500/30'
                  : isWarning ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-green-400 bg-green-500/10 border-green-500/30'
              )}>
                {isCritical ? 'CRÍTICO' : isWarning ? 'ADVERTENCIA' : 'OPERACIÓN SEGURA'}
              </span>
            </DarkCardHeader>
            <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatGauge label="Cap. Pluma (config.)" value={calculations.chartCapacity} unit="kg" thresholdWarn={Infinity} thresholdCrit={Infinity} />
              <StatGauge label="Cap. con Fact. Seg." value={calculations.deratedCapacity} unit="kg" thresholdWarn={Infinity} thresholdCrit={Infinity} />
              <StatGauge label="% Capacidad Utilizada" value={calculations.capacityPercentage} unit="%" thresholdWarn={75} thresholdCrit={100} />
              <StatGauge label="Tensión por Eslinga" value={calculations.slingTension} unit="kg" thresholdWarn={Infinity} thresholdCrit={Infinity} />
              <StatGauge label="Presión Terreno" value={calculations.pressureKPa} unit="kPa" thresholdWarn={Infinity} thresholdCrit={Infinity} />
              <StatGauge label="% Cap. Terreno" value={calculations.groundPerc} unit="%" thresholdWarn={80} thresholdCrit={100} />
            </div>

            {/* Effective geometry */}
            <div className="mx-5 mb-5 p-3 bg-primary/5 border border-primary/10 rounded-lg grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Radio Efectivo</p>
                <p className="text-lg font-bold font-mono text-cyan-400">{calculations.effectiveRadius.toFixed(2)} <span className="text-xs opacity-60">m</span></p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Ángulo Efectivo Pluma</p>
                <p className="text-lg font-bold font-mono text-cyan-400">{calculations.effectiveBoomAngle.toFixed(2)} <span className="text-xs opacity-60">°</span></p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all',
                  isSaving
                    ? 'bg-primary/10 border border-primary/20 text-primary/40 cursor-not-allowed'
                    : 'bg-green-500/15 border border-green-500/40 text-green-400 hover:bg-green-500/25 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                )}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Guardando...' : 'Guardar Reporte de Izaje'}
              </button>
            </div>
          </DarkCard>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CraneVisualization boomLength={inputs.boomLength} boomAngle={calculations.effectiveBoomAngle} />
            <SlingTensionChart loadWeight={inputs.loadWeight} numSlingLegs={inputs.numSlingLegs} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Inspection Section ───────────────────────────────────────────────────────

const InspectionSection = ({
  inspectionDetails, setInspectionDetails,
}: {
  inspectionDetails: InspectionDetails;
  setInspectionDetails: React.Dispatch<React.SetStateAction<InspectionDetails>>;
}) => {
  const firebaseApp = useFirebaseApp();
  const [uploading, setUploading] = useState<Partial<Record<keyof InspectionDetails, boolean>>>({});

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, id: keyof InspectionDetails) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(prev => ({ ...prev, [id]: true }));
    const result = await uploadFileToStorage(firebaseApp, file, ACTIVE_PROJECT, undefined, 'General');
    if (result.success && result.downloadUrl) {
      setInspectionDetails(prev => ({ ...prev, [id]: { ...prev[id], imageUrl: result.downloadUrl! } }));
    }
    setUploading(prev => ({ ...prev, [id]: false }));
    e.target.value = '';
  };

  return (
    <DarkCard>
      <DarkCardHeader>
        <ClipboardCheck className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Inspección y Documentación Visual</span>
        <span className="ml-auto text-[9px] font-mono text-primary/30 uppercase">ASME B30.9 / B30.10</span>
      </DarkCardHeader>
      <div className="p-5 space-y-5">
        {rejectionCriteriaData.map(item => {
          const fileRef = React.createRef<HTMLInputElement>();
          const detail = inspectionDetails[item.id];
          return (
            <div key={item.id} className="p-4 bg-primary/5 border border-primary/10 rounded-xl hover:border-primary/20 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-primary/40 mt-0.5">{item.criteria}</p>
                </div>
                <span className={cn(
                  'text-[9px] font-mono px-2 py-0.5 rounded-full border',
                  detail.imageUrl ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-primary/30 bg-primary/5 border-primary/10'
                )}>
                  {detail.imageUrl ? '✓ CON EVIDENCIA' : 'SIN FOTO'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className={cn(
                    'w-full h-44 rounded-lg overflow-hidden border flex items-center justify-center',
                    detail.imageUrl ? 'border-green-500/20' : 'border-primary/10 bg-primary/5'
                  )}>
                    {detail.imageUrl
                      ? <img src={detail.imageUrl} alt="Inspección" className="w-full h-full object-contain" />
                      : <div className="text-center text-primary/20">
                          <Camera className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs font-mono">Sin imagen</p>
                        </div>
                    }
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading[item.id]}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest hover:bg-cyan-500/10 disabled:opacity-40 transition"
                  >
                    {uploading[item.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {uploading[item.id] ? 'Subiendo...' : 'Cargar Foto'}
                  </button>
                  <input type="file" accept="image/*" ref={fileRef} onChange={e => handleImageChange(e, item.id)} className="hidden" />
                </div>
                <DarkTextArea
                  label="Observaciones"
                  value={detail.comments}
                  onChange={e => setInspectionDetails(prev => ({ ...prev, [item.id]: { ...prev[item.id], comments: e.target.value } }))}
                  placeholder="Registre el estado observado, condiciones y recomendaciones..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </DarkCard>
  );
};

// ── Signals Section ──────────────────────────────────────────────────────────

const SignalsSection = ({
  signalConfirmations, setSignalConfirmations,
}: {
  signalConfirmations: SignalConfirmations;
  setSignalConfirmations: React.Dispatch<React.SetStateAction<SignalConfirmations>>;
}) => {
  const firebaseApp = useFirebaseApp();
  const [uploading, setUploading] = useState<Partial<Record<keyof SignalConfirmations, boolean>>>({});

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, id: keyof SignalConfirmations) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(prev => ({ ...prev, [id]: true }));
    const result = await uploadFileToStorage(firebaseApp, file, ACTIVE_PROJECT, undefined, 'General');
    if (result.success && result.downloadUrl) {
      setSignalConfirmations(prev => ({ ...prev, [id]: { ...prev[id], imageUrl: result.downloadUrl! } }));
    }
    setUploading(prev => ({ ...prev, [id]: false }));
    e.target.value = '';
  };

  const confirmedCount = Object.values(signalConfirmations).filter(v => v.known).length;

  return (
    <DarkCard>
      <DarkCardHeader>
        <Hand className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Confirmación de Señales Manuales</span>
        <span className={cn(
          'ml-auto text-[9px] font-mono px-2 py-0.5 rounded-full border',
          confirmedCount === 4 ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        )}>
          {confirmedCount}/4 CONFIRMADAS
        </span>
      </DarkCardHeader>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {handSignalsData.map(signal => {
          const fileRef = React.createRef<HTMLInputElement>();
          const conf = signalConfirmations[signal.id];
          return (
            <div key={signal.id} className={cn(
              'p-4 rounded-xl border transition-all flex flex-col items-center gap-3',
              conf.known ? 'bg-green-500/10 border-green-500/30' : 'bg-primary/5 border-primary/10 hover:border-cyan-500/20'
            )}>
              <div className={cn(
                'w-full h-32 rounded-lg overflow-hidden border flex items-center justify-center',
                conf.imageUrl ? 'border-green-500/20' : 'border-primary/10 bg-[#0A0E14]'
              )}>
                {conf.imageUrl
                  ? <img src={conf.imageUrl} alt={signal.name} className="w-full h-full object-contain" />
                  : <div className="text-center">
                      <Hand className="w-8 h-8 mx-auto mb-1 text-primary/20" />
                      <p className="text-[9px] font-mono text-primary/20">{signal.name}</p>
                    </div>
                }
              </div>
              <p className="text-xs font-bold text-white text-center">{signal.name}</p>
              <p className="text-[9px] font-mono text-primary/40 text-center">{signal.desc}</p>

              <label className={cn(
                'flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase transition-all w-full justify-center',
                conf.known
                  ? 'bg-green-500/15 border-green-500/40 text-green-400'
                  : 'bg-primary/5 border-primary/10 text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400'
              )}>
                <input type="checkbox" checked={!!conf.known}
                  onChange={e => setSignalConfirmations(prev => ({ ...prev, [signal.id]: { ...prev[signal.id], known: e.target.checked } }))}
                  className="sr-only"
                />
                {conf.known ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {conf.known ? 'Conocida' : 'Confirmar'}
              </label>

              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading[signal.id]}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-primary/10 text-primary/40 text-[9px] font-mono hover:border-cyan-500/20 hover:text-cyan-400 disabled:opacity-30 transition"
              >
                {uploading[signal.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                Foto
              </button>
              <input type="file" accept="image/*" ref={fileRef} onChange={e => handleImageChange(e, signal.id)} className="hidden" />
            </div>
          );
        })}
      </div>
    </DarkCard>
  );
};

// ── Report View ──────────────────────────────────────────────────────────────

const ReportView = ({ plan, planId }: { plan: LiftOperationReport; planId: string }) => (
  <div id={`report-${planId}`} className="p-6 bg-white text-gray-900">
    <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
      <h2 className="text-2xl font-black uppercase tracking-widest">Plan de Izaje Seguro</h2>
      <p className="text-sm text-gray-500 mt-1">CyberEngineer Nexus — ARIS MINING | MIL24.001</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {plan.createdAt ? new Date(plan.createdAt.seconds * 1000).toLocaleString('es-CO') : new Date().toLocaleString('es-CO')}
      </p>
    </div>
    <div className="space-y-5">
      <section className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold text-sm uppercase tracking-widest mb-3 border-b pb-1">1. Datos de la Operación</h3>
        <div className="flex gap-4">
          {plan.planInputs.cranePhotoUrl && (
            <img src={plan.planInputs.cranePhotoUrl} alt="Grúa" className="w-36 h-28 object-cover rounded-lg border shrink-0" />
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm flex-1">
            <p><strong>Grúa / Modelo:</strong> {plan.planInputs.craneDetails || 'N/A'}</p>
            <p><strong>Fecha Maniobra:</strong> {plan.planInputs.liftDate || 'N/A'}</p>
            <p className="col-span-2"><strong>Área / Ubicación:</strong> {plan.planInputs.area || 'N/A'}</p>
            <p className="col-span-2"><strong>Tipo de Carga:</strong> {plan.planInputs.loadType || 'N/A'}</p>
            <p><strong>Operador:</strong> {plan.planInputs.operatorName || 'N/A'}</p>
            <p><strong>Rigger:</strong> {plan.planInputs.riggerName || 'N/A'}</p>
            <p><strong>Registrado por:</strong> {plan.authorName}</p>
          </div>
        </div>
      </section>
      {plan.planInputs.activityDescription && (
        <section className="p-4 border rounded-lg bg-gray-50">
          <h3 className="font-bold text-sm uppercase tracking-widest mb-2 border-b pb-1">2. Descripción de la Actividad</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{plan.planInputs.activityDescription}</p>
        </section>
      )}
      {plan.planInputs.contractorPlanPhotoUrl && (
        <section className="p-4 border rounded-lg bg-gray-50">
          <h3 className="font-bold text-sm uppercase tracking-widest mb-2 border-b pb-1">Plan de Izaje del Contratista</h3>
          <img src={plan.planInputs.contractorPlanPhotoUrl} alt="Plan del contratista" className="w-full max-h-96 object-contain rounded-lg border" />
        </section>
      )}
      <section className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold text-sm uppercase tracking-widest mb-2 border-b pb-1">3. Verificación del Plan</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {planElementsData.map(item => (
            <p key={item.id}>
              <strong>{item.title}:</strong>{' '}
              <span className={plan.planElementsChecked[item.id] ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {plan.planElementsChecked[item.id] ? '✓ Verificado' : '✗ Pendiente'}
              </span>
            </p>
          ))}
        </div>
      </section>
      <section className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold text-sm uppercase tracking-widest mb-2 border-b pb-1">3. Cálculos Estructurales</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p><strong>Radio Efectivo:</strong> {plan.planCalculations.effectiveRadius.toFixed(2)} m</p>
          <p><strong>Ángulo Efectivo:</strong> {plan.planCalculations.effectiveBoomAngle.toFixed(2)} °</p>
          <p><strong>Capacidad Derateada:</strong> {plan.planCalculations.deratedCapacity.toFixed(2)} kg</p>
          <p><strong>Tensión por Eslinga:</strong> {plan.planCalculations.slingTension.toFixed(2)} kg</p>
          <p className={plan.planCalculations.capacityPercentage > 75 ? 'text-red-600 font-bold' : ''}>
            <strong>% Cap. Utilizada:</strong> {plan.planCalculations.capacityPercentage.toFixed(2)} %
          </p>
          <p><strong>Presión Terreno:</strong> {plan.planCalculations.pressureKPa.toFixed(2)} kPa</p>
        </div>
      </section>
      <section>
        <h3 className="font-bold text-sm uppercase tracking-widest mb-3 border-b pb-1">4. Inspección Visual</h3>
        {rejectionCriteriaData.map(item => {
          const detail = plan.inspectionDetails[item.id];
          if (!detail?.imageUrl && !detail?.comments) return null;
          return (
            <div key={item.id} className="mb-4 p-3 border rounded-lg flex gap-4 items-start">
              <div className="w-1/3">
                <p className="font-bold text-xs mb-1">{item.title}</p>
                {detail.imageUrl && <img src={detail.imageUrl} alt={item.title} className="rounded w-full" />}
              </div>
              <div className="flex-1 text-xs text-gray-600">
                <strong>Observaciones:</strong><br />
                {detail.comments || 'Sin comentarios.'}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  </div>
);

// ── Saved Plans Section ──────────────────────────────────────────────────────

const SavedPlansSection = ({
  onEdit,
}: {
  onEdit: (plan: LiftOperationReport & { id: string }) => void;
}) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<(LiftOperationReport & { id: string }) | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ROOT_UIDS = ['R3MVwE12nVMg128Kv6bdwJ6MKav1', 'Ew4plK83Z9O6c8J1dM3F0tP04A83'];
  const ADMIN_EMAILS = ['jhonalexanderv@gmail.com', 'jhonalexandervm@outlook.com'];
  const isAdminUser = user && (
    ROOT_UIDS.includes(user.uid) ||
    (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))
  );

  const plansRef = useMemoFirebase(
    () => query(collection(firestore, 'projects', ACTIVE_PROJECT, 'operaciones_izaje'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  const { data: savedPlans, isLoading } = useCollection<LiftOperationReport>(plansRef);

  const handleDelete = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este reporte? Esta acción es irreversible.')) return;
    setDeletingId(planId);
    try {
      await deleteDoc(doc(firestore, 'projects', ACTIVE_PROJECT, 'operaciones_izaje', planId));
      toast({ title: '🗑️ Reporte eliminado' });
      if (selectedPlan?.id === planId) setSelectedPlan(null);
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el reporte.', variant: 'destructive' });
    }
    setDeletingId(null);
  };

  const handlePrint = (plan: LiftOperationReport & { id: string }) => {
    const liftDateFmt = plan.planInputs.liftDate
      ? new Date(plan.planInputs.liftDate + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'N/A';
    const generatedAt = new Date().toLocaleString('es-CO');

    const planElementsRows = planElementsData.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#FFF' : '#F5F5F5'};">
        <td style="font-weight:bold;">${item.title}</td>
        <td>${item.content}</td>
        <td style="text-align:center;font-weight:bold;color:${plan.planElementsChecked[item.id] ? '#2E7D32' : '#C62828'};">
          ${plan.planElementsChecked[item.id] ? '&#10003; VERIFICADO' : '&#10007; PENDIENTE'}
        </td>
      </tr>`).join('');

    const inspectionRows = rejectionCriteriaData.map(item => {
      const detail = plan.inspectionDetails[item.id];
      const hasContent = detail?.imageUrl || detail?.comments;
      if (!hasContent) return `
        <div style="padding:5px 12px;font-size:9px;color:#9E9E9E;font-style:italic;border-bottom:1px solid #F0F0F0;">
          ${item.title}: Sin observaciones registradas.
        </div>`;
      return `
        <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:8px;padding:8px;border:1px solid #E0E0E0;border-radius:3px;border-left:4px solid #FF6B00;page-break-inside:avoid;">
          ${detail.imageUrl ? `<img src="${detail.imageUrl}" style="width:100px;height:80px;object-fit:cover;border-radius:3px;flex-shrink:0;" />` : ''}
          <div>
            <div style="font-weight:bold;font-size:9.5px;margin-bottom:4px;">${item.title}</div>
            <div style="font-size:8.5px;color:#37474F;"><strong>Criterio de rechazo:</strong> ${item.criteria}</div>
            ${detail.comments ? `<div style="font-size:9px;color:#4E342E;margin-top:4px;"><strong>Observaciones:</strong> ${detail.comments}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    const signalRows = handSignalsData.map((signal, i) => {
      const conf = plan.signalConfirmations[signal.id];
      return `<tr style="background:${i % 2 === 0 ? '#FFF' : '#F5F5F5'};">
        <td style="font-weight:bold;">${signal.name}</td>
        <td>${signal.desc}</td>
        <td style="text-align:center;font-weight:bold;color:${conf?.known ? '#2E7D32' : '#C62828'};">${conf?.known ? '&#10003; S&Iacute;' : '&#10007; NO'}</td>
        <td style="text-align:center;">${conf?.imageUrl ? `<img src="${conf.imageUrl}" style="width:60px;height:45px;object-fit:cover;border-radius:2px;" />` : '&mdash;'}</td>
      </tr>`;
    }).join('');

    const pct = plan.planCalculations.capacityPercentage;
    const pctColor = pct > 100 ? '#C62828' : pct > 75 ? '#E65100' : '#2E7D32';
    const gndPct = plan.planCalculations.groundPerc;
    const gndColor = gndPct > 100 ? '#C62828' : gndPct > 80 ? '#E65100' : '#2E7D32';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Plan de Izaje &mdash; ${plan.planInputs.craneDetails || 'Operacion'}</title>
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body { margin:0; padding:16px; background:#FFF; font-family:Arial,sans-serif; font-size:10px; color:#212121; }
    @page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }
    img { max-width:100%; }
    .section-title {
      background-color:#1A1A2E; color:#FFF; padding:5px 14px;
      font-weight:bold; font-size:10px; letter-spacing:0.08em;
      margin-top:12px; margin-bottom:4px; border-left:4px solid #FF6B00;
    }
    .data-grid { display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#E0E0E0; margin-bottom:4px; }
    .data-row { display:grid; grid-template-columns:40% 60%; border-bottom:1px solid #E0E0E0; }
    .data-label { background:#F5F5F5; padding:4px 10px; font-size:9px; font-weight:bold; color:#37474F; border-right:1px solid #E0E0E0; }
    .data-value { background:#FFF; padding:4px 10px; font-size:9px; color:#212121; }
    .calc-table { width:100%; border-collapse:collapse; font-size:9px; }
    .calc-table th { background:#1A1A2E; color:#FFD700; padding:5px 10px; text-align:left; }
    .calc-table td { padding:4px 10px; border-bottom:1px solid #E0E0E0; }
    .footer { background-color:#FF6B00; color:#FFF; text-align:center; padding:8px 14px; font-size:8.5px; font-weight:bold; margin-top:20px; letter-spacing:0.04em; }
  </style>
</head>
<body>

<!-- ENCABEZADO PRINCIPAL -->
<table style="width:100%;border-collapse:collapse;border:2px solid #B0BEC5;margin-bottom:0;">
  <tbody>
    <tr style="background:#FFF;">
      <td style="width:150px;padding:8px 12px;vertical-align:middle;border-right:1.5px solid #D0D7DE;">
        <img src="${SGS_ETSA_DATA_URL}" alt="SGS ETSA" style="width:138px;height:auto;display:block;" />
      </td>
      <td style="text-align:center;padding:10px 16px;vertical-align:middle;">
        <div style="font-size:7px;color:#78909C;letter-spacing:0.18em;margin-bottom:3px;">ARIS MINING &mdash; MARMATO</div>
        <div style="font-size:14px;font-weight:bold;color:#0D1B2A;letter-spacing:0.03em;line-height:1.2;">PLAN DE IZAJE SEGURO</div>
        <div style="font-size:8.5px;color:#455A64;margin-top:5px;">Proyecto Molino SAG &mdash; MIL24.001</div>
        <div style="font-size:7.5px;color:#90A4AE;margin-top:2px;font-style:italic;">Ingenier&iacute;a Mec&aacute;nica &mdash; Operaciones de Izaje</div>
      </td>
      <td style="width:150px;padding:8px 12px;vertical-align:middle;border-left:1.5px solid #D0D7DE;text-align:right;">
        <img src="${ARIS_MINING_DATA_URL}" alt="Aris Mining Marmato" style="width:138px;height:auto;display:inline-block;" />
      </td>
    </tr>
    <tr>
      <td colspan="3" style="background:#E8651A;color:#FFF;padding:4px 14px;font-size:8px;font-weight:bold;letter-spacing:0.07em;text-align:center;">
        SGS ETSA &mdash; ESTUDIOS T&Eacute;CNICOS S.A. &nbsp;&middot;&nbsp; ISO 9001:2015 &middot; ISO 14001:2015 &middot; ISO 45001:2018
      </td>
    </tr>
    <tr>
      <td colspan="3" style="background:#1A1A2E;color:#FFD700;padding:5px 14px;font-size:9px;font-family:monospace;letter-spacing:0.05em;">
        Fecha Maniobra: <strong>${liftDateFmt}</strong> &emsp;|&emsp;
        &Aacute;rea: <strong>${plan.planInputs.area || 'N/A'}</strong> &emsp;|&emsp;
        Estado: <strong>${plan.status.toUpperCase()}</strong>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="background:#ECEFF1;padding:5px 14px;font-size:8.5px;color:#455A64;border-bottom:2px solid #B0BEC5;">
        Elaborado por: <strong>${plan.authorName}</strong> &emsp;|&emsp;
        Operador: <strong>${plan.planInputs.operatorName || 'N/A'}</strong> &emsp;|&emsp;
        Rigger: <strong>${plan.planInputs.riggerName || 'N/A'}</strong>
      </td>
    </tr>
  </tbody>
</table>

<!-- DATOS DE LA OPERACION -->
<div class="section-title">&#9670; DATOS DE LA OPERACI&Oacute;N</div>
${plan.planInputs.cranePhotoUrl ? `<div style="float:right;margin:0 0 8px 14px;"><img src="${plan.planInputs.cranePhotoUrl}" style="width:160px;height:120px;object-fit:cover;border:1px solid #B0BEC5;border-radius:3px;display:block;" /><div style="font-size:8px;color:#757575;text-align:center;margin-top:3px;">Foto de la Gr&uacute;a</div></div>` : ''}
<div class="data-grid">
  <div class="data-row"><div class="data-label">Gr&uacute;a / Modelo</div><div class="data-value">${plan.planInputs.craneDetails || 'N/A'}</div></div>
  <div class="data-row"><div class="data-label">Fecha Maniobra</div><div class="data-value">${liftDateFmt}</div></div>
  <div class="data-row"><div class="data-label">&Aacute;rea / Ubicaci&oacute;n</div><div class="data-value">${plan.planInputs.area || 'N/A'}</div></div>
  <div class="data-row"><div class="data-label">Tipo de Carga</div><div class="data-value">${plan.planInputs.loadType || 'N/A'}</div></div>
  <div class="data-row"><div class="data-label">Peso de la Carga</div><div class="data-value">${plan.planInputs.loadWeight} kg</div></div>
  <div class="data-row"><div class="data-label">Capacidad Nominal</div><div class="data-value">${plan.planInputs.craneCapacity} kg</div></div>
  <div class="data-row"><div class="data-label">Factor de Seguridad</div><div class="data-value">${plan.planInputs.safetyFactor}</div></div>
  <div class="data-row"><div class="data-label">Operador</div><div class="data-value">${plan.planInputs.operatorName || 'N/A'}</div></div>
  <div class="data-row"><div class="data-label">Rigger / Aparejador</div><div class="data-value">${plan.planInputs.riggerName || 'N/A'}</div></div>
  <div class="data-row"><div class="data-label">Registrado por</div><div class="data-value">${plan.authorName}</div></div>
</div>
<div style="clear:both;"></div>

${plan.planInputs.activityDescription ? `
<!-- DESCRIPCION ACTIVIDAD -->
<div class="section-title">&#9670; DESCRIPCI&Oacute;N DE LA ACTIVIDAD</div>
<div style="background:#FAFAFA;border:1px solid #E0E0E0;border-left:4px solid #FF6B00;border-radius:3px;padding:10px 14px;font-size:9.5px;line-height:1.75;color:#4E342E;white-space:pre-wrap;">${plan.planInputs.activityDescription}</div>
` : ''}

<!-- VERIFICACION DEL PLAN -->
<div class="section-title">&#9670; VERIFICACI&Oacute;N DEL PLAN DE IZAJE</div>
<table class="calc-table">
  <thead><tr><th style="width:30%;">ELEMENTO</th><th>DESCRIPCI&Oacute;N</th><th style="width:110px;text-align:center;">ESTADO</th></tr></thead>
  <tbody>${planElementsRows}</tbody>
</table>

<!-- CALCULOS ESTRUCTURALES -->
<div class="section-title">&#9670; RESULTADOS DE C&Aacute;LCULO ESTRUCTURAL</div>
<table class="calc-table">
  <thead><tr><th>PAR&Aacute;METRO</th><th>VALOR</th><th>PAR&Aacute;METRO</th><th>VALOR</th></tr></thead>
  <tbody>
    <tr>
      <td>Radio Efectivo</td>
      <td><strong>${plan.planCalculations.effectiveRadius.toFixed(2)} m</strong></td>
      <td>&Aacute;ngulo Efectivo Pluma</td>
      <td><strong>${plan.planCalculations.effectiveBoomAngle.toFixed(2)}&deg;</strong></td>
    </tr>
    <tr style="background:#F5F5F5;">
      <td>Cap. Pluma (configuraci&oacute;n)</td>
      <td><strong>${plan.planCalculations.chartCapacity.toFixed(0)} kg</strong></td>
      <td>Cap. Derateada (con F.S.)</td>
      <td><strong>${plan.planCalculations.deratedCapacity.toFixed(0)} kg</strong></td>
    </tr>
    <tr>
      <td>% Capacidad Utilizada</td>
      <td style="font-weight:bold;color:${pctColor};">${pct.toFixed(1)}%</td>
      <td>Tensi&oacute;n por Eslinga</td>
      <td><strong>${plan.planCalculations.slingTension.toFixed(0)} kg</strong></td>
    </tr>
    <tr style="background:#F5F5F5;">
      <td>Presi&oacute;n sobre Terreno</td>
      <td><strong>${plan.planCalculations.pressureKPa.toFixed(2)} kPa</strong></td>
      <td>% Capacidad Terreno</td>
      <td style="font-weight:bold;color:${gndColor};">${gndPct.toFixed(1)}%</td>
    </tr>
    <tr>
      <td>Longitud Pluma</td>
      <td><strong>${plan.planInputs.boomLength} m</strong></td>
      <td>&Aacute;ngulo Eslinga</td>
      <td><strong>${plan.planInputs.slingAngle}&deg;</strong></td>
    </tr>
    <tr style="background:#F5F5F5;">
      <td>N&deg; Eslingas</td>
      <td><strong>${plan.planInputs.numSlingLegs}</strong></td>
      <td>Presi&oacute;n Terreno Admisible</td>
      <td><strong>${plan.planInputs.groundCapacity} kPa</strong></td>
    </tr>
  </tbody>
</table>

<!-- INSPECCION VISUAL -->
<div class="section-title">&#9670; INSPECCI&Oacute;N VISUAL DE EQUIPOS DE IZAJE</div>
${inspectionRows}

<!-- SENALES DE MANO -->
<div class="section-title">&#9670; CONFIRMACI&Oacute;N DE SE&Ntilde;ALES DE MANO</div>
<table class="calc-table">
  <thead><tr><th style="width:22%;">SE&Ntilde;AL</th><th>DESCRIPCI&Oacute;N</th><th style="width:90px;text-align:center;">CONFIRMADO</th><th style="width:80px;text-align:center;">FOTO</th></tr></thead>
  <tbody>${signalRows}</tbody>
</table>

${plan.planInputs.contractorPlanPhotoUrl ? `
<!-- PLAN CONTRATISTA -->
<div class="section-title">&#9670; PLAN DE IZAJE DEL CONTRATISTA</div>
<div style="text-align:center;margin:8px 0;page-break-inside:avoid;">
  <img src="${plan.planInputs.contractorPlanPhotoUrl}" style="max-width:100%;max-height:380px;object-fit:contain;border:1px solid #B0BEC5;border-radius:3px;" />
</div>` : ''}

<!-- PIE DE PAGINA -->
<div class="footer">
  SGS ETSA &mdash; ESTUDIOS T&Eacute;CNICOS S.A. &nbsp;&middot;&nbsp; PLAN DE IZAJE SEGURO &nbsp;&middot;&nbsp; ARIS MINING &mdash; MARMATO &nbsp;&middot;&nbsp; Generado: ${generatedAt}
</div>

</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const pw = window.open(url, '_blank', 'width=960,height=800,scrollbars=yes');
    if (!pw) { URL.revokeObjectURL(url); return; }
    pw.addEventListener('load', () => {
      URL.revokeObjectURL(url);
      setTimeout(() => { pw.focus(); pw.print(); }, 300);
    });
  };

  return (
    <DarkCard>
      <DarkCardHeader>
        <Archive className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">Reportes Guardados</span>
        <span className="ml-auto text-[9px] font-mono text-primary/30">{savedPlans?.length ?? 0} registros</span>
      </DarkCardHeader>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin w-8 h-8 text-cyan-500" /></div>
      ) : (
        <div className="p-4 space-y-2">
          {savedPlans && savedPlans.length > 0 ? savedPlans.map(plan => {
            const pct = plan.planCalculations?.capacityPercentage ?? 0;
            const badgeColor = pct > 100
              ? 'text-red-400 border-red-500/30 bg-red-500/5'
              : pct > 75
              ? 'text-amber-400 border-amber-500/30 bg-amber-500/5'
              : 'text-green-400 border-green-500/30 bg-green-500/5';
            const canDelete = isAdminUser || user?.uid === plan.authorUid;
            const liftDate = plan.planInputs?.liftDate
              ? new Date(plan.planInputs.liftDate + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
              : plan.createdAt ? new Date(plan.createdAt.seconds * 1000).toLocaleDateString('es-CO') : '—';

            return (
              <div
                key={plan.id}
                className="p-4 rounded-xl border border-primary/10 bg-primary/5 hover:border-cyan-500/20 transition group"
              >
                <div className="flex items-start gap-4">
                  {/* Crane photo thumbnail */}
                  <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-primary/10 bg-[#0A0E14] flex items-center justify-center">
                    {plan.planInputs?.cranePhotoUrl
                      ? <img src={plan.planInputs.cranePhotoUrl} alt="Grúa" className="w-full h-full object-cover" />
                      : <HardHat className="w-6 h-6 text-primary/20" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedPlan(plan as LiftOperationReport & { id: string })}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('px-2 py-0.5 rounded border text-[10px] font-mono font-bold shrink-0', badgeColor)}>
                        {isFinite(pct) ? `${pct.toFixed(0)}%` : '—'}
                      </span>
                      <p className="text-sm font-bold text-white truncate">{plan.planInputs?.craneDetails || 'Plan de Izaje'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-primary/40">
                      {plan.planInputs?.area && (
                        <span className="flex items-center gap-1 text-cyan-500/50">
                          <MapPin className="w-3 h-3" />{plan.planInputs.area}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />{liftDate}
                      </span>
                      {plan.planInputs?.loadType && (
                        <span className="text-amber-500/50">{plan.planInputs.loadType}</span>
                      )}
                      <span>Op: {plan.planInputs?.operatorName || 'N/A'}</span>
                      <span>Rigger: {plan.planInputs?.riggerName || 'N/A'}</span>
                    </div>
                    <p className="text-[9px] font-mono text-cyan-500/30 mt-0.5">Registrado por: {plan.authorName}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); onEdit(plan as LiftOperationReport & { id: string }); }}
                      className="p-1.5 rounded-lg border border-amber-500/20 text-amber-500/60 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/40 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handlePrint(plan as LiftOperationReport & { id: string }); }}
                      className="p-1.5 rounded-lg border border-cyan-500/20 text-cyan-500/60 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/40 transition"
                      title="Imprimir / PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={e => handleDelete(e, plan.id)}
                        disabled={deletingId === plan.id}
                        className="p-1.5 rounded-lg border border-red-500/20 text-red-500/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 disabled:opacity-30 transition"
                        title="Eliminar"
                      >
                        {deletingId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPlan(plan as LiftOperationReport & { id: string })}
                      className="p-1.5 rounded-lg border border-primary/10 text-primary/30 hover:bg-primary/10 hover:text-primary/60 hover:border-primary/30 transition"
                      title="Ver reporte"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="py-16 text-center">
              <Archive className="w-10 h-10 text-primary/10 mx-auto mb-3" />
              <p className="text-sm font-mono text-primary/30 uppercase tracking-widest">Sin reportes registrados</p>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!selectedPlan} onClose={() => setSelectedPlan(null)}>
        {selectedPlan && (
          <>
            <ReportView plan={selectedPlan} planId={selectedPlan.id} />
            <div className="p-4 border-t border-primary/10 flex gap-3">
              <button
                onClick={() => { onEdit(selectedPlan); setSelectedPlan(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/40 text-amber-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-amber-500/10 transition"
              >
                <Edit2 className="w-4 h-4" /> Editar
              </button>
              <button
                onClick={() => handlePrint(selectedPlan)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-cyan-500/40 text-cyan-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-cyan-500/10 transition"
              >
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </button>
            </div>
          </>
        )}
      </Modal>
    </DarkCard>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

type Section = 'interactive-tool' | 'inspection' | 'signals' | 'saved-plans' | 'plan-elements' | 'standards';

const navButtons: { id: Section; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'interactive-tool', label: 'Herramienta Interactiva', icon: Wrench },
  { id: 'inspection', label: 'Inspección', icon: ClipboardCheck },
  { id: 'signals', label: 'Señales', icon: Hand },
  { id: 'saved-plans', label: 'Reportes', icon: Archive },
  { id: 'plan-elements', label: 'Checklist Plan', icon: ListChecks },
  { id: 'standards', label: 'Estándares', icon: BookOpen },
];

export default function OperacionesIzajePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [activeSection, setActiveSection] = useState<Section>('interactive-tool');

  const [editingReport, setEditingReport] = useState<(LiftOperationReport & { id: string }) | null>(null);

  const handleEdit = (plan: LiftOperationReport & { id: string }) => {
    setEditingReport(plan);
    setActiveSection('interactive-tool');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [inspectionDetails, setInspectionDetails] = useState<InspectionDetails>({
    steelSlings: { comments: '', imageUrl: null },
    syntheticSlings: { comments: '', imageUrl: null },
    hooks: { comments: '', imageUrl: null },
  });
  const [signalConfirmations, setSignalConfirmations] = useState<SignalConfirmations>({
    hoist: { known: false, imageUrl: null },
    lower: { known: false, imageUrl: null },
    stop: { known: false, imageUrl: null },
    emergencyStop: { known: false, imageUrl: null },
  });
  const [planElementsChecked, setPlanElementsChecked] = useState<PlanElementsChecked>({
    evaluacionCarga: false, seleccionEquipo: false,
    inspeccionEquipos: false, condicionesArea: false,
  });

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/auth');
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mx-auto" />
          <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-widest">Inicializando módulo…</p>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'standards': return <StandardsSection />;
      case 'plan-elements': return <PlanElementsSection planElementsChecked={planElementsChecked} setPlanElementsChecked={setPlanElementsChecked} />;
      case 'interactive-tool': return <InteractiveToolSection inspectionDetails={inspectionDetails} signalConfirmations={signalConfirmations} planElementsChecked={planElementsChecked} editingReport={editingReport} onEditDone={() => setEditingReport(null)} />;
      case 'inspection': return <InspectionSection inspectionDetails={inspectionDetails} setInspectionDetails={setInspectionDetails} />;
      case 'signals': return <SignalsSection signalConfirmations={signalConfirmations} setSignalConfirmations={setSignalConfirmations} />;
      case 'saved-plans': return <SavedPlansSection onEdit={handleEdit} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0E14]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">

          {/* ── Sticky Header ── */}
          <header className="sticky top-0 z-20 px-6 py-4 border-b border-primary/10 bg-[#0A0E14]/95 backdrop-blur shadow-xl">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-cyan-400 uppercase tracking-tight flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <HardHat className="w-4 h-4 text-cyan-400" />
                  </div>
                  OPERACIONES DE IZAJE
                </h1>
                <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-[0.3em] mt-0.5">
                  ARIS MINING — MIL24.001 | PLAN DE IZAJE SEGURO · ASME B30
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-green-500/60 uppercase">LIVE</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-lg">
                  <Shield className="w-3.5 h-3.5 text-primary/30" />
                  <span className="text-[10px] font-mono text-primary/40 uppercase">Norma ASME B30.5</span>
                </div>
              </div>
            </div>

            {/* ── Section Nav ── */}
            <div className="max-w-7xl mx-auto mt-3 flex gap-2 flex-wrap">
              {navButtons.map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setActiveSection(btn.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-widest transition-all',
                    activeSection === btn.id
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                      : 'bg-primary/5 border-primary/10 text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400/70'
                  )}
                >
                  <btn.icon className="w-3.5 h-3.5" />
                  {btn.label}
                </button>
              ))}
            </div>
          </header>

          {/* ── Content ── */}
          <div className="p-6 max-w-7xl mx-auto">
            {renderSection()}
          </div>

          <footer className="text-center py-6 text-[9px] font-mono text-primary/20 uppercase tracking-widest border-t border-primary/5">
            CyberEngineer Nexus · Operaciones de Izaje · ASME B30.5 / B30.9 / B30.10 · {new Date().getFullYear()}
          </footer>
        </main>
      </div>
    </div>
  );
}
