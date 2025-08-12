# GRÚA — Análisis simplificado de cargas y estabilidad

## Objetivo
Proveer una guía para estimar cargas, reacciones, tensiones en cable y verificación de estabilidad para una grúa sencilla (pluma + base), con enfoque didáctico.

## Alcance y supuestos
- Pluma rígida en plano, cable ideal salvo peso propio despreciable.
- Apoyos definidos (pivote/base y apoyo secundario si aplica).
- Análisis estático cuasiestático; sin dinámica ni ráfagas de viento.

## Teoría esencial
- Equilibrio en 2D:  
  \( \sum F_x = 0, \; \sum F_y = 0, \; \sum M_O = 0 \)
- Tensión en cable por momentos:
  \[ T = \frac{W\,r_W + W_p\,r_p - R_c\,r_c}{r_T} \]
  Donde `r_*` son brazos respecto a un punto `O` (pivote/base), y `R_c` reacciones si corresponden.
- Reacciones en base: despejes de ecuaciones de equilibrio.
- Estabilidad (antivuelco):  
  \( M_{resistente} > M_{vuelco} \cdot SF \), SF típico ≥ 1.5–2 (adaptar a norma).

## Entradas
- `W` carga suspendida [N]
- `L` longitud de pluma [m], `theta` ángulo respecto a la horizontal [rad o deg]
- `m_pluma` masa de la pluma [kg] (opcional) → `W_p=m_pluma*g`
- `r_T` brazo del cable, `r_W` brazo de la carga, `r_p` del peso pluma [m]
- `SF_estab` factor de seguridad de estabilidad

## Salidas
- `T` tensión estimada en el cable [N]
- Reacciones en base (`R_ax`, `R_ay`, momento si aplica)
- Verificación de estabilidad (`cumple` / `no cumple`)

## Procedimiento
1) Define sistema y punto de momentos `O` (pivote/base). Calcula brazos `r_*` geométricamente con `L` y `theta`.
2) Aplica \(\sum M_O=0\) para estimar `T` y/o reacciones.
3) Aplica \(\sum F_x=0\), \(\sum F_y=0\) para cerrar el sistema.
4) Estabilidad: compara momentos estabilizadores vs de vuelco con `SF_estab`.

## Ejemplo numérico (simplificado)
- Datos: `W=5000 N`, `L=3 m`, `theta=45°`, `m_pluma=15 kg` (→ `W_p≈147 N`), `r_W=2.6 m`, `r_p=1.5 m`, `r_T=2.9 m`, `SF_estab=1.8`.
- Tensión: \( T \approx (W\,r_W + W_p\,r_p)/r_T = (5000\cdot2.6 + 147\cdot1.5)/2.9 \approx 4483\,N \)
- Verifica reacciones en base con \(\sum F\) y \(\sum M\).
- Estabilidad: evalúa \( M_{res} \) vs \( M_{vuelco} \).

## Uso (rápido) con Python
```bash
python -m venv .venv && .\.venv\Scripts\activate
pip install numpy
```
```python
import numpy as np

g = 9.81
W = 5000.0
L = 3.0
theta = np.deg2rad(45)
m_pluma = 15.0
Wp = m_pluma*g
r_W = 2.6
r_p = 1.5
r_T = 2.9

T = (W*r_W + Wp*r_p)/r_T
print({"Tension_N": T})
```

## Validación y notas
- Considera el peso del gancho, accesorios y fricción en poleas reales.
- Ajusta `SF_estab` según normativa local/industrial.
- Para diseños reales, realizar análisis de resistencia (esfuerzos en pluma, uniones, cimientos) y revisión por profesional responsable.

## Pruebas sugeridas
- Consistencia geométrica: si `theta` aumenta (más vertical), ver impacto en `r_*` y `T`.
- Límites: `W=0`, `m_pluma=0`.

## Roadmap
- Optimización de geometría por límite de `T` y estabilidad.
- Visualización de diagrama de cuerpo libre.
- Integración con selección de cable/polipasto.

## Licencia
MIT (o la del repositorio donde se utilice).
