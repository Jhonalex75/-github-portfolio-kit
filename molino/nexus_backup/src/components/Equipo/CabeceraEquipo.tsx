import React from "react";

export interface CabeceraEquipoProps {
  nombre: string;
  codigo: string;
  area: string;
  ubicacion: string;
  fabricante: string;
  modelo: string;
  numeroSerie: string;
  estado: string;
  fechaArranque: string;
  fotoUrl?: string;
  onSubirFoto?: () => void;
}

export const CabeceraEquipo: React.FC<CabeceraEquipoProps> = ({
  nombre,
  codigo,
  area,
  ubicacion,
  fabricante,
  modelo,
  numeroSerie,
  estado,
  fechaArranque,
  fotoUrl,
  onSubirFoto,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-[#181c24] border-b border-white/10">
      <div className="flex flex-col items-center">
        <div className="w-32 h-32 bg-white/10 border border-white/20 rounded-md overflow-hidden flex items-center justify-center mb-2">
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto equipo" className="object-cover w-full h-full" />
          ) : (
            <span className="text-xs text-white/30">Sin foto</span>
          )}
        </div>
        {onSubirFoto && (
          <button
            onClick={onSubirFoto}
            className="mt-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded shadow"
          >
            Tomar/Subir Foto
          </button>
        )}
      </div>
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-white">
        <div>
          <div className="font-bold text-lg mb-1">{nombre}</div>
          <div className="text-xs text-white/40">Código: {codigo}</div>
        </div>
        <div>
          <div>Área: <span className="font-mono-tech text-white/80">{area}</span></div>
          <div>Ubicación: <span className="font-mono-tech text-white/80">{ubicacion}</span></div>
        </div>
        <div>
          <div>Fabricante: <span className="font-mono-tech text-white/80">{fabricante}</span></div>
          <div>Modelo: <span className="font-mono-tech text-white/80">{modelo}</span></div>
          <div>Serie: <span className="font-mono-tech text-white/80">{numeroSerie}</span></div>
        </div>
        <div>
          <div>Estado: <span className="font-mono-tech text-green-400">{estado}</span></div>
          <div className="mt-2 font-bold text-yellow-400">Fecha de arranque: {fechaArranque}</div>
        </div>
      </div>
    </div>
  );
};
