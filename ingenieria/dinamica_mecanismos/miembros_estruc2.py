# ============================================================================
# ANÁLISIS DE ENTRAMADO RÍGIDO - PROBLEMA 8-22
# Autor: Gemini con correcciones y mejoras
# Versión 3: Incluye visualización con Diagramas de Cuerpo Libre (DCL)
# ESTA ES LA VERSIÓN CORRECTA QUE NO PRODUCE EL ERROR DE CODIFICACIÓN
# ============================================================================

import sympy as sp
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np # Necesario para algunas funciones de dibujo

# --- PASO 1: CONFIGURACIÓN INICIAL Y DEFINICIÓN DE VARIABLES ---
print("="*80)
print(" PASO 1: CONFIGURACION INICIAL Y DEFINICION DE VARIABLES")
print("="*80)

R_Ax, R_Ay, M_A = sp.symbols('R_Ax R_Ay M_A', real=True)
N_aa, V_aa, M_aa = sp.symbols('N_aa V_aa M_aa', real=True)
N_bb, V_bb, M_bb = sp.symbols('N_bb V_bb M_bb', real=True)
print("Variables simbolicas creadas.")
print("\n")

# --- PASO 2: DATOS DEL PROBLEMA (Según Figura P8-22) ---
print("="*80)
print(" PASO 2: DATOS DEL PROBLEMA (INTERPRETACION DE LA FIGURA P8-22)")
print("="*80)

F_C = 5000
F_E = 5000
F_F = 5000
y_A, y_B, y_C, y_D = 0, 300, 450, 800
x_A, x_B, x_C, x_D = 0, 0, 0, 0
x_E = 550
x_F = 750
y_E = y_B
y_F = y_B
x_aa = 200
y_bb = 600
print("Datos del problema cargados.")
print("\n")

# --- PASO 3: CÁLCULO DE REACCIONES EXTERNAS EN EL APOYO A ---
print("="*80)
print(" PASO 3: CALCULO DE REACCIONES EXTERNAS EN EL APOYO A")
print("="*80)

eq_Fx = sp.Eq(R_Ax + F_C, 0)
eq_Fy = sp.Eq(R_Ay - F_E - F_F, 0)
eq_MA = sp.Eq(M_A + (F_C * y_C) - (F_E * x_E) - (F_F * x_F), 0)

print("Ecuaciones de equilibrio para las reacciones:")
print("Suma(Fx) = 0  => ", end=""); sp.pprint(eq_Fx)
print("Suma(Fy) = 0  => ", end=""); sp.pprint(eq_Fy)
print("Suma(MA) = 0  => ", end=""); sp.pprint(eq_MA)

sol_reacciones = sp.solve([eq_Fx, eq_Fy, eq_MA], [R_Ax, R_Ay, M_A])
R_Ax_val = float(sol_reacciones[R_Ax])
R_Ay_val = float(sol_reacciones[R_Ay])
M_A_val = float(sol_reacciones[M_A])

print("\nResultados de las reacciones en A:")
print(f"  R_Ax = {R_Ax_val:.0f} N")
print(f"  R_Ay = {R_Ay_val:.0f} N")
print(f"  M_A = {M_A_val:.0f} N·mm ({M_A_val/1000:.2f} N·m)")
print("\n")

# --- PASO 4: CÁLCULO DE FUERZAS INTERNAS EN LA SECCIÓN aa ---
print("="*80)
print(" PASO 4: FUERZAS INTERNAS EN LA SECCION aa")
print("="*80)

eq_aa_N = sp.Eq(R_Ax_val + F_C + N_aa, 0)
eq_aa_V = sp.Eq(R_Ay_val - V_aa, 0)
eq_aa_M = sp.Eq(M_A_val + (R_Ay_val * x_aa) + F_C * (y_D - y_C) + M_aa, 0)

print("Ecuaciones de equilibrio para el DCL de la seccion aa (parte izquierda):")
print(f"Suma(Fx) = 0      => {R_Ax_val:.0f} + {F_C} + N_aa = 0")
print(f"Suma(Fy) = 0      => {R_Ay_val:.0f} - V_aa = 0")
print("Suma(M_corte) = 0 => ... (resuelta numericamente)")

sol_aa = sp.solve([eq_aa_N, eq_aa_V, eq_aa_M], [N_aa, V_aa, M_aa])
N_aa_val = float(sol_aa[N_aa])
V_aa_val = float(sol_aa[V_aa])
M_aa_val = float(sol_aa[M_aa])

print("\nResultados de las fuerzas internas en la seccion aa:")
print(f"  Normal (N_aa) = {N_aa_val:.0f} N")
print(f"  Cortante (V_aa) = {V_aa_val:.0f} N")
print(f"  Momento (M_aa) = {M_aa_val:.0f} N·mm ({M_aa_val/1000:.2f} N·m)")
print("\n")

# --- PASO 5: CÁLCULO DE FUERZAS INTERNAS EN LA SECCIÓN bb ---
print("="*80)
print(" PASO 5: FUERZAS INTERNAS EN LA SECCION bb")
print("="*80)

eq_bb_V = sp.Eq(R_Ax_val + F_C + V_bb, 0)
eq_bb_N = sp.Eq(R_Ay_val + N_bb, 0)
eq_bb_M = sp.Eq(M_A_val + F_C * (y_bb - y_C) + M_bb, 0)

print("Ecuaciones de equilibrio para el DCL de la seccion bb (parte inferior):")
print(f"Suma(Fx) = 0      => {R_Ax_val:.0f} + {F_C} + V_bb = 0")
print(f"Suma(Fy) = 0      => {R_Ay_val:.0f} + N_bb = 0")
print(f"Suma(M_corte) = 0 => {M_A_val:.0f} + {F_C}*({y_bb}-{y_C}) + M_bb = 0")

sol_bb = sp.solve([eq_bb_N, eq_bb_V, eq_bb_M], [N_bb, V_bb, M_bb])
N_bb_val = float(sol_bb[N_bb])
V_bb_val = float(sol_bb[V_bb])
M_bb_val = float(sol_bb[M_bb])

print("\nResultados de las fuerzas internas en la seccion bb:")
print(f"  Normal (N_bb) = {N_bb_val:.0f} N")
print(f"  Cortante (V_bb) = {V_bb_val:.0f} N")
print(f"  Momento (M_bb) = {M_bb_val:.0f} N·mm ({M_bb_val/1000:.2f} N·m)")
print("\n")

# --- PASO 6: VISUALIZACIÓN DE DIAGRAMAS DE CUERPO LIBRE ---
print("="*80)
print(" PASO 6: GENERANDO DIAGRAMAS DE CUERPO LIBRE...")
print("="*80)

fig, axs = plt.subplots(2, 2, figsize=(18, 14))
fig.suptitle('Análisis Estructural y Diagramas de Cuerpo Libre (DCL)', fontsize=16, weight='bold')

def draw_arrow(ax, x, y, dx, dy, label, color):
    ax.arrow(x, y, dx, dy, head_width=30, head_length=50, fc=color, ec=color, length_includes_head=True)
    ax.text(x + dx*1.2, y + dy*1.2, label, color=color, ha='center', va='center', fontsize=10, weight='bold')

def draw_moment(ax, x, y, value, label, color):
    direction = 'ccw' if value > 0 else 'cw'
    start_angle = 180 if direction == 'ccw' else 90
    end_angle = 270 if direction == 'ccw' else 0
    arc = patches.Arc((x, y), 150, 150, angle=0, theta1=start_angle, theta2=end_angle, linewidth=1.5, color=color, linestyle='-')
    ax.add_patch(arc)
    if direction == 'ccw':
        ax.plot(x, y + 75, marker='^', color=color, markersize=6)
        ax.text(x - 100, y, label, color=color, ha='center', va='center', fontsize=10, weight='bold')
    else:
        ax.plot(x - 75, y, marker='<', color=color, markersize=6)
        ax.text(x + 100, y, label, color=color, ha='center', va='center', fontsize=10, weight='bold')

ax = axs[0, 0]
ax.set_title('DCL General y Reacciones en A', weight='bold')
ax.plot([x_A, x_F], [y_B, y_B], 'k-', lw=3, solid_capstyle='round')
ax.plot([x_A, x_A], [y_A, y_D], 'k-', lw=3, solid_capstyle='round')
ax.plot([x_A, x_D], [y_D, y_D], 'k-', lw=3, solid_capstyle='round')
ax.set_aspect('equal')
ax.grid(True, linestyle='--', alpha=0.6)

draw_arrow(ax, x_C, y_C, 200, 0, f'$F_C={F_C/1000:.0f}$ kN', 'red')
draw_arrow(ax, x_E, y_E, 0, -200, f'$F_E={F_E/1000:.0f}$ kN', 'red')
draw_arrow(ax, x_F, y_F, 0, -200, f'$F_F={F_F/1000:.0f}$ kN', 'red')
draw_arrow(ax, x_A, y_A, -np.sign(R_Ax_val)*200, 0, f'$R_{{Ax}}={-R_Ax_val/1000:.0f}$ kN', 'blue')
draw_arrow(ax, x_A, y_A, 0, np.sign(R_Ay_val)*200, f'$R_{{Ay}}={R_Ay_val/1000:.0f}$ kN', 'blue')
draw_moment(ax, x_A, y_A, M_A_val, f'$M_A={M_A_val/1e6:.2f}$ kNm', 'blue')
ax.set_xlim(-400, 1000)
ax.set_ylim(-200, 1000)

ax = axs[0, 1]
ax.set_title('DCL para Sección aa', weight='bold')
ax.plot([x_A, x_A], [y_A, y_D], 'k-', lw=3)
ax.plot([x_A, x_aa], [y_D, y_D], 'k-', lw=3)
ax.set_aspect('equal')
ax.grid(True, linestyle='--', alpha=0.6)
draw_arrow(ax, x_A, y_A, -np.sign(R_Ax_val)*200, 0, f'$R_{{Ax}}$', 'blue')
draw_arrow(ax, x_A, y_A, 0, np.sign(R_Ay_val)*200, f'$R_{{Ay}}$', 'blue')
draw_moment(ax, x_A, y_A, M_A_val, f'$M_A$', 'blue')
draw_arrow(ax, x_C, y_C, 200, 0, f'$F_C$', 'red')
draw_arrow(ax, x_aa, y_D, 200, 0, f'$N_{{aa}}={N_aa_val/1000:.0f}$ kN', 'green')
draw_arrow(ax, x_aa, y_D, 0, 200, f'$V_{{aa}}={-V_aa_val/1000:.0f}$ kN', 'green')
draw_moment(ax, x_aa, y_D, -M_aa_val, f'$M_{{aa}}={-M_aa_val/1e6:.2f}$ kNm', 'green')
ax.set_xlim(-400, 600)
ax.set_ylim(-200, 1000)

ax = axs[1, 0]
ax.set_title('DCL para Sección bb', weight='bold')
ax.plot([x_A, x_A], [y_A, y_bb], 'k-', lw=3)
ax.set_aspect('equal')
ax.grid(True, linestyle='--', alpha=0.6)
draw_arrow(ax, x_A, y_A, -np.sign(R_Ax_val)*200, 0, f'$R_{{Ax}}$', 'blue')
draw_arrow(ax, x_A, y_A, 0, np.sign(R_Ay_val)*200, f'$R_{{Ay}}$', 'blue')
draw_moment(ax, x_A, y_A, M_A_val, f'$M_A$', 'blue')
draw_arrow(ax, x_C, y_C, 200, 0, f'$F_C$', 'red')
draw_arrow(ax, 0, y_bb, 0, 200, f'$N_{{bb}}={N_bb_val/1000:.0f}$ kN', 'purple')
draw_arrow(ax, 0, y_bb, 200, 0, f'$V_{{bb}}={-V_bb_val/1000:.0f}$ kN', 'purple')
draw_moment(ax, 0, y_bb, -M_bb_val, f'$M_{{bb}}={-M_bb_val/1e6:.2f}$ kNm', 'purple')
ax.set_xlim(-400, 400)
ax.set_ylim(-200, 800)

ax = axs[1, 1]
ax.axis('off')
texto_resultados = f"""
**RESUMEN DE RESULTADOS**

**Reacciones en A:**
$R_{{Ax}} = {R_Ax_val/1000:.2f}$ kN
$R_{{Ay}} = {R_Ay_val/1000:.2f}$ kN
$M_A = {M_A_val/1e6:.2f}$ kN·m

**Sección aa (x={x_aa}mm):**
$N_{{aa}} = {N_aa_val/1000:.2f}$ kN (Compresión)
$V_{{aa}} = {V_aa_val/1000:.2f}$ kN
$M_{{aa}} = {M_aa_val/1e6:.2f}$ kN·m

**Sección bb (y={y_bb}mm):**
$N_{{bb}} = {N_bb_val/1000:.2f}$ kN (Compresión)
$V_{{bb}} = {V_bb_val/1000:.2f}$ kN (Tracción)
$M_{{bb}} = {M_bb_val/1e6:.2f}$ kN·m
"""
ax.text(0.05, 0.95, texto_resultados, ha='left', va='top', fontsize=12,
        bbox=dict(boxstyle='round,pad=0.5', fc='wheat', alpha=0.5))

plt.tight_layout(rect=[0, 0, 1, 0.96])
plt.show()

print("Visualizacion generada. Cierra la ventana del grafico para finalizar el script.")