# ============================================================================
# ANÁLISIS DE ENTRAMADO RÍGIDO - PROBLEMA 8-22
# Versión Final Corregida y Completa
# Autor: Análisis Estructural con SymPy (Corregido y completado por Gemini)
# ============================================================================

import sympy as sp
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

print("="*80)
print(" ANÁLISIS COMPLETO DEL PROBLEMA 8-22 (VERSIÓN CORREGIDA)")
print("="*80)

# ============================================================================
# PASO 1: DEFINICIÓN DE VARIABLES SIMBÓLICAS
# ============================================================================
print("\nPASO 1: Definición de variables simbólicas")

# Reacciones en el empotramiento A
R_Ax, R_Ay, M_A = sp.symbols('R_Ax R_Ay M_A', real=True)

# Fuerzas internas en sección aa
N_aa, V_aa, M_aa = sp.symbols('N_aa V_aa M_aa', real=True)

# Fuerzas internas en sección bb
N_bb, V_bb, M_bb = sp.symbols('N_bb V_bb M_bb', real=True)

print("Variables simbólicas creadas")

# ============================================================================
# PASO 2: DATOS DEL PROBLEMA - GEOMETRÍA Y CARGAS
# ============================================================================
print("\nPASO 2: Datos del problema")

# Cargas aplicadas (en Newton)
F_C = 5000  # Carga horizontal en C [N]
F_E = 5000  # Carga vertical en E [N]
F_F = 5000  # Carga vertical en F [N]

# Coordenadas de puntos importantes (x, y) en mm
# Barra vertical ABCD
y_A = 0
y_B = 300
y_C = 450  # C está 150 mm arriba de B
y_D = 800  # D está en la parte superior (300 + 150 + 350)

x_A, x_B, x_C, x_D = 0, 0, 0, 0

# Barra horizontal BEF (nivel y = 300 mm)
y_E = y_B
y_F = y_B
x_E = 550  # 400 + 150 = 550 mm desde A
x_F = 750  # 400 + 150 + 200 = 750 mm desde A

# Ubicaciones de las secciones de corte
x_aa = 200  # Sección aa en barra horizontal superior
y_aa = y_D

x_bb = 0    # Sección bb en barra vertical
y_bb = 600  # Punto intermedio entre C (450) y D (800)

print(f"""
Coordenadas de puntos:
  A: ({x_A}, {y_A}) mm - Empotramiento
  B: ({x_B}, {y_B}) mm
  C: ({x_C}, {y_C}) mm - Aplicación de F_C = {F_C/1000} kN
  D: ({x_D}, {y_D}) mm
  E: ({x_E}, {y_E}) mm - Aplicación de F_E = {F_E/1000} kN
  F: ({x_F}, {y_F}) mm - Aplicación de F_F = {F_F/1000} kN

Secciones de corte:
  aa: ({x_aa}, {y_aa}) mm - Barra horizontal superior
  bb: ({x_bb}, {y_bb}) mm - Barra vertical
""")

# ============================================================================
# PASO 3: CÁLCULO DE REACCIONES EN EL EMPOTRAMIENTO A
# ============================================================================
print("="*80)
print(" PASO 3: CÁLCULO DE REACCIONES EN EL EMPOTRAMIENTO A")
print("="*80)

# Ecuaciones de equilibrio global
# ΣFx = 0
eq_Fx = sp.Eq(R_Ax + F_C, 0)

# ΣFy = 0
eq_Fy = sp.Eq(R_Ay - F_E - F_F, 0)

# ΣM_A = 0 (momentos respecto al punto A, anti-horario es positivo)
eq_MA = sp.Eq(M_A + (F_C * y_C) - (F_E * x_E) - (F_F * x_F), 0)

print("\nEcuaciones de equilibrio global:")
print(f"1. Suma(Fx) = 0  =>  R_Ax + {F_C} = 0")
print(f"2. Suma(Fy) = 0  =>  R_Ay - {F_E} - {F_F} = 0")
print(f"3. Suma(M_A) = 0 =>  M_A + {F_C}*{y_C} - {F_E}*{x_E} - {F_F}*{x_F} = 0")

# Resolver el sistema de ecuaciones
sol_reacciones = sp.solve([eq_Fx, eq_Fy, eq_MA], [R_Ax, R_Ay, M_A])

R_Ax_val = float(sol_reacciones[R_Ax])
R_Ay_val = float(sol_reacciones[R_Ay])
M_A_val = float(sol_reacciones[M_A])

print("\nREACCIONES EN EL EMPOTRAMIENTO A:")
print(f"    R_Ax = {R_Ax_val:,.0f} N = {R_Ax_val/1000:.2f} kN")
print(f"    R_Ay = {R_Ay_val:,.0f} N = {R_Ay_val/1000:.2f} kN")
print(f"    M_A  = {M_A_val:,.0f} N·mm = {M_A_val/1e6:.2f} kN·m")

# ============================================================================
# PASO 4: ANÁLISIS DE SECCIÓN aa (Barra horizontal superior)
# ============================================================================
print("\n" + "="*80)
print(" PASO 4: FUERZAS INTERNAS EN SECCIÓN aa")
print("="*80)
print(f"\nUbicación: x = {x_aa} mm, y = {y_aa} mm")
print("Analizando la parte IZQUIERDA/INFERIOR del corte")

# *** CORRECCIÓN DE CONVENCIÓN ***
# En barra HORIZONTAL:
# - Normal (N) actúa en dirección HORIZONTAL (eje x) -> Axial
# - Cortante (V) actúa en dirección VERTICAL (eje y) -> Transversal
# - Momento (M) positivo causa tracción en la fibra inferior (sonrisa)

# Ecuaciones de equilibrio para la parte izquierda/inferior del corte:
# ΣFx = 0 (Fuerza Normal)
eq_aa_N = sp.Eq(R_Ax_val + F_C + N_aa, 0)

# ΣFy = 0 (Fuerza Cortante)
eq_aa_V = sp.Eq(R_Ay_val - V_aa, 0)

# *** CORRECCIÓN DE CÁLCULO DE MOMENTO ***
# ΣM_aa = 0 (Momentos en el corte, anti-horario es positivo)
# Se usa el Método B: Momento de reacción + momentos de fuerzas entre el apoyo y el corte.
eq_aa_M = sp.Eq(M_aa + M_A_val - (R_Ay_val * x_aa) - F_C * (y_aa - y_C), 0)

print("\nEcuaciones de equilibrio para sección aa (Convención Corregida):")
print(f"1. Suma(Fx) = 0 (Normal)   => R_Ax + F_C + N_aa = 0")
print(f"2. Suma(Fy) = 0 (Cortante)  => R_Ay - V_aa = 0")
print(f"3. Suma(M_aa) = 0 (Momento) => M_aa + M_A - M(R_Ay) - M(F_C) = 0")

# Resolver el sistema
sol_aa = sp.solve([eq_aa_N, eq_aa_V, eq_aa_M], [N_aa, V_aa, M_aa])

N_aa_val = float(sol_aa[N_aa])
V_aa_val = float(sol_aa[V_aa])
M_aa_val = float(sol_aa[M_aa])

print("\nFUERZAS INTERNAS EN SECCIÓN aa:")
print(f"    Normal   (N_aa) = {N_aa_val:,.0f} N = {N_aa_val/1000:.2f} kN")
print(f"    Cortante (V_aa) = {V_aa_val:,.0f} N = {V_aa_val/1000:.2f} kN")
print(f"    Momento  (M_aa) = {M_aa_val:,.0f} N·mm = {M_aa_val/1e6:.2f} kN·m")

# ============================================================================
# PASO 5: ANÁLISIS DE SECCIÓN bb (Barra vertical izquierda)
# ============================================================================
print("\n" + "="*80)
print(" PASO 5: FUERZAS INTERNAS EN SECCIÓN bb")
print("="*80)
print(f"\nUbicación: x = {x_bb} mm, y = {y_bb} mm")
print("Analizando la parte INFERIOR del corte (desde el apoyo A)")

# *** CORRECCIÓN DE CONVENCIÓN ***
# En barra VERTICAL:
# - Normal (N) actúa en dirección VERTICAL (eje y) -> Axial
# - Cortante (V) actúa en dirección HORIZONTAL (eje x) -> Transversal
# - Momento (M) positivo causa tracción en la fibra derecha.

# Ecuaciones de equilibrio para la parte inferior:
# ΣFy = 0 (Fuerza Normal)
eq_bb_N = sp.Eq(R_Ay_val + N_bb, 0)

# ΣFx = 0 (Fuerza Cortante)
# La fuerza F_C está por debajo del corte (y_C < y_bb), por lo tanto se incluye.
eq_bb_V = sp.Eq(R_Ax_val + F_C + V_bb, 0)

# ΣM_bb = 0 (Momentos en el corte, anti-horario es positivo)
eq_bb_M = sp.Eq(M_bb + M_A_val + F_C * (y_bb - y_C), 0)

print("\nEcuaciones de equilibrio para sección bb (Convención Corregida):")
print(f"1. Suma(Fy) = 0 (Normal)   => R_Ay + N_bb = 0")
print(f"2. Suma(Fx) = 0 (Cortante)  => R_Ax + F_C + V_bb = 0")
print(f"3. Suma(M_bb) = 0 (Momento) => M_bb + M_A + M(F_C) = 0")

# Resolver el sistema
sol_bb = sp.solve([eq_bb_N, eq_bb_V, eq_bb_M], [N_bb, V_bb, M_bb])

N_bb_val = float(sol_bb[N_bb])
V_bb_val = float(sol_bb[V_bb])
M_bb_val = float(sol_bb[M_bb])

print("\nFUERZAS INTERNAS EN SECCIÓN bb:")
print(f"    Normal   (N_bb) = {N_bb_val:,.0f} N = {N_bb_val/1000:.2f} kN")
print(f"    Cortante (V_bb) = {V_bb_val:,.0f} N = {V_bb_val/1000:.2f} kN")
print(f"    Momento  (M_bb) = {M_bb_val:,.0f} N·mm = {M_bb_val/1e6:.2f} kN·m")

# ============================================================================
# PASO 6: VISUALIZACIÓN GRÁFICA
# ============================================================================
print("\n" + "="*80)
print(" PASO 6: GENERANDO VISUALIZACIONES")
print("="*80)

fig, axs = plt.subplots(2, 2, figsize=(20, 16))
fig.suptitle('Análisis Estructural Completo - Problema 8-22',
             fontsize=18, weight='bold')

def draw_arrow(ax, x, y, dx, dy, label, color, lw=2, text_offset=1.3):
    """Dibuja una flecha con etiqueta"""
    if abs(dx) > 0.1 or abs(dy) > 0.1:
        ax.arrow(x, y, dx, dy, head_width=30, head_length=50,
                 fc=color, ec=color, length_includes_head=True, linewidth=lw, zorder=10)
    ax.text(x + dx * text_offset, y + dy * text_offset, label, color=color,
            ha='center', va='center', fontsize=11, weight='bold',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8), zorder=11)

def draw_moment(ax, x, y, value, label, color):
    """Dibuja un momento con flecha circular"""
    direction = 'ccw' if value > 0 else 'cw'
    start_angle = 180 if direction == 'ccw' else 90
    end_angle = 270 if direction == 'ccw' else 0

    arc = patches.Arc((x, y), 150, 150, angle=0,
                      theta1=start_angle, theta2=end_angle,
                      linewidth=2, color=color, linestyle='-')
    ax.add_patch(arc)

    if direction == 'ccw':
        ax.plot(x, y + 75, marker='^', color=color, markersize=8, zorder=10)
        label_pos = (x - 120, y)
    else:
        ax.plot(x - 75, y, marker='<', color=color, markersize=8, zorder=10)
        label_pos = (x + 120, y)

    ax.text(label_pos[0], label_pos[1], label, color=color,
            ha='center', va='center', fontsize=11, weight='bold',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8), zorder=11)

# ---------------------------------------------
# Subplot 1: Estructura Completa con Reacciones
# ---------------------------------------------
ax = axs[0, 0]
ax.set_title('Estructura Completa, Cargas y Reacciones', weight='bold', fontsize=14)
ax.set_xlabel('x (mm)', fontsize=10)
ax.set_ylabel('y (mm)', fontsize=10)
ax.grid(True, linestyle='--', alpha=0.6)
ax.set_aspect('equal')

# Dibujar estructura
full_structure = [[(0, 0), (0, 800)], [(0, 800), (400, 800)], [(400, 800), (400, 300)],
                  [(0, 300), (750, 300)], [(750, 300), (750, 800)], [(400, 800), (750, 800)]]
for segment in full_structure:
    ax.plot([p[0] for p in segment], [p[1] for p in segment], 'b-', lw=5, solid_capstyle='round', alpha=0.7)

# Cargas
draw_arrow(ax, x_C, y_C, 250, 0, f'5 kN', 'red', lw=3)
draw_arrow(ax, x_E, y_E, 0, -250, f'5 kN', 'red', lw=3, text_offset=1.5)
draw_arrow(ax, x_F, y_F, 0, -250, f'5 kN', 'red', lw=3, text_offset=1.5)

# Reacciones
draw_arrow(ax, x_A - 150, y_A, -np.sign(R_Ax_val)*200, 0, f'R_Ax={abs(R_Ax_val/1000):.1f}kN', 'darkgreen', lw=3, text_offset=1.5)
draw_arrow(ax, x_A, y_A - 150, 0, np.sign(R_Ay_val)*200, f'R_Ay={R_Ay_val/1000:.1f}kN', 'darkgreen', lw=3, text_offset=1.5)
draw_moment(ax, x_A, y_A, M_A_val, f'M_A={M_A_val/1e6:.2f}kN·m', 'darkgreen')

# Secciones de corte
ax.plot([x_aa - 50, x_aa + 50], [y_aa, y_aa], 'g--', lw=3)
ax.text(x_aa + 70, y_aa, 'aa', color='g', weight='bold', fontsize=14)
ax.plot([x_bb, x_bb], [y_bb - 50, y_bb + 50], 'm--', lw=3)
ax.text(x_bb + 20, y_bb + 60, 'bb', color='m', weight='bold', fontsize=14)

ax.set_xlim(-300, 1000)
ax.set_ylim(-300, 1000)

# -------------------------
# Subplot 2: DCL Sección aa
# -------------------------
ax = axs[0, 1]
ax.set_title('DCL - Sección aa (Parte Izquierda/Inferior)', weight='bold', fontsize=14)
ax.set_aspect('equal')
ax.grid(True, linestyle='--', alpha=0.6)

# Estructura cortada
for segment in full_structure:
    ax.plot([p[0] for p in segment], [p[1] for p in segment], 'b-', lw=5, alpha=0.7)
ax.add_patch(patches.Rectangle((x_aa, y_aa-2.5), 600, 5, color='white', zorder=2)) # Ocultar parte derecha

# Cargas y Reacciones
draw_arrow(ax, x_C, y_C, 150, 0, f'5 kN', 'red')
draw_arrow(ax, x_E, y_E, 0, -150, f'5 kN', 'red')
draw_arrow(ax, x_F, y_F, 0, -150, f'5 kN', 'red')
draw_arrow(ax, x_A-80, y_A, -np.sign(R_Ax_val)*150, 0, 'R_Ax', 'darkgreen')
draw_arrow(ax, x_A, y_A-80, 0, np.sign(R_Ay_val)*150, 'R_Ay', 'darkgreen')
draw_moment(ax, x_A, y_A, M_A_val, 'M_A', 'darkgreen')

# Fuerzas internas (Convención estándar)
if abs(N_aa_val) > 1: # Normal es horizontal
    draw_arrow(ax, x_aa, y_aa, -np.sign(N_aa_val)*150, 0, f'N={N_aa_val/1000:.1f}kN', 'g', lw=2.5)
if abs(V_aa_val) > 1: # Cortante es vertical
    draw_arrow(ax, x_aa, y_aa, 0, -np.sign(V_aa_val)*150, f'V={V_aa_val/1000:.1f}kN', 'g', lw=2.5)
draw_moment(ax, x_aa, y_aa, -M_aa_val, f'M={M_aa_val/1e6:.2f}kN·m', 'g') # Momento de reacción

ax.set_xlim(-300, 1000); ax.set_ylim(-300, 1000)
ax.set_xlabel('x (mm)'); ax.set_ylabel('y (mm)')

# -------------------------
# Subplot 3: DCL Sección bb
# -------------------------
ax = axs[1, 0]
ax.set_title('DCL - Sección bb (Parte Inferior)', weight='bold', fontsize=14)
ax.set_aspect('equal')
ax.grid(True, linestyle='--', alpha=0.6)

# Estructura cortada
ax.plot([0, 0], [0, y_bb], 'b-', lw=5, alpha=0.7)

# Cargas y Reacciones
draw_arrow(ax, x_C, y_C, 150, 0, f'5 kN', 'red')
draw_arrow(ax, x_A-80, y_A, -np.sign(R_Ax_val)*150, 0, 'R_Ax', 'darkgreen')
draw_arrow(ax, x_A, y_A-80, 0, np.sign(R_Ay_val)*150, 'R_Ay', 'darkgreen')
draw_moment(ax, x_A, y_A, M_A_val, 'M_A', 'darkgreen')

# Fuerzas internas (Convención estándar)
if abs(N_bb_val) > 1: # Normal es vertical
    draw_arrow(ax, x_bb, y_bb, 0, -np.sign(N_bb_val)*150, f'N={abs(N_bb_val/1000):.1f}kN\n(Comp.)', 'm', lw=2.5)
if abs(V_bb_val) > 1: # Cortante es horizontal
    draw_arrow(ax, x_bb, y_bb, -np.sign(V_bb_val)*150, 0, f'V={V_bb_val/1000:.1f}kN', 'm', lw=2.5)
draw_moment(ax, x_bb, y_bb, -M_bb_val, f'M={abs(M_bb_val/1e6):.2f}kN·m', 'm') # Momento de reacción

ax.set_xlim(-400, 400); ax.set_ylim(-300, 800)
ax.set_xlabel('x (mm)'); ax.set_ylabel('y (mm)')

# -------------------------
# Subplot 4: Tabla de Resultados
# -------------------------
ax = axs[1, 1]
ax.set_title('Tabla Resumen de Resultados', weight='bold', fontsize=14)
ax.axis('off')

# Datos para la tabla
table_data = [
    ["Componente", "Valor", "Unidades"],
    ["", "", ""],
    ["Reacciones en A", "", ""],
    ["Reacción Horizontal (R_Ax)", f"{R_Ax_val/1000:.2f}", "kN"],
    ["Reacción Vertical (R_Ay)", f"{R_Ay_val/1000:.2f}", "kN"],
    ["Momento de Reacción (M_A)", f"{M_A_val/1e6:.2f}", "kN·m"],
    ["", "", ""],
    ["Fuerzas Internas en 'aa'", "", ""],
    ["Fuerza Normal (N_aa)", f"{N_aa_val/1000:.2f}", "kN"],
    ["Fuerza Cortante (V_aa)", f"{V_aa_val/1000:.2f}", "kN"],
    ["Momento Flector (M_aa)", f"{M_aa_val/1e6:.2f}", "kN·m"],
    ["", "", ""],
    ["Fuerzas Internas en 'bb'", "", ""],
    ["Fuerza Normal (N_bb)", f"{N_bb_val/1000:.2f}", "kN (Compresión)"],
    ["Fuerza Cortante (V_bb)", f"{V_bb_val/1000:.2f}", "kN"],
    ["Momento Flector (M_bb)", f"{M_bb_val/1e6:.2f}", "kN·m"]
]

# Crear la tabla
table = ax.table(cellText=table_data, loc='center', cellLoc='left')
table.auto_set_font_size(False)
table.set_fontsize(12)
table.scale(1.1, 2)

# Estilo de la tabla
for (row, col), cell in table.get_celld().items():
    if row == 0:
        cell.set_text_props(weight='bold', color='white')
        cell.set_facecolor('#40466e')
    elif row % 7 == 2:
        cell.set_text_props(weight='bold')
        cell.set_facecolor('#f2f2f2')
    if col == 0:
        cell.set_width(0.5)
    else:
        cell.set_width(0.2)

plt.tight_layout(rect=[0, 0, 1, 0.96])
plt.show()

print("\n\n" + "="*80)
print(" ANÁLISIS FINALIZADO")
print("="*80)