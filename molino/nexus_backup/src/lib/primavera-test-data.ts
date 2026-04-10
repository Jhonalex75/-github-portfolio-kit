/**
 * Sample Primavera Test Data
 * Datos de prueba realistas para el módulo de análisis
 */

export const SAMPLE_PRIMAVERA_TASKS = [
  {
    ID: 'A1001',
    'Activity Name': 'PROJECT INITIATION',
    'Start Date': '2026-04-01',
    'End Date': '2026-04-15',
    'Duration (Days)': 15,
    '% Complete': 100,
    'Predecessors': '',
    'Slack (Days)': 0,
    'Activity Code': '01.01.01',
  },
  {
    ID: 'A1002',
    'Activity Name': 'SITE PREPARATION',
    'Start Date': '2026-04-16',
    'End Date': '2026-05-30',
    'Duration (Days)': 45,
    '% Complete': 85,
    'Predecessors': 'A1001',
    'Slack (Days)': 0,
    'Activity Code': '01.02.01',
  },
  {
    ID: 'A1003',
    'Activity Name': 'FOUNDATION WORK',
    'Start Date': '2026-06-01',
    'End Date': '2026-08-15',
    'Duration (Days)': 76,
    '% Complete': 60,
    'Predecessors': 'A1002',
    'Slack (Days)': 0,
    'Activity Code': '01.02.02',
  },
  {
    ID: 'A1004',
    'Activity Name': 'STRUCTURAL STEEL',
    'Start Date': '2026-08-16',
    'End Date': '2026-12-20',
    'Duration (Days)': 127,
    '% Complete': 40,
    'Predecessors': 'A1003',
    'Slack (Days)': 0,
    'Activity Code': '01.03.01',
  },
  {
    ID: 'A1005',
    'Activity Name': 'MECHANICAL ROUGHIN',
    'Start Date': '2026-12-21',
    'End Date': '2027-02-28',
    'Duration (Days)': 70,
    '% Complete': 0,
    'Predecessors': 'A1004',
    'Slack (Days)': 0,
    'Activity Code': '02.01.01',
  },
  {
    ID: 'A1006',
    'Activity Name': 'ELECTRICAL ROUGHIN',
    'Start Date': '2026-12-21',
    'End Date': '2027-02-28',
    'Duration (Days)': 70,
    '% Complete': 0,
    'Predecessors': 'A1004',
    'Slack (Days)': 5,
    'Activity Code': '02.02.01',
  },
  {
    ID: 'A1007',
    'Activity Name': 'HVAC INSTALLATION',
    'Start Date': '2027-03-01',
    'End Date': '2027-04-15',
    'Duration (Days)': 46,
    '% Complete': 0,
    'Predecessors': 'A1005',
    'Slack (Days)': 5,
    'Activity Code': '02.03.01',
  },
  {
    ID: 'A1008',
    'Activity Name': 'FINISHES & PAINTING',
    'Start Date': '2027-03-01',
    'End Date': '2027-05-30',
    'Duration (Days)': 91,
    '% Complete': 0,
    'Predecessors': 'A1005,A1006',
    'Slack (Days)': 0,
    'Activity Code': '03.01.01',
  },
  {
    ID: 'A1009',
    'Activity Name': 'EQUIPMENT INSTALLATION',
    'Start Date': '2027-06-01',
    'End Date': '2027-07-15',
    'Duration (Days)': 45,
    '% Complete': 0,
    'Predecessors': 'A1008',
    'Slack (Days)': 0,
    'Activity Code': '03.02.01',
  },
  {
    ID: 'A1010',
    'Activity Name': 'TESTING & COMMISSIONING',
    'Start Date': '2027-07-16',
    'End Date': '2027-08-31',
    'Duration (Days)': 47,
    '% Complete': 0,
    'Predecessors': 'A1009',
    'Slack (Days)': 0,
    'Activity Code': '03.03.01',
  },
];

/**
 * Instrucciones para crear archivo de prueba en Excel:
 * 
 * 1. Abre Excel (o LibreOffice Calc)
 * 2. Copia los encabezados en la primera fila:
 *    ID | Activity Name | Start Date | End Date | Duration (Days) | % Complete | Predecessors | Slack (Days) | Activity Code
 * 
 * 3. Copia los datos siguientes (filas 2-11)
 * 
 * 4. Guarda como "primavera_test.xlsx"
 * 
 * 5. En el módulo, sube el archivo para probar el parser
 * 
 * Este archivo tiene:
 * - 10 actividades con dates reales
 * - Ruta crítica: A1001 → A1002 → A1003 → A1004 → A1005 → A1008 → A1009 → A1010
 * - Duración total: ~500 días
 * - Algunas actividades con holgura (slack > 0)
 * - Estructura WBS de 3 niveles (área.nivel2.nivel3)
 */
