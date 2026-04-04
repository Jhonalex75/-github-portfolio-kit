'use client';

import { useState } from 'react';
import { useUser } from '@/firebase';
import { generarTituloAction } from '@/actions/titulos-actions';

interface ResultadoTitulo {
  success: boolean;
  titulo?: string;
  subtitulo?: string;
  remaining?: { minute: number; hour: number };
}

export default function DemoTitulosPage() {
  const { user } = useUser();
  const [tema, setTema] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoTitulo | null>(null);

  const crearTitulo = async () => {
    if (!tema.trim() || !user?.uid) return;
    
    setCargando(true);
    setResultado(null);

    const respuestaIA = await generarTituloAction(tema, user.uid);
    
    setResultado(respuestaIA);
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-xl w-full">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">📑 Asistente de Reportes (IA)</h1>
        <p className="text-slate-600 mb-6 font-medium">
          Dime sobre qué estás escribiendo el reporte técnico, y la IA de Genkit generará un Título y Subtítulo corporativos para ti.
        </p>

        <textarea 
          className="w-full text-black border-2 border-slate-300 rounded-lg p-3 mb-4 focus:outline-none focus:border-indigo-500 shadow-sm"
          rows={3}
          placeholder="Ej: Análisis de la falla del rodamiento principal por sobrecalentamiento"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
        />

        <button 
          onClick={crearTitulo}
          disabled={cargando || !tema}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-400 shadow-md"
        >
          {cargando ? 'Pensando y redactando...' : 'Generar Título Oficial'}
        </button>

        {resultado && (
          <div className="mt-8 p-6 rounded-lg bg-indigo-50 border border-indigo-200 shadow-inner">
            <h3 className="text-2xl font-black text-indigo-900 mb-2">
              {resultado.titulo}
            </h3>
            <p className="text-lg text-indigo-700 font-semibold italic">
              {resultado.subtitulo}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
