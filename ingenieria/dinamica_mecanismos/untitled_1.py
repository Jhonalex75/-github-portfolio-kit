# ---------------------------------------------
# ANÁLISIS ESTÁTICO: VIGA EN L CON CARGA HORIZONTAL Y VERTICALES
# PUNTO A (solo reacción en X)
# PUNTO D (reacción vertical y momento)
# Incluye diagramas de cortante y momento
# ---------------------------------------------

from sympy import symbols, Eq, solve, simplify
import matplotlib.pyplot as plt

# ==================================================
# 1. DECLARACIÓN DE VARIABLES SIMBÓLICAS
# ==================================================
R_Ax, R_Dy, M_D = symbols('R_Ax R_Dy M_D', real=True)
F_C, F_E, F_F = symbols('F_C F_E F_F', real=True)
x_E, x_F, y_C, y_D, y_A = symbols('x_E x_F y_C y_D y_A', real=True)

# ==================================================
# 2. ECUACIONES DE EQUILIBRIO GLOBAL
# ==================================================
# ΣFx = 0 → R_Ax + F_C = 0
eq_Fx = Eq(R_Ax + F_C, 0)

# ΣFy = 0 → R_Dy - F_E - F_F = 0
eq_Fy = Eq(R_Dy - F_E - F_F, 0)

# ΣM_D = 0 → M_D + F_C*(y_C - y_D) - F_E*x_E - F_F*x_F + R_Ax*(y_A - y_D) = 0
eq_MD = Eq(M_D + F_C*(y_C - y_D) - F_E*x_E - F_F*x_F + R_Ax*(y_A - y_D), 0)

# Resolver sistema simbólico
sol = solve([eq_Fx, eq_Fy, eq_MD], [R_Ax, R_Dy, M_D], dict=True)[0]

print("=== SOLUCIÓN SIMBÓLICA ===")
for var in sol:
    print(f"{var} = {simplify(sol[var])}")

# ==================================================
# 3. SUSTITUCIÓN NUMÉRICA
# ==================================================
subs_vals = {
    F_C: 5000, F_E: 5000, F_F: 5000,
    x_E: 550, x_F: 1150,
    y_C: 450, y_D: 800, y_A: 0
}

R_Ax_num = sol[R_Ax].subs(subs_vals)
R_Dy_num = sol[R_Dy].subs(subs_vals)
M_D_num = sol[M_D].subs(subs_vals)

print("\n=== RESULTADOS NUMÉRICOS ===")
print(f"R_Ax = {R_Ax_num} N")
print(f"R_Dy = {R_Dy_num} N")
print(f"M_D  = {M_D_num} N·mm")

# ==================================================
# 4. FUERZAS INTERNAS EN LAS SECCIONES
# ==================================================
x_aa = 200  # mm

# Sección aa (horizontal)
N_aa = 0
V_aa = R_Dy_num
M_aa = M_D_num - R_Dy_num * x_aa

# Sección bb (vertical)
N_bb = -R_Ax_num
V_bb = -F_C - R_Ax_num
M_bb = F_C * (subs_vals[y_C] - subs_vals[y_A])

print("\n=== FUERZAS INTERNAS ===")
print(f"Sección aa -> N = {N_aa:.0f} N, V = {V_aa:.0f} N, M = {M_aa:.0f} N·mm = {M_aa/1e6:.2f} kN·m")
print(f"Sección bb -> N = {N_bb:.0f} N, V = {V_bb:.0f} N, M = {M_bb:.0f} N·mm = {M_bb/1e6:.2f} kN·m")

# ==================================================
# 5. DIAGRAMAS DE CORTANTE Y MOMENTO (viga horizontal)
# ==================================================
import numpy as np

# Longitud total de la viga horizontal (D-F)
L = subs_vals[x_F]  # 1150 mm

# Distribuir 200 puntos a lo largo
x = np.linspace(0, L, 200)  # medido desde D

# Diagrama de cortante (positivo hacia arriba)
# V(x) = R_Dy - cargas concentradas hasta ese punto
V = np.piecewise(
    x,
    [x < subs_vals[x_E], (x >= subs_vals[x_E]) & (x < subs_vals[x_F]), x >= subs_vals[x_F]],
    [lambda x: R_Dy_num,
     lambda x: R_Dy_num - subs_vals[F_E],
     lambda x: R_Dy_num - subs_vals[F_E] - subs_vals[F_F]]
)

# Diagrama de momento flector
M = np.piecewise(
    x,
    [x < subs_vals[x_E], (x >= subs_vals[x_E]) & (x < subs_vals[x_F]), x >= subs_vals[x_F]],
    [lambda x: M_D_num - R_Dy_num*x,
     lambda x: M_D_num - R_Dy_num*x + subs_vals[F_E]*(x - subs_vals[x_E]),
     lambda x: M_D_num - R_Dy_num*x + subs_vals[F_E]*(x - subs_vals[x_E]) + subs_vals[F_F]*(x - subs_vals[x_F])]
)

# ==================================================
# 6. GRAFICAR RESULTADOS
# ==================================================
plt.figure(figsize=(10,6))

plt.subplot(2,1,1)
plt.plot(x, V/1000, 'b', linewidth=2)
plt.fill_between(x, 0, V/1000, color='skyblue', alpha=0.3)
plt.title("Diagrama de Cortante (kN)")
plt.xlabel("x [mm]")
plt.ylabel("V [kN]")
plt.grid(True)

plt.subplot(2,1,2)
plt.plot(x, np.array(M)/1e6, 'r', linewidth=2)
plt.fill_between(x, 0, np.array(M)/1e6, color='lightcoral', alpha=0.3)
plt.title("Diagrama de Momento Flector (kN·m)")
plt.xlabel("x [mm]")
plt.ylabel("M [kN·m]")
plt.grid(True)

plt.tight_layout()
plt.show()
