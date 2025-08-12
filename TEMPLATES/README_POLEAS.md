# POLEAS — Diseño y cálculo de sistemas de poleas

## Objetivo
Proveer una base sólida para dimensionar y analizar sistemas de poleas (levante) con enfoque didáctico: ventaja mecánica, tensiones, eficiencia, selección de cuerda/cable y verificación de seguridad.

## Alcance
- Sistemas ideales y reales (con pérdidas por fricción y flexión).
- Configuraciones 1:1, 2:1, 3:1, n:1 con poleas móviles y fijas.
- Estimación de fuerza de tracción, tensiones y factores de seguridad.

## Teoría esencial
- **Ventaja mecánica (VM)**: número de tramos de cuerda que soportan la carga.
  - Ideal: \( VM = n_{tramos}\)
- **Fuerza de tracción** requerida:
  - Ideal: \( F = \dfrac{W}{VM} \)
  - Real con eficiencia \(\eta\): \( F = \dfrac{W}{VM\,\eta} \), \(0<\eta\le1\)
- **Tensión en la cuerda** (tramo de entrada, ideal): \( T \approx F \)
- **Eficiencia global**: producto de eficiencias por polea y fricción de cuerda.
  - Aproximación: \( \eta = \eta_{polea}^{n_{poleas}} \cdot \eta_{cuerda} \)
- **Diámetro mínimo de polea**: \( D_{min} = k\,d_{cuerda} \). Recomendado: \(k\in[15,25]\) según material.
- **Factor de seguridad (SF)**:
  - \( SF = \dfrac{T_{adm}}{T_{max}} \), objetivo típico: 5–8 para izaje manual básico (adaptar a norma).

## Entradas
- `W` carga [N]
- `VM` ventaja mecánica [–]
- `eta` eficiencia global [0–1]
- `d_cuerda` diámetro de cuerda/cable [m]
- `k` relación D/d recomendada [–]
- `SF_obj` factor de seguridad objetivo [–]

## Salidas
- `F` fuerza de tracción requerida [N]
- `T_max` tensión máxima estimada [N]
- `D_min` diámetro de polea recomendado [m]
- `cumple_SF` verificación contra `SF_obj`

## Procedimiento de cálculo
1) Estima VM por configuración (cuenta tramos portantes).
2) Estima eficiencia \(\eta\) con catálogo o ensayo.
3) Calcula \(F = W/(VM\,\eta)\).
4) Asume \(T_{max}\approx F\) (ideal). Para análisis detallado, distribuye tensiones por tramos con pérdidas.
5) Selecciona \(D_{min}=k\,d_{cuerda}\). Ajusta por fabricante.
6) Verifica \(SF = T_{adm}/T_{max}\ge SF_{obj}\).

## Ejemplo numérico
- Datos: `W=2000 N`, `VM=3`, `eta=0.85`, `d_cuerda=8e-3 m`, `k=20`, `SF_obj=6`.
- Cálculos:  
  \(F = 2000/(3\cdot0.85)=784.31\,N\)  
  \(T_{max}\approx 784.31\,N\)  
  \(D_{min}=20\cdot0.008=0.16\,m\)
- Si `T_adm` de la cuerda ≥ \( SF_{obj}\cdot T_{max} = 6\cdot784.31=4706\,N \), entonces cumple.

## Uso (rápido) con Python
```bash
# entorno
python -m venv .venv && .\.venv\Scripts\activate
pip install numpy
```
```python
import numpy as np

W = 2000.0
VM = 3
eta = 0.85
d_cuerda = 8e-3
k = 20
SF_obj = 6

F = W/(VM*eta)
T_max = F
D_min = k*d_cuerda

print({"F_N":F, "T_max_N":T_max, "D_min_m":D_min})
```

## Validación
- Revisa catálogo de fabricante (tensión admisible, radios mínimos, eficiencia de rodamientos).
- Aplica normativa local si corresponde (izaje/seguridad).

## Pruebas sugeridas (CI)
- Casos límite: `eta∈{1,0.7}`, `VM∈{1,2,3}`, `W=0`.
- Verificación de monotonicidad: si sube `VM`, baja `F`.

## Roadmap
- Distribución de tensiones por tramo con fricción por polea.
- Selección automática de cuerda por SF y masa lineal.
- Visualización de configuraciones (diagramas ASCII/Plotly).

## Licencia
MIT (o la del repositorio donde se utilice).
