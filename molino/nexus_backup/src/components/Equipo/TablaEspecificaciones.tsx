import React from "react";

export interface Especificacion {
  nombre: string;
  valor: string;
}

export interface TablaEspecificacionesProps {
  especificaciones: Especificacion[];
  editable?: boolean;
  onChange?: (especificaciones: Especificacion[]) => void;
}

export const TablaEspecificaciones: React.FC<TablaEspecificacionesProps> = ({
  especificaciones,
  editable = false,
  onChange,
}) => {
  const handleEdit = (idx: number, valor: string) => {
    if (!onChange) return;
    const nuevas = [...especificaciones];
    nuevas[idx] = { ...nuevas[idx], valor };
    onChange(nuevas);
  };

  return (
    <table className="w-full text-sm border border-white/10 bg-[#181c24]">
      <thead>
        <tr className="bg-[#232837] text-white/60">
          <th className="p-2 text-left">Especificación</th>
          <th className="p-2 text-left">Valor</th>
        </tr>
      </thead>
      <tbody>
        {especificaciones.map((esp, idx) => (
          <tr key={esp.nombre} className="border-t border-white/5">
            <td className="p-2 font-mono-tech text-white/80 w-1/2">{esp.nombre}</td>
            <td className="p-2 w-1/2">
              {editable ? (
                <input
                  type="text"
                  value={esp.valor}
                  onChange={e => handleEdit(idx, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
                />
              ) : (
                <span className="text-white/90">{esp.valor}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
