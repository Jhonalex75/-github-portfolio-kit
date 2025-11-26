# =====================================================================================
# SCRIPT DIDÁCTICO: ANÁLISIS ESTÁTICO DE VIGA EN L
# Versión con comentarios explicativos línea por línea
# =====================================================================================

# ---------------------------------------------
# DESCRIPCIÓN DEL PROBLEMA FÍSICO:
# Se analiza una estructura en forma de "L" sometida a cargas.
# - El apoyo en el PUNTO A solo ofrece una reacción horizontal (R_Ax).
# - El apoyo en el PUNTO D ofrece una reacción vertical (R_Dy) y un momento (M_D).
# El script calculará estas reacciones y generará los diagramas de cortante y momento.
# ---------------------------------------------

# --- PASO 0: IMPORTACIÓN DE LIBRERÍAS ---

# Importamos funciones específicas de la librería SymPy para el cálculo simbólico (álgebra).
from sympy import symbols, Eq, solve, simplify
# Importamos la librería Matplotlib para poder crear los gráficos al final.
import matplotlib.pyplot as plt
# Importamos la librería NumPy para cálculos numéricos eficientes, especialmente con arreglos.
import numpy as np


# ==================================================
# 1. DECLARACIÓN DE VARIABLES SIMBÓLICAS
# ==================================================
# Usamos la función 'symbols' de SymPy para crear variables matemáticas sin asignarles un valor numérico.
# 'real=True' le indica a SymPy que estas variables son números reales, lo que facilita los cálculos.

# R_Ax, R_Dy, M_D: Son las tres REACCIONES desconocidas que queremos encontrar.
R_Ax, R_Dy, M_D = symbols('R_Ax R_Dy M_D', real=True)

# F_C, F_E, F_F: Representan las FUERZAS externas que se aplican a la viga.
F_C, F_E, F_F = symbols('F_C F_E F_F', real=True)

# x_E, x_F, y_C, ...: Representan las COORDENADAS y dimensiones geométricas de la estructura.
x_E, x_F, y_C, y_D, y_A = symbols('x_E x_F y_C y_D y_A', real=True)


# ==================================================
# 2. ECUACIONES DE EQUILIBRIO GLOBAL
# ==================================================
# Aquí aplicamos las tres condiciones fundamentales de la estática en 2D.

# Ecuación 1: Sumatoria de fuerzas en el eje X debe ser igual a cero (ΣFx = 0).
eq_Fx = Eq(R_Ax + F_C, 0)

# Ecuación 2: Sumatoria de fuerzas en el eje Y debe ser igual a cero (ΣFy = 0).
# Las fuerzas F_E y F_F se restan porque se asume que actúan hacia abajo.
eq_Fy = Eq(R_Dy - F_E - F_F, 0)

# Ecuación 3: Sumatoria de momentos con respecto a un punto (en este caso, D) debe ser cero (ΣM_D = 0).
# Un momento es 'fuerza por distancia (brazo de palanca)'.
# La convención usada es que el momento anti-horario es positivo.
eq_MD = Eq(M_D + F_C*(y_C - y_D) - F_E*x_E - F_F*x_F + R_Ax*(y_A - y_D), 0)

# Ahora, resolvemos el sistema de 3 ecuaciones con 3 incógnitas (R_Ax, R_Dy, M_D).
# La función 'solve' hace todo el trabajo algebraico por nosotros.
# 'dict=True' devuelve la solución como un diccionario, que es fácil de usar.
# '[0]' selecciona el primer (y único) conjunto de soluciones.
sol = solve([eq_Fx, eq_Fy, eq_MD], [R_Ax, R_Dy, M_D], dict=True)[0]

# Imprimimos la solución en su forma GENERAL (simbólica), antes de usar números.
# Esto nos da las fórmulas para las reacciones.
print("=== SOLUCIÓN SIMBÓLICA (FÓRMULAS GENERALES) ===")
# Iteramos sobre cada variable en la solución para imprimirla.
for var in sol:
    # 'simplify' muestra la fórmula de la manera más simple posible.
    print(f"{var} = {simplify(sol[var])}")


# ==================================================
# 3. SUSTITUCIÓN DE VALORES NUMÉRICOS
# ==================================================
# Creamos un diccionario para almacenar los valores numéricos específicos del problema.
# Las fuerzas están en Newtons (N) y las distancias en milímetros (mm).
subs_vals = {
    F_C: 5000, F_E: 5000, F_F: 5000, # Fuerzas
    x_E: 550, x_F: 1150,             # Coordenadas X
    y_C: 450, y_D: 800, y_A: 0       # Coordenadas Y
}

# Usamos el método '.subs()' para sustituir los valores numéricos en las fórmulas simbólicas.
R_Ax_num = sol[R_Ax].subs(subs_vals) # Calcula el valor numérico de R_Ax
R_Dy_num = sol[R_Dy].subs(subs_vals) # Calcula el valor numérico de R_Dy
M_D_num = sol[M_D].subs(subs_vals)   # Calcula el valor numérico de M_D

# Imprimimos los resultados numéricos de las reacciones.
print("\n=== RESULTADOS NUMÉRICOS (REACCIONES) ===")
print(f"R_Ax = {R_Ax_num} N")
print(f"R_Dy = {R_Dy_num} N")
print(f"M_D  = {M_D_num} N·mm ({M_D_num/1e6:.2f} kN·m)") # Se muestra también en kN·m


# ==================================================
# 4. FUERZAS INTERNAS EN SECCIONES ESPECÍFICAS
# ==================================================
# Definimos la ubicación de la sección de corte 'aa' en la viga horizontal.
x_aa = 200  # mm desde el punto D

# Calculamos las fuerzas internas (Normal, Cortante, Momento) en la sección 'aa'.
N_aa = 0  # Fuerza Normal (axial a la viga). Es cero porque no hay fuerzas horizontales en este tramo.
V_aa = R_Dy_num  # Fuerza Cortante (perpendicular). Es igual a la reacción vertical en D.
M_aa = M_D_num - R_Dy_num * x_aa  # Momento Flector en el punto 'aa'.

# Calculamos las fuerzas internas en una sección 'bb' de la viga vertical.
N_bb = -R_Dy_num # La Normal en la viga vertical es causada por las fuerzas verticales.
V_bb = R_Ax_num + F_C # El Cortante en la viga vertical es causado por las fuerzas horizontales.
M_bb = -R_Ax_num * (subs_vals[y_D] - subs_vals[y_A]) # Momento en la base de la viga vertical.

# Imprimimos los resultados de las fuerzas internas en los puntos de interés.
print("\n=== FUERZAS INTERNAS EN PUNTOS ESPECÍFICOS ===")

#print(f"Sección aa (x={x_aa}mm) → N={N_aa:.0f} N, V={V_aa:.0f} N, M={M_aa/1e6:.2f} kN·m")
# print(f"Sección bb → N = {N_bb:.0f} N, V = {V_bb:.0f} N, M = {M_bb:.0f} N·mm = {M_bb/1e6:.2f} kN·m")


# ==================================================
# 5. CÁLCULO PARA DIAGRAMAS (VIGA HORIZONTAL)
# ==================================================
# Para graficar, necesitamos calcular los valores de V y M en muchos puntos a lo largo de la viga.

# Obtenemos la longitud total de la viga horizontal desde el diccionario de valores.
L = subs_vals[x_F]  # 1150 mm

# Creamos un arreglo de 200 puntos equiespaciados entre 0 y L. Este será nuestro eje X.
x = np.linspace(0, L, 200)

# --- Cálculo del Diagrama de Cortante (V) ---
# La fuerza cortante cambia en los puntos donde se aplican cargas. Usamos 'np.piecewise'
# para definir una función por tramos.
# Estructura: np.piecewise(eje_x, [condición1, condición2, ...], [función1, función2, ...])
V = np.piecewise(
    x, # El arreglo de puntos donde se evaluará.
    # Lista de condiciones para cada tramo de la viga:
    [
        x < subs_vals[x_E],                                     # Tramo 1: antes de la carga F_E
        (x >= subs_vals[x_E]) & (x < subs_vals[x_F]),           # Tramo 2: entre F_E y F_F
        x >= subs_vals[x_F]                                     # Tramo 3: después de la carga F_F
    ],
    # Lista de funciones (o valores) para cada tramo:
    [
        lambda x: R_Dy_num,                                     # En el tramo 1, V es constante = R_Dy
        lambda x: R_Dy_num - subs_vals[F_E],                    # En el tramo 2, V disminuye por el valor de F_E
        lambda x: R_Dy_num - subs_vals[F_E] - subs_vals[F_F]    # En el tramo 3, V disminuye de nuevo por F_F
    ]
)

# --- Cálculo del Diagrama de Momento (M) ---
# Hacemos lo mismo para el momento flector. Las ecuaciones son la integral de las de cortante.
M = np.piecewise(
    x, # El mismo eje x.
    # Las mismas condiciones para los tramos.
    [x < subs_vals[x_E], (x >= subs_vals[x_E]) & (x < subs_vals[x_F]), x >= subs_vals[x_F]],
    # Las ecuaciones del momento para cada tramo.
    [
        lambda x: M_D_num - R_Dy_num*x,
        lambda x: M_D_num - R_Dy_num*x + subs_vals[F_E]*(x - subs_vals[x_E]),
        lambda x: M_D_num - R_Dy_num*x + subs_vals[F_E]*(x - subs_vals[x_E]) + subs_vals[F_F]*(x - subs_vals[x_F])
    ]
)


# ==================================================
# 6. GRAFICAR LOS DIAGRAMAS
# ==================================================
# Ahora usamos Matplotlib para visualizar los resultados calculados.

# Crea la figura principal (la ventana del gráfico) con un tamaño de 10x6 pulgadas.
plt.figure(figsize=(10, 6))

# --- Primer Gráfico: Diagrama de Cortante ---
# Divide la figura en 2 filas y 1 columna, y selecciona el primer espacio para graficar.
plt.subplot(2, 1, 1)
# Dibuja los puntos (x, V) con una línea azul ('b') de grosor 2. Convertimos V a kN.
plt.plot(x, V/1000, 'b', linewidth=2)
# Rellena el área entre la línea del diagrama y el eje cero para mayor claridad.
plt.fill_between(x, 0, V/1000, color='skyblue', alpha=0.3)
# Añade un título al gráfico.
plt.title("Diagrama de Fuerza Cortante (Viga Horizontal)")
# Etiqueta el eje X.
plt.xlabel("Distancia desde D [mm]")
# Etiqueta el eje Y.
plt.ylabel("Cortante (V) [kN]")
# Muestra una cuadrícula de fondo.
plt.grid(True)

# --- Segundo Gráfico: Diagrama de Momento Flector ---
# Selecciona el segundo espacio de la figura para el siguiente gráfico.
plt.subplot(2, 1, 2)
# Dibuja los puntos (x, M) con una línea roja ('r'). Convertimos M de N·mm a kN·m.
plt.plot(x, np.array(M)/1e6, 'r', linewidth=2)
# Rellena el área del diagrama de momento.
plt.fill_between(x, 0, np.array(M)/1e6, color='lightcoral', alpha=0.3)
# Añade los títulos y etiquetas correspondientes.
plt.title("Diagrama de Momento Flector (Viga Horizontal)")
plt.xlabel("Distancia desde D [mm]")
plt.ylabel("Momento (M) [kN·m]")
plt.grid(True)

# Ajusta automáticamente el espaciado entre los gráficos para que no se solapen los títulos.
plt.tight_layout()
# Muestra la ventana con los gráficos finalizados.
plt.show()