import React from "react";

export interface ObservacionesEquipoProps {
  observaciones: string;
  editable?: boolean;
  onChange?: (valor: string) => void;
}

export const ObservacionesEquipo: React.FC<ObservacionesEquipoProps> = ({ observaciones, editable = false, onChange }) => {
  return (
    <div>
      {editable ? (
        <textarea
          value={observaciones}
          onChange={e => onChange && onChange(e.target.value)}
          className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
        />
      ) : (
        <div className="text-white/80 text-sm whitespace-pre-line">{observaciones || "Sin observaciones."}</div>
      )}
    </div>
  );
};
