/**
 * SEED SCRIPT: Inserta No Conformidades de prueba en Firestore
 * Uso: node scripts/seed-ncs.mjs
 * Requiere: Node.js >= 18 (fetch nativo)
 */

const PROJECT_ID = "studio-6587601373-5651d";
const API_KEY = "AIzaSyBRYu4WbP9vsSyrZap6tDtkWAijxDZ7CFE";

// ── Autenticación anónima para obtener token ──────────────────────────────────
async function getAuthToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error("No se pudo obtener token: " + JSON.stringify(data));
  console.log("✅ Auth token obtenido (anónimo)");
  return data.idToken;
}

// ── Escribe un documento en Firestore ────────────────────────────────────────
async function writeDoc(token, collectionId, docId, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionId}/${docId}?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Error escribiendo ${docId}: ${JSON.stringify(data.error)}`);
  return data;
}

// ── Helper para convertir a formato Firestore ────────────────────────────────
function str(v) { return { stringValue: v }; }
function num(v) { return { integerValue: String(v) }; }
function bool(v) { return { booleanValue: v }; }

// ── Datos de prueba: 12 NCs realistas para Aris Mining ──────────────────────
const today = new Date();
const daysAgo = (n) => new Date(today - n * 86400000).toISOString();

const TEST_NCS = [
  {
    id: "NC-2026-0013",
    fields: {
      nc_id: str("NC-2026-0013"),
      title: str("Entalles en Bridas"),
      description: str("Se detectaron entalles en bridas durante la inspección en el puerto de Cartagena. Se requiere evaluación de integridad y posible reemplazo."),
      project_code: str("MIL24.001"),
      area: str("Mecánica"),
      severity: str("media"),
      status: str("abierto"),
      reported_by: str("Inspector Cartagena"),
      reported_by_uid: str("usuario_real"),
      creation_date: str(new Date().toISOString()),
      equipment: str("Bridas de tubería"),
      norm_reference: str("API 6A / ISO 9001"),
      observations: str("Se recomienda análisis metalográfico y revisión dimensional."),
    }
  }
];
// --- FIN DEL ARRAY, eliminar cualquier código sobrante de NCs anteriores ---
// --- FIN DEL ARRAY, eliminar cualquier código sobrante de NCs anteriores ---

// --- FIN DEL ARRAY, eliminar cualquier código sobrante de NCs anteriores ---
      severity: str("critica"),
      status: str("en_proceso"),
      reported_by: str("Ing. López"),
      reported_by_uid: str("seed_user"),
      creation_date: str(daysAgo(12)),
      due_date: str(daysAgo(-5)),
      equipment: str("Molino SAG M-01"),
      norm_reference: str("ISO 9001 - 8.7 / API 579"),
      observations: str("Se aplicó soldadura de emergencia. Requiere inspección por NDT antes de reiniciar operación."),
      root_cause: str("Fatiga del material por vibración excesiva del liner de acero. Se identificó desbalance en el sistema de carga de bolas del 18%."),
      correction_plan: str("1. Reparación por soldadura certificada (WPS aprobado)\n2. Inspección NDT (ultrasonido + líquidos penetrantes)\n3. Rebalanceo del sistema de carga\n4. Revisión del programa de mantenimiento preventivo cada 500h"),
    }
  },
  {
    id: "NC-2026-0002",
    fields: {
      nc_id: str("NC-2026-0002"),
      title: str("Fuga de aceite hidráulico en sistema de lubricación de cojinetes"),
      description: str("Fuga severa de aceite ISO VG 320 en el sistema de lubricación de los cojinetes principales del molino de bolas MB-02. Caudal estimado: 15 L/h."),
      project_code: str("MIL24.001"),
      area: str("Lubricación"),
      severity: str("critica"),
      status: str("abierto"),
      reported_by: str("Ing. Martínez"),
      reported_by_uid: str("seed_user"),
      creation_date: str(daysAgo(3)),
      due_date: str(daysAgo(-2)),
      equipment: str("Molino de Bolas MB-02"),
      norm_reference: str("ISO 9001 - 8.7"),
      observations: str("Equipo detenido preventivamente. Producción afectada al 60%."),
    }
  },
  // --- ALTAS ---
  {
    id: "NC-2026-0003",
    fields: {
      nc_id: str("NC-2026-0003"),
      title: str("Desalineación del eje principal de la bomba de pulpa"),
      description: str("Desalineación angular de 0.35mm/m detectada en el eje de la bomba de pulpa BP-07, excediendo el límite de 0.1mm/m establecido en el manual de fabricante."),
      project_code: str("MIL24.001"),
      area: str("Bombas y Tuberías"),
      severity: str("alta"),
      status: str("en_proceso"),
      reported_by: str("Ing. García"),
      reported_by_uid: str("seed_user"),
      creation_date: str(daysAgo(8)),
      due_date: str(daysAgo(2)),
      equipment: str("Bomba de Pulpa BP-07"),
      norm_reference: str("ISO 10816 / ISO 9001 - 8.5"),
      observations: str("Se realizó alineación láser preliminar. Pendiente verificación con carga."),
      root_cause: str("Deformación térmica del basamento de concreto por variaciones de temperatura en el turno nocturno."),
      correction_plan: str("1. Alineación láser con equipo certificado\n2. Verificación bajo carga operativa\n3. Instalación de sensores de temperatura en basamento"),
    }
  },
  {
    id: "NC-2026-0004",
    fields: {
      nc_id: str("NC-2026-0004"),
      title: str("Desgaste prematuro de liners del molino SAG"),
      description: str("Los liners de goma del molino SAG presentan desgaste del 65% a las 3.200 horas de operación, cuando la vida útil esperada es de 6.000 horas."),
      project_code: str("MIL24.001"),
      area: str("Molienda SAG"),
      severity: str("alta"),
      status: str("abierto"),
      reported_by: str("Ing. Rodríguez"),
      reported_by_uid: str("seed_user"),
      creation_date: str(daysAgo(5)),
      due_date: str(daysAgo(-10)),
      equipment: str("Molino SAG M-01"),
      norm_reference: str("ISO 9001 - 8.4 / Especificación Técnica ET-MOL-001"),
      observations: str("Proveedor notificado. Pendiente análisis de muestra de liner."),
    }
  },
  {
    id: "NC-2026-0005",
    fields: {
      nc_id: str("NC-2026-0005"),
      title: str("Variación de granulometría fuera de especificación en producto P80"),
      description: str("El producto P80 del circuito de molienda presenta D80=210 micras vs. especificación de 180 micras. Condición fuera de rango por 3 turnos consecutivos."),
      project_code: str("EXP24.002"),
      area: str("Control de Proceso"),
      severity: str("alta"),
      status: str("cerrado"),
      reported_by: str("Ing. Vargas"),
      reported_by_uid: str("seed_user"),
      creation_date: str(daysAgo(20)),
      due_date: str(daysAgo(10)),
      closure_date: str(daysAgo(7)),
      equipment: str("Clasificador Espiral CE-03"),
      norm_reference: str("ISO 9001 - 8.6 / Especificación de Proceso EP-001"),
      root_cause: str("Obstrucción parcial en el clasificador de espiral CE-03 por acumulación de arcilla en el zona de desborde."),
      correction_plan: str("1. Limpieza y mantenimiento del clasificador\n2. Ajuste de densidad de pulpa\n3. Implementación de alarma de proceso para P80"),
    }
  },
  // --- MEDIAS ---
  {
    id: "NC-2026-0006",
    fields: {
      nc_id: str("NC-2026-0006"),
      title: str("Ruido anormal en rodamiento del ventilador del colector de polvo"),
      description: str("Se detecta ruido de impacto (knocking) en el rodamiento de soporte del ventilador del colector de polvo CD-02. Nivel de vibración: 8.2mm/s RMS (límite: 4.5mm/s)."),
      project_code: str("MIL24.001"),
      area: str("Sistemas Auxiliares"),
      severity: str("media"),
      status: str("en_proceso"),
      reported_by: str("Ing. Torres"),
      reported_by_uid: str("seed_user"),
      creation_date: str(daysAgo(6)),
      due_date: str(daysAgo(-3)),
      equipment: str("Colector de Polvo CD-02"),
      norm_reference: str("ISO 10816-3 / ISO 9001 - 8.5"),
      observations: str("Rodamiento programado para cambio en próxima parada planificada (15 días)."),
    }
  },
  {
    id: "NC-2026-0007",
    fields: {
      nc_id: str("NC-2026-0007"),
      title: str("Corrosión en tubería de agua de proceso DN200"),
      description: str("Se detectó corrosión generalizada tipo pitting en tramo de 8m de tubería de agua de proceso DN200. Espesor mínimo medido: 3.2mm vs. espesor nominal de 6.3mm."),
      project_code: str("EXP24.002"),
      area: str("Infraestructura"),
      severity: str("media"),
      status: str("cerrado"),
      reported_by: str("Ing. Flores"),
      reported_by_uid: str("seed_user"),
      const TEST_NCS = [
        {
          id: "NC-2026-0013",
          fields: {
            nc_id: str("NC-2026-0013"),
            title: str("Entalles en Bridas"),
            description: str("Se detectaron entalles en bridas durante la inspección en el puerto de Cartagena. Se requiere evaluación de integridad y posible reemplazo."),
            project_code: str("MIL24.001"),
            area: str("Mecánica"),
            severity: str("media"),
            status: str("abierto"),
            reported_by: str("Inspector Cartagena"),
            reported_by_uid: str("usuario_real"),
            creation_date: str(new Date().toISOString()),
            equipment: str("Bridas de tubería"),
            norm_reference: str("API 6A / ISO 9001"),
            observations: str("Se recomienda análisis metalográfico y revisión dimensional."),
          }
        }
      ];
      due_date: str(daysAgo(15)),
