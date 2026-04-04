import React from "react";

export interface EventoEquipo {
  tipo_evento: string;
  fecha_evento: string;
  responsable: string;
  descripcion: string;
  evidencias?: string[];
}

export interface HistorialEventosProps {
  eventos: EventoEquipo[];
}

export const HistorialEventos: React.FC<HistorialEventosProps> = ({ eventos }) => {
  if (!eventos.length) {
    return <div className="text-white/40 text-sm">Sin eventos registrados.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-white/10 bg-[#181c24]">
        <thead>
          <tr className="bg-[#232837] text-white/60">
            <th className="p-2">Fecha</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Responsable</th>
            <th className="p-2">Descripción</th>
            <th className="p-2">Evidencia</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((ev, idx) => (
            <tr key={idx} className="border-t border-white/5">
              <td className="p-2 font-mono-tech text-white/80">{new Date(ev.fecha_evento).toLocaleDateString()}</td>
              <td className="p-2 text-white/80">{ev.tipo_evento}</td>
              <td className="p-2 text-white/80">{ev.responsable}</td>
              <td className="p-2 text-white/90">{ev.descripcion}</td>
              <td className="p-2">
                {ev.evidencias && ev.evidencias.length > 0 ? (
                  <a href={ev.evidencias[0]} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Ver</a>
                ) : (
                  <span className="text-white/30">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
