import React from "react";

export interface DocumentoEquipo {
  nombre: string;
  url: string;
}

export interface DocumentosEquipoProps {
  documentos: DocumentoEquipo[];
  fotoUrl?: string;
}

export const DocumentosEquipo: React.FC<DocumentosEquipoProps> = ({ documentos, fotoUrl }) => {
  return (
    <div className="space-y-4">
      <div>
        <div className="font-bold text-white/80 mb-2">Foto principal:</div>
        <div className="w-40 h-40 bg-white/10 border border-white/20 rounded-md overflow-hidden flex items-center justify-center mb-2">
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto equipo" className="object-cover w-full h-full" />
          ) : (
            <span className="text-xs text-white/30">Sin foto</span>
          )}
        </div>
      </div>
      <div>
        <div className="font-bold text-white/80 mb-2">Documentos adjuntos:</div>
        {documentos.length === 0 ? (
          <div className="text-white/40 text-sm">Sin documentos.</div>
        ) : (
          <ul className="space-y-2">
            {documentos.map((doc, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
                  {doc.nombre}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
