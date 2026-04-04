import React, { useState } from "react";
import { CabeceraEquipo } from "@/components/Equipo/CabeceraEquipo";
import { TabsEquipo } from "@/components/Equipo/TabsEquipo";
import { TablaEspecificaciones, Especificacion } from "@/components/Equipo/TablaEspecificaciones";
import { HistorialEventos, EventoEquipo } from "@/components/Equipo/HistorialEventos";
import { DocumentosEquipo, DocumentoEquipo } from "@/components/Equipo/DocumentosEquipo";
import { ObservacionesEquipo } from "@/components/Equipo/ObservacionesEquipo";

// Ejemplo de datos de equipo (simulado)
const equipoDemo = {
  nombre: "Molino de Bolas 01",
  codigo: "MB-01",
  area: "Molienda",
  ubicacion: "Planta 1",
  fabricante: "Metso",
  modelo: "X123",
  numeroSerie: "SN-456789",
  estado: "ACTIVO",
  fechaArranque: "2020-04-01",
  fotoUrl: "",
  especificaciones: [
    { nombre: "Potencia", valor: "1500 kW" },
    { nombre: "Voltaje", valor: "690 V" },
    { nombre: "Capacidad", valor: "120 t/h" },
    { nombre: "RPM", valor: "980" },
    { nombre: "Peso", valor: "85 t" },
    { nombre: "Presión", valor: "10 bar" },
    { nombre: "Tipo Lubricación", valor: "Baño de aceite" },
  ] as Especificacion[],
  eventos: [
    {
      tipo_evento: "Mantenimiento",
      fecha_evento: "2023-11-10",
      responsable: "Téc. Ramírez",
      descripcion: "Cambio de rodamientos",
      evidencias: [],
    },
    {
      tipo_evento: "Arranque",
      fecha_evento: "2020-04-01",
      responsable: "Ing. López",
      descripcion: "Puesta en marcha inicial",
      evidencias: [],
    },
  ] as EventoEquipo[],
  documentos: [
    { nombre: "Manual Operación.pdf", url: "#" },
    { nombre: "Plano Eléctrico.dwg", url: "#" },
  ] as DocumentoEquipo[],
  observaciones: "Equipo crítico para la línea de molienda.",
};

export default function PaginaEquipoDemo() {
  const [especificaciones, setEspecificaciones] = useState<Especificacion[]>(equipoDemo.especificaciones);
  const [observaciones, setObservaciones] = useState(equipoDemo.observaciones);

  return (
    <div className="min-h-screen bg-[#10131a] text-white">
      <CabeceraEquipo
        nombre={equipoDemo.nombre}
        codigo={equipoDemo.codigo}
        area={equipoDemo.area}
        ubicacion={equipoDemo.ubicacion}
        fabricante={equipoDemo.fabricante}
        modelo={equipoDemo.modelo}
        numeroSerie={equipoDemo.numeroSerie}
        estado={equipoDemo.estado}
        fechaArranque={equipoDemo.fechaArranque}
        fotoUrl={equipoDemo.fotoUrl}
        onSubirFoto={() => alert("Funcionalidad de subir foto próximamente")}
      />
      <div className="max-w-5xl mx-auto mt-8">
        <TabsEquipo
          especificaciones={
            <TablaEspecificaciones
              especificaciones={especificaciones}
              editable={true}
              onChange={setEspecificaciones}
            />
          }
          historial={<HistorialEventos eventos={equipoDemo.eventos} />}
          documentos={<DocumentosEquipo documentos={equipoDemo.documentos} fotoUrl={equipoDemo.fotoUrl} />}
          observaciones={
            <ObservacionesEquipo
              observaciones={observaciones}
              editable={true}
              onChange={setObservaciones}
            />
          }
        />
      </div>
    </div>
  );
}
