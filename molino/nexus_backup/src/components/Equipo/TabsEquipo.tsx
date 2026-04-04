import React, { useState } from "react";

export interface TabsEquipoProps {
  especificaciones: React.ReactNode;
  historial: React.ReactNode;
  documentos: React.ReactNode;
  observaciones: React.ReactNode;
}

const TABS = [
  { key: "especificaciones", label: "Especificaciones" },
  { key: "historial", label: "Historial de Eventos" },
  { key: "documentos", label: "Documentos y Fotos" },
  { key: "observaciones", label: "Observaciones" },
];

export const TabsEquipo: React.FC<TabsEquipoProps> = ({
  especificaciones,
  historial,
  documentos,
  observaciones,
}) => {
  const [tab, setTab] = useState("especificaciones");

  return (
    <div className="w-full">
      <div className="flex border-b border-white/10 bg-[#181c24]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-sm font-display uppercase tracking-widest transition-colors border-b-2 ${
              tab === t.key
                ? "border-blue-500 text-blue-400 bg-[#232837]"
                : "border-transparent text-white/40 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-6 bg-[#10131a] min-h-[200px]">
        {tab === "especificaciones" && especificaciones}
        {tab === "historial" && historial}
        {tab === "documentos" && documentos}
        {tab === "observaciones" && observaciones}
      </div>
    </div>
  );
};
