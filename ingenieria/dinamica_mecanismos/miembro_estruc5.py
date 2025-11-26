# ============================================================================
# ANÁLISIS DE ENTRAMADO RÍGIDO - PROBLEMA 8-22
# Código corregido y completo (Python)
# Requisitos: sympy, matplotlib, numpy
# ============================================================================
import sympy as sp
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

print("="*80)
print(" ANÁLISIS COMPLETO DEL PROBLEMA 8-22 (VERSIÓN CORREGIDA)")
print("="*80)

# =====================================================================
# PASO 1: VARIABLES SIMBÓLICAS
# =====================================================================
R_Ax, R_Ay, M_A = sp.symbols('R_Ax R_Ay M_A', real=True)
N_aa, V_aa, M_aa = sp.symbols('N_aa V_aa M_aa', real=True)
N_bb, V_bb, M_bb = sp.symbols('N_bb V_bb M_bb', real=True)

# =====================================================================
# PASO 2: DATOS (GEOMETRÍA Y CARGAS)
# =====================================================================
# Cargas (N)
F_C = 0     # NO hay carga horizontal en C según la figura (corrección)
F_E = 5000  # carga vertical en E (N)
F_F = 5000  # carga vertical en F (N)

# Coordenadas (mm)
# Columna vertical A-B-C-D
y_A = 0
y_B = 300
y_C = 450
y_D = 800

x_A = 0
x_B = 0
x_C = 0
x_D = 0

# Barra horizontal BEF (nivel y = 300)
y_E = y_B
y_F = y_B

# Distancias horizontales desde A (mm) (según dibujo: 400, 150, 200, 400)
# A -> punto inmediatamente debajo de la unión izquierda a la barra horizontal = 400 mm
# luego 150 mm, luego 200 mm, luego 400 mm (hasta la carga en F)
x_E = 400 + 150            # = 550 mm
x_F = 400 + 150 + 200 + 400 # = 1150 mm

# Secciones
x_aa = 200   # sección aa (en barra horizontal superior, medida desde la columna)
y_aa = y_D

x_bb = 0
y_bb = 600   # sección bb en la columna (entre C y D, ejemplo intermedio)

print("\nDatos del problema:")
print(f" F_E = {F_E} N, F_F = {F_F} N, F_C = {F_C} N")
print(f" x_E = {x_E} mm, x_F = {x_F} mm")
print(f" Sección aa: x={x_aa} mm, y={y_aa} mm")
print(f" Sección bb: x={x_bb} mm, y={y_bb} mm")

# =====================================================================
# PASO 3: ECUACIONES DE EQUILIBRIO GLOBAL (reacciones en A)
# =====================================================================
eq_Fx = sp.Eq(R_Ax + F_C, 0)            # ΣFx = 0
eq_Fy = sp.Eq(R_Ay - F_E - F_F, 0)      # ΣFy = 0
# ΣM_A = 0, momento respecto a A (anti-horario positivo, convención del código)
# M_A + F_C*y_C - F_E*x_E - F_F*x_F = 0
eq_MA = sp.Eq(M_A + F_C * y_C - F_E * x_E - F_F * x_F, 0)

sol_reac = sp.solve([eq_Fx, eq_Fy, eq_MA], [R_Ax, R_Ay, M_A])
R_Ax_val = float(sol_reac[R_Ax])
R_Ay_val = float(sol_reac[R_Ay])
M_A_val = float(sol_reac[M_A])

print("\nReacciones en A (resultado del sistema global):")
print(f" R_Ax = {R_Ax_val:.0f} N  ({R_Ax_val/1000:.2f} kN)")
print(f" R_Ay = {R_Ay_val:.0f} N  ({R_Ay_val/1000:.2f} kN)")
print(f" M_A  = {M_A_val:.0f} N·mm ({M_A_val/1e6:.2f} kN·m)")

# =====================================================================
# PASO 4: SECCIÓN aa (Barra horizontal superior)
# Convenciones:
#  - N_aa: axial horizontal (positivo si tira hacia la derecha)
#  - V_aa: cortante vertical (positivo hacia arriba en la sección)
#  - M_aa: momento flector (positivo que genera tracción en fibra inferior)
# =====================================================================

# Ecuaciones limpias basadas en el corte a la izquierda de la sección aa
# 1) Normal horizontal: no fuerzas horizontales externas -> N_aa = 0
eq_aa_N = sp.Eq(N_aa, 0)

# 2) Cortante vertical: la cortante transmitida en la unión = reacción vertical R_Ay
#    (si la sección aa corta justo a la derecha de la unión columna->barra)
eq_aa_V = sp.Eq(V_aa - R_Ay_val, 0)

# 3) Momento: M_aa = M_A - R_Ay * x_aa  (distancia horizontal x_aa)
eq_aa_M = sp.Eq(M_aa - (M_A_val - R_Ay_val * x_aa), 0)

sol_aa = sp.solve([eq_aa_N, eq_aa_V, eq_aa_M], [N_aa, V_aa, M_aa])
N_aa_val = float(sol_aa[N_aa])
V_aa_val = float(sol_aa[V_aa])
M_aa_val = float(sol_aa[M_aa])

print("\nFuerzas internas sección aa:")
print(f" N_aa = {N_aa_val:.0f} N ({N_aa_val/1000:.2f} kN)")
print(f" V_aa = {V_aa_val:.0f} N ({V_aa_val/1000:.2f} kN)")
print(f" M_aa = {M_aa_val:.0f} N·mm ({M_aa_val/1e6:.2f} kN·m)")

# =====================================================================
# PASO 5: SECCIÓN bb (Columna izquierda)
# Convenciones:
#  - N_bb: axial vertical (positivo hacia arriba)
#  - V_bb: cortante horizontal (positivo hacia la derecha)
#  - M_bb: momento flector (misma convención que arriba)
# =====================================================================

# 1) Normal vertical: equilibrio vertical en la parte inferior -> N_bb + R_Ay = 0 => N_bb = -R_Ay
eq_bb_N = sp.Eq(N_bb + R_Ay_val, 0)

# 2) Cortante horizontal: V_bb + R_Ax + F_C = 0 (sumando horizontales)
#    pero F_C = 0 y R_Ax calculado -> V_bb = -R_Ax (aquí R_Ax=0)
eq_bb_V = sp.Eq(V_bb + R_Ax_val + F_C, 0)

# 3) Momento en bb: si no hay horizontales entre A y la sección, M_bb = M_A
eq_bb_M = sp.Eq(M_bb - M_A_val, 0)

sol_bb = sp.solve([eq_bb_N, eq_bb_V, eq_bb_M], [N_bb, V_bb, M_bb])
N_bb_val = float(sol_bb[N_bb])
V_bb_val = float(sol_bb[V_bb])
M_bb_val = float(sol_bb[M_bb])

print("\nFuerzas internas sección bb:")
print(f" N_bb = {N_bb_val:.0f} N ({N_bb_val/1000:.2f} kN)  -> (negativo = compresión si tomas positivo hacia arriba)")
print(f" V_bb = {V_bb_val:.0f} N ({V_bb_val/1000:.2f} kN)")
print(f" M_bb = {M_bb_val:.0f} N·mm ({M_bb_val/1e6:.2f} kN·m)")

# =====================================================================
# PASO 6: VISUALIZACIÓN (opcional — gráfico de la estructura y cortantes/momentos)
# =====================================================================
fig, axs = plt.subplots(2, 2, figsize=(18, 14))
fig.suptitle('Análisis Entramado - Problema 8-22 (corregido)', fontsize=16, weight='bold')

def draw_arrow(ax, x, y, dx, dy, label, color, lw=2, text_offset=1.2):
    if abs(dx) > 0.1 or abs(dy) > 0.1:
        ax.arrow(x, y, dx, dy, head_width=30, head_length=50,
                 fc=color, ec=color, length_includes_head=True, linewidth=lw, zorder=10)
    ax.text(x + dx * text_offset, y + dy * text_offset, label, color=color,
            ha='center', va='center', fontsize=10, weight='bold',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8), zorder=11)

def draw_moment(ax, x, y, value, label, color):
    # Dibuja arco para indicar momento (signo por value)
    radius = 120
    direction = 'ccw' if value > 0 else 'cw'
    if direction == 'ccw':
        arc = patches.Arc((x, y), radius, radius, angle=0, theta1=180, theta2=270, linewidth=2, color=color)
        ax.add_patch(arc)
        ax.text(x - 80, y, label, color=color, fontsize=10, weight='bold',
                bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.8))
    else:
        arc = patches.Arc((x, y), radius, radius, angle=0, theta1=90, theta2=0, linewidth=2, color=color)
        ax.add_patch(arc)
        ax.text(x + 80, y, label, color=color, fontsize=10, weight='bold',
                bbox=dict(boxstyle='round,pad=0.2', facecolor='white', alpha=0.8))

# Subplot 1: estructura completa
ax = axs[0,0]
ax.set_title('Estructura completa (cargas y reacciones)', fontsize=12, weight='bold')
ax.set_aspect('equal')
ax.grid(True, linestyle='--', alpha=0.5)
# segmentos que representan la estructura (x,y) en mm
full_structure = [
    [(0, 0), (0, 800)],      # columna izquierda A->D
    [(0, 800), (400, 800)],  # tramo arriba izquierda a derecha (parte superior)
    [(400, 800), (400, 300)],# bajada vertical a la unión superior de columna derecha
    [(0, 300), (750, 300)],  # barra B->E->parte intermedia (dibujada hasta 750 para visual)
    [(750, 300), (750, 800)],# ascenso
    [(400, 800), (750, 800)] # parte superior derecha
]
for seg in full_structure:
    ax.plot([p[0] for p in seg], [p[1] for p in seg], 'k-', lw=6, solid_capstyle='round', alpha=0.6)

# Cargas verticales en E y F
draw_arrow(ax, x_E, y_E, 0, -220, '5 kN', 'red')
draw_arrow(ax, x_F, y_F, 0, -220, '5 kN', 'red')

# Reacciones en A (representación gráfica)
draw_arrow(ax, x_A-80, y_A, -np.sign(R_Ax_val)*120, 0, f'R_Ax={R_Ax_val/1000:.1f} kN', 'green')
draw_arrow(ax, x_A, y_A-120, 0, np.sign(R_Ay_val)*220, f'R_Ay={R_Ay_val/1000:.1f} kN', 'green')
draw_moment(ax, x_A-40, y_A+40, M_A_val, f'M_A={M_A_val/1e6:.2f} kN·m', 'green')

# Secciones de corte marcadas
ax.plot([x_aa - 10, x_aa + 10], [y_aa, y_aa], 'g--', lw=3)
ax.text(x_aa + 40, y_aa + 10, 'aa', color='g', weight='bold')
ax.plot([x_bb, x_bb], [y_bb - 10, y_bb + 10], 'm--', lw=3)
ax.text(x_bb + 30, y_bb + 10, 'bb', color='m', weight='bold')

ax.set_xlim(-200, 1300)
ax.set_ylim(-200, 1000)
ax.set_xlabel('x (mm)'); ax.set_ylabel('y (mm)')

# Subplot 2: DCL sección aa
ax = axs[0,1]
ax.set_title('DCL - Sección aa (parte izquierda del corte)', fontsize=12, weight='bold')
ax.set_aspect('equal'); ax.grid(True, linestyle='--', alpha=0.4)
# dibujo simplificado
ax.plot([0, 600], [y_aa, y_aa], 'k-', lw=8, alpha=0.6)
draw_arrow(ax, x_A-80, y_A, -np.sign(R_Ax_val)*120, 0, 'R_Ax', 'green')
draw_arrow(ax, x_A, y_A-120, 0, np.sign(R_Ay_val)*200, 'R_Ay', 'green')
draw_arrow(ax, x_aa, y_aa, -np.sign(N_aa_val)*140, 0, f'N={N_aa_val/1000:.1f} kN', 'g')
draw_arrow(ax, x_aa, y_aa, 0, -np.sign(V_aa_val)*140, f'V={V_aa_val/1000:.1f} kN', 'g')
draw_moment(ax, x_aa + 40, y_aa - 40, -M_aa_val, f'M={M_aa_val/1e6:.2f} kN·m', 'g')
ax.set_xlim(-200, 800); ax.set_ylim(y_aa-400, y_aa+200)

# Subplot 3: DCL sección bb
ax = axs[1,0]
ax.set_title('DCL - Sección bb (parte inferior)', fontsize=12, weight='bold')
ax.set_aspect('equal'); ax.grid(True, linestyle='--', alpha=0.4)
ax.plot([0, 0], [0, y_bb+200], 'k-', lw=8, alpha=0.6)
draw_arrow(ax, 0, y_bb, 0, -np.sign(N_bb_val)*140, f'N={N_bb_val/1000:.1f} kN', 'm')
draw_arrow(ax, 0, y_bb, -np.sign(V_bb_val)*140, 0, f'V={V_bb_val/1000:.1f} kN', 'm')
draw_moment(ax, 0 + 40, y_bb - 40, -M_bb_val, f'M={M_bb_val/1e6:.2f} kN·m', 'm')
ax.set_xlim(-400, 400); ax.set_ylim(-200, 1000)

# Subplot 4: Tabla resumen
ax = axs[1,1]
ax.axis('off')
ax.set_title('Resumen numérico', fontsize=12, weight='bold')
table_data = [
    ["Componente", "Valor", "Unidades"],
    ["R_Ax", f"{R_Ax_val/1000:.2f}", "kN"],
    ["R_Ay", f"{R_Ay_val/1000:.2f}", "kN"],
    ["M_A", f"{M_A_val/1e6:.2f}", "kN·m"],
    ["", "", ""],
    ["N_aa", f"{N_aa_val/1000:.2f}", "kN"],
    ["V_aa", f"{V_aa_val/1000:.2f}", "kN"],
    ["M_aa", f"{M_aa_val/1e6:.2f}", "kN·m"],
    ["", "", ""],
    ["N_bb", f"{N_bb_val/1000:.2f}", "kN (neg=comp)"],
    ["V_bb", f"{V_bb_val/1000:.2f}", "kN"],
    ["M_bb", f"{M_bb_val/1e6:.2f}", "kN·m"]
]
table = ax.table(cellText=table_data, loc='center', cellLoc='left', colWidths=[0.4,0.3,0.3])
table.auto_set_font_size(False); table.set_fontsize(11); table.scale(1, 2)

plt.tight_layout(rect=[0,0,1,0.96])
plt.show()

print("\nANÁLISIS FINALIZADO. Valores principales (resumen):")
print(f"  R_Ax = {R_Ax_val:.0f} N  ({R_Ax_val/1000:.2f} kN)")
print(f"  R_Ay = {R_Ay_val:.0f} N  ({R_Ay_val/1000:.2f} kN)")
print(f"  M_A  = {M_A_val:.0f} N·mm ({M_A_val/1e6:.2f} kN·m)")
print(f"  N_aa = {N_aa_val:.0f} N, V_aa = {V_aa_val:.0f} N, M_aa = {M_aa_val:.0f} N·mm")
print(f"  N_bb = {N_bb_val:.0f} N, V_bb = {V_bb_val:.0f} N, M_bb = {M_bb_val:.0f} N·mm")
