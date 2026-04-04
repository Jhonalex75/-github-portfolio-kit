'use client';

import { useState } from 'react';
import { moderarMensajeAction } from '@/actions/demo-ai';

export default function DemoGenkitPage() {
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<{isAppropriate: boolean, reason: string} | null>(null);

  const enviarParaAnalisis = async () => {
    if (!mensaje.trim()) return;
    
    setCargando(true);
    setResultado(null);

    // 1. Llamamos a nuestra Server Action que ejecuta Genkit en el fondo
    const respuestaIA = await moderarMensajeAction(mensaje);
    
    // 2. Guardamos la respuesta estructurada que pensó la IA
    setResultado(respuestaIA);
    setCargando(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🤖 Demo Interactiva Genkit</h1>
        <p className="text-gray-600 mb-6 line-clamp-3">
          Este ejemplo detecta si un mensaje es &quot;Profesional&quot; y &quot;Relacionado a la ingeniería&quot;. 
          Escribe un mensaje normal, y luego trata escribiendo un insulto o preguntando por la receta de una pizza.
        </p>

        <textarea 
          className="w-full text-black border-2 border-gray-300 rounded-lg p-3 mb-4 focus:outline-none focus:border-blue-500"
          rows={3}
          placeholder="Ej: El reporte técnico del molino SAG está listo."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />

        <button 
          onClick={enviarParaAnalisis}
          disabled={cargando || !mensaje}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400"
        >
          {cargando ? 'Analizando con Genkit (Gemini)...' : 'Analizar Mensaje'}
        </button>

        {resultado && (
          <div className={`mt-6 p-4 rounded-lg border-l-4 ${resultado.isAppropriate ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            <h3 className={`font-bold ${resultado.isAppropriate ? 'text-green-800' : 'text-red-800'}`}>
              {resultado.isAppropriate ? '✅ Aprobado (Profesional)' : '❌ Rechazado (No Profesional)'}
            </h3>
            {!resultado.isAppropriate && (
              <p className="mt-2 text-sm text-red-700">
                <span className="font-semibold">Razón de la IA:</span> {resultado.reason}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
