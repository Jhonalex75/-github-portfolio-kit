# ===========================================================================
# ANÁLISIS CINEMÁTICO DE UN MECANISMO DE CUATRO BARRAS CON ACOPLADOR EXTENDIDO
# ===========================================================================
#
# EJERCICIO DE DINÁMICA:
# --------------------
# Este script resuelve el problema de cinemática para un mecanismo de cuatro barras.
# El mecanismo consta de:
# 1. Un eslabón fijo (bancada) que contiene los pivotes fijos O y O'.
# 2. Una manivela (eslabón 2, OA) que rota con una velocidad angular constante.
# 3. Un acoplador (eslabón 3, C-A-B) que es un cuerpo rígido triangular. El punto A
#    se conecta a la manivela, el punto B se conecta al balancín, y C es un
#    punto de interés en una extensión del acoplador.
# 4. Un balancín (eslabón 4, BO') que oscila alrededor del pivote fijo O'.
#
# OBJETIVO DEL CÓDIGO:
# -------------------
# El propósito de este script es:
# - Calcular las posiciones, velocidades y aceleraciones de los puntos clave (A, B, C).
# - Calcular las velocidades y aceleraciones angulares de los eslabones 3 y 4.
# - Generar una animación que visualice el movimiento del mecanismo y los vectores
#   de velocidad y aceleración en tiempo real.
#
# FUNCIONALIDAD DEL CÓDIGO PYTHON:
# --------------------------------
# - Utiliza `numpy` para cálculos numéricos y vectoriales eficientes.
# - Utiliza `matplotlib` para crear la visualización y la animación del mecanismo.
# - Define los parámetros geométricos y cinemáticos del sistema.
# - Implementa una función `calculate_kinematics` que resuelve las ecuaciones de
#   lazo vectorial para encontrar la cinemática en cada instante de tiempo.
# - Utiliza funciones auxiliares para dibujar las diferentes partes del mecanismo
#   (eslabones, juntas, vectores) de forma clara y estilizada.
# - La función `animate` actualiza el estado del sistema en cada fotograma,
#   recalculando la cinemática y redibujando la escena.
# - Muestra un panel de información con los valores cinemáticos actualizados.

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Circle, FancyArrowPatch

# ===========================================================================
# PARÁMETROS DEL MECANISMO
# ===========================================================================
# Define las constantes geométricas y de movimiento del mecanismo.

omega2 = 60.0  # rad/s - Velocidad angular constante del eslabón 2 (manivela OA).
L_OA = 150     # mm - Longitud del eslabón 2 (Manivela OA).
L_AC = 150     # mm - Longitud de la extensión AC en el acoplador. C, A y B son colineales.
L_AB = 550     # mm - Longitud del eslabón 3 (Acoplador AB).
L_BO_prime = 200 # mm - Longitud del eslabón 4 (Balancín BO').
L_OO_prime = 500 # mm - Distancia fija entre los pivotes O y O'.

# ===========================================================================
# FUNCIÓN DE CÁLCULO CINEMÁTICO
# ===========================================================================
def calculate_kinematics(theta2, omega2):
    """
    Calcula la cinemática completa del mecanismo para un ángulo de entrada theta2.
    En esta versión, C es una extensión del acoplador AB, formando un eslabón rígido C-A-B.
    La función devuelve un diccionario con los resultados o None si la posición no es válida.
    """
    # --- PUNTOS FIJOS ---
    # Define las coordenadas de los pivotes fijos en el plano.
    O = np.array([0, 0])
    O_prime = np.array([L_OO_prime, 0])

    # --- ANÁLISIS DE POSICIÓN (Eslabones 2, 3 y 4) ---
    # Calcula la posición del punto A basándose en el ángulo de la manivela.
    A = L_OA * np.array([np.cos(theta2), np.sin(theta2)])
    
    # Para encontrar la posición de B, se resuelve la intersección de dos círculos:
    # uno centrado en A con radio L_AB, y otro en O' con radio L_BO_prime.
    d = np.linalg.norm(A - O_prime) # Distancia entre A y O'.

    # Comprueba si los eslabones pueden conectarse (condición de Grashof implícita).
    # Si la distancia 'd' es mayor que la suma de las longitudes o menor que su diferencia,
    # el mecanismo no puede ensamblarse.
    if d > (L_AB + L_BO_prime) or d < abs(L_AB - L_BO_prime):
        return None # Retorna None si la configuración es imposible.

    # Se utiliza la ley de cosenos para encontrar la posición de B.
    # 'a_val' es la proyección del vector AB sobre el vector AO'.
    a_val = (L_AB**2 - L_BO_prime**2 + d**2) / (2 * d)
    
    # 'h' es la altura del triángulo ABO' desde el vértice B.
    sqrt_arg = L_AB**2 - a_val**2
    if sqrt_arg < 0: return None # Evita errores de dominio en la raíz cuadrada.
    h = np.sqrt(sqrt_arg)
    
    # P2 es el punto de proyección sobre la línea AO'.
    P2 = A + a_val * (O_prime - A) / d
    
    # Calcula las coordenadas de B usando P2 y la altura h.
    # Se elige una de las dos posibles soluciones para B (la que corresponde a la configuración del mecanismo).
    Bx = P2[0] + h * (O_prime[1] - A[1]) / d
    By = P2[1] - h * (O_prime[0] - A[0]) / d
    B = np.array([Bx, By])

    # Calcula los ángulos de los eslabones 3 y 4.
    theta3 = np.arctan2(B[1] - A[1], B[0] - A[0]) # Ángulo del acoplador AB.
    theta4 = np.arctan2(B[1] - O_prime[1], B[0] - O_prime[0]) # Ángulo del balancín BO'.

    # --- ANÁLISIS DE POSICIÓN (Punto C en el acoplador) ---
    # C es una extensión rígida de A a lo largo de la línea B-A.
    vec_AB = B - A
    unit_vec_AB = vec_AB / np.linalg.norm(vec_AB) # Vector unitario en la dirección de A a B.
    C = A - unit_vec_AB * L_AC # C se encuentra en la dirección opuesta a B desde A.

    # --- ANÁLISIS DE VELOCIDAD ---
    # Ecuación de lazo de velocidad: vB = vA + vB/A
    # Se resuelve un sistema de ecuaciones lineales para omega3 y omega4.
    
    # Velocidad del punto A (vA = omega2 x r_OA).
    vA = L_OA * omega2 * np.array([-np.sin(theta2), np.cos(theta2)])
    
    # Matriz de coeficientes del sistema de ecuaciones de velocidad.
    A_vel = np.array([[-L_AB * np.sin(theta3), L_BO_prime * np.sin(theta4)],
                      [L_AB * np.cos(theta3), -L_BO_prime * np.cos(theta4)]])
    # Vector de términos independientes.
    b_vel = np.array([vA[0], vA[1]])
    
    # Resuelve el sistema para encontrar las velocidades angulares omega3 y omega4.
    try:
        omega3, omega4 = np.linalg.solve(A_vel, b_vel)
    except np.linalg.LinAlgError:
        # Si la matriz es singular (puntos muertos), las velocidades angulares son cero.
        omega3, omega4 = 0, 0

    # Calcula la velocidad del punto B (vB = omega4 x r_BO').
    vB = L_BO_prime * omega4 * np.array([-np.sin(theta4), np.cos(theta4)])
    
    # Calcula la velocidad del punto C (vC = vA + omega3 x r_CA).
    r_AC = C - A # Vector de posición de C relativo a A.
    v_C_rel_A = np.array([-r_AC[1], r_AC[0]]) * omega3 # Velocidad de C relativa a A.
    vC = vA + v_C_rel_A

    # --- ANÁLISIS DE ACELERACIÓN ---
    # Ecuación de lazo de aceleración: aB = aA + aB/A
    # Se resuelve un sistema similar para las aceleraciones angulares alpha3 y alpha4.

    # Aceleración normal del punto A (dirigida hacia O).
    aA = -L_OA * omega2**2 * np.array([np.cos(theta2), np.sin(theta2)])

    # La matriz de coeficientes es la misma que para la velocidad.
    A_accel = A_vel
    # Vector de términos independientes, que incluye los términos de aceleración normal.
    b_accel = np.array([
        aA[0] + L_AB * omega3**2 * np.cos(theta3) + L_BO_prime * omega4**2 * np.cos(theta4),
        aA[1] + L_AB * omega3**2 * np.sin(theta3) + L_BO_prime * omega4**2 * np.sin(theta4)
    ])

    # Resuelve para las aceleraciones angulares alpha3 y alpha4.
    try:
        alpha3, alpha4 = np.linalg.solve(A_accel, b_accel)
    except np.linalg.LinAlgError:
        alpha3, alpha4 = 0, 0

    # Calcula la aceleración del punto B (aB = aB_tangencial + aB_normal).
    aB_t = L_BO_prime * alpha4 * np.array([-np.sin(theta4), np.cos(theta4)]) # Componente tangencial.
    aB_n = -L_BO_prime * omega4**2 * np.array([np.cos(theta4), np.sin(theta4)]) # Componente normal.
    aB = aB_t + aB_n

    # Calcula la aceleración del punto C (aC = aA + a_C/A_normal + a_C/A_tangencial).
    a_C_rel_A_normal = -omega3**2 * r_AC # Aceleración normal de C relativa a A.
    a_C_rel_A_tangential = np.array([-r_AC[1], r_AC[0]]) * alpha3 # Aceleración tangencial de C relativa a A.
    aC = aA + a_C_rel_A_normal + a_C_rel_A_tangential

    # Devuelve todos los resultados en un diccionario.
    return {
        "points": {"O": O, "A": A, "B": B, "C": C, "O_prime": O_prime},
        "vectors": {"vA": vA, "vB": vB, "vC": vC, "aA": aA, "aB": aB, "aC": aC}
    }

# ===========================================================================
# FUNCIONES DE VISUALIZACIÓN
# ===========================================================================
# Estas funciones utilizan matplotlib para dibujar los componentes del mecanismo.

def draw_ground(ax, position, label):
    """Dibuja un soporte de tierra en la posición especificada."""
    x, y = position
    ax.plot([x-35, x+35], [y-20, y-20], 'k-', linewidth=3) # Línea base del soporte.
    ax.add_patch(plt.Polygon([[x-30, y-20], [x+30, y-20], [x, y]], color='#475569', zorder=1)) # Triángulo de soporte.
    for i in range(-30, 31, 10): # Líneas de sombreado para indicar tierra.
        ax.plot([x+i, x+i-8], [y-20, y-28], 'k-', linewidth=1.5, alpha=0.6)
    ax.text(x, y-45, label, fontsize=14, ha='center', color='white', bbox=dict(boxstyle='round,pad=0.5', fc='#1e293b', alpha=0.8))

def draw_link(ax, start, end, color, linewidth):
    """Dibuja un eslabón entre dos puntos."""
    ax.plot([start[0], end[0]], [start[1], end[1]], color=color, linewidth=linewidth, solid_capstyle='round', zorder=3)

def draw_joint(ax, position, label, color):
    """Dibuja una junta (articulación) en una posición dada."""
    ax.add_patch(Circle(position, 12, color=color, zorder=5)) # Círculo de la junta.
    ax.add_patch(Circle(position, 12, fill=False, edgecolor='white', linewidth=2.5, zorder=6)) # Borde blanco para resaltar.
    ax.text(position[0], position[1] + 25, label, fontsize=15, ha='center', color='white', bbox=dict(boxstyle='round,pad=0.5', fc=color, alpha=0.95), zorder=7)

def draw_vector(ax, start, vector, color, label, scale=1.0):
    """Dibuja un vector de velocidad o aceleración."""
    if np.linalg.norm(vector) == 0: return # No dibuja vectores de magnitud cero.
    end = start + vector * scale # El vector se escala para una mejor visualización.
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle='->', mutation_scale=25, linewidth=3, color=color, zorder=4))
    ax.text(end[0] * 1.05, end[1] * 1.05, label, fontsize=12, color=color, ha='center', bbox=dict(boxstyle='round,pad=0.3', fc='#0f172a', ec=color, alpha=0.9))

# ===========================================================================
# CONFIGURACIÓN DE LA ANIMACIÓN
# ===========================================================================
# Prepara la figura y los ejes de Matplotlib para la animación.
fig, ax = plt.subplots(figsize=(20, 15), facecolor='#0f172a')

# ===========================================================================
# FUNCIÓN DE ANIMACIÓN
# ===========================================================================
def animate(frame):
    """
    Esta función se llama para cada fotograma de la animación.
    Actualiza y redibuja el mecanismo.
    """
    ax.clear() # Limpia el eje en cada fotograma para dibujar el nuevo estado.
    ax.set_facecolor('#1e293b') # Color de fondo del área de trazado.
    ax.set_aspect('equal') # Asegura que las proporciones X e Y sean iguales.
    ax.grid(True, alpha=0.2, linestyle='--', color='#475569') # Rejilla de fondo.
    ax.set_xlim(-600, 900) # Límites del eje X.
    ax.set_ylim(-400, 800) # Límites del eje Y.
    
    # Títulos y etiquetas de la gráfica.
    fig.suptitle('Análisis Cinemático: Extensión en Acoplador (C-A-B)', fontsize=20, color='white', y=0.98)
    ax.set_title(f'ω₂ = {omega2} rad/s', fontsize=14, color='#94a3b8', pad=20)
    ax.set_xlabel('Posición X (mm)', fontsize=12, color='white')
    ax.set_ylabel('Posición Y (mm)', fontsize=12, color='white')
    ax.tick_params(colors='white', labelsize=10) # Color de las marcas de los ejes.

    # Calcula el tiempo y el ángulo de la manivela para el fotograma actual.
    t = frame * 0.005 # Incremento de tiempo por fotograma.
    theta2 = (omega2 * t) % (2 * np.pi) # Ángulo de la manivela, se mantiene en [0, 2*pi].
    
    # Llama a la función de cinemática para obtener los datos del estado actual.
    kin_data = calculate_kinematics(theta2, omega2)
    if kin_data is None: return [] # Si la cinemática no es válida, no dibuja nada.

    # Extrae los puntos y vectores del diccionario de resultados.
    p = kin_data["points"]
    v = kin_data["vectors"]
    a = kin_data["vectors"] # 'a' también está en "vectors".

    # --- DIBUJAR ELEMENTOS DEL MECANISMO ---
    draw_ground(ax, p['O'], 'O')
    draw_ground(ax, p['O_prime'], "O'")
    draw_link(ax, p['O'], p['A'], '#3b82f6', 8)      # Eslabón 2 (Manivela)
    draw_link(ax, p['C'], p['B'], '#10b981', 7)      # Eslabón 3 (Acoplador C-A-B)
    draw_link(ax, p['B'], p['O_prime'], '#f59e0b', 7) # Eslabón 4 (Balancín)
    
    # Dibuja las juntas en los puntos de conexión.
    draw_joint(ax, p['O'], '', '#3b82f6')
    draw_joint(ax, p['A'], 'A', '#10b981')
    draw_joint(ax, p['B'], 'B', '#10b981')
    draw_joint(ax, p['C'], 'C', '#10b981')

    # --- DIBUJAR VECTORES DE VELOCIDAD Y ACELERACIÓN ---
    vel_scale = 0.03    # Factor de escala para la longitud de los vectores de velocidad.
    acc_scale = 0.00005 # Factor de escala para la longitud de los vectores de aceleración.
    draw_vector(ax, p['A'], v['vA'], '#06b6d4', 'v_A', scale=vel_scale)
    draw_vector(ax, p['B'], v['vB'], '#14b8a6', 'v_B', scale=vel_scale)
    draw_vector(ax, p['C'], v['vC'], '#22d3ee', 'v_C', scale=vel_scale)
    draw_vector(ax, p['A'], a['aA'], '#ec4899', 'a_A', scale=acc_scale)
    draw_vector(ax, p['B'], a['aB'], '#f472b6', 'a_B', scale=acc_scale)
    draw_vector(ax, p['C'], a['aC'], '#fb7185', 'a_C', scale=acc_scale)

    # --- PANEL DE INFORMACIÓN ---
    # Muestra los datos cinemáticos y los parámetros del mecanismo en la pantalla.
    info_text_content = (
        f"Configuración: Extensión en Acoplador (C-A-B)"
        f"\n--------------------------------------------\n"
        f"L(OA) = {L_OA} mm, L(AC) = {L_AC} mm\n"
        f"L(AB) = {L_AB} mm, L(BO')= {L_BO_prime} mm\n"
        f"L(OO')= {L_OO_prime} mm\n\n"
        f"Valores Cinemáticos\n"
        f"--------------------------\n"
        f"θ₂ = {np.degrees(theta2):.1f}°\n\n"
        f"Pos B: ({p['B'][0]:>6.1f}, {p['B'][1]:>6.1f}) mm\n"
        f"Pos C: ({p['C'][0]:>6.1f}, {p['C'][1]:>6.1f}) mm\n\n"
        f"|v_B| = {np.linalg.norm(v['vB']):>7,.0f} mm/s\n"
        f"|v_C| = {np.linalg.norm(v['vC']):>7,.0f} mm/s\n\n"
        f"|a_B| = {np.linalg.norm(a['aB'])/1000:>7.1f} m/s²\n"
        f"|a_C| = {np.linalg.norm(a['aC'])/1000:>7.1f} m/s²"
    )
    ax.text(0.02, 0.95, info_text_content, transform=ax.transAxes, fontsize=11, verticalalignment='top', fontfamily='monospace',
            color='white', bbox=dict(boxstyle='round,pad=1', fc='#1e293b', ec='#3b82f6', lw=2, alpha=0.9))
    
    return [] # Devuelve una lista vacía, necesaria para el blitting.

# ===========================================================================
# CREAR Y MOSTRAR ANIMACIÓN
# ===========================================================================
# Crea la animación usando FuncAnimation.
# - fig: la figura de matplotlib.
# - animate: la función que se llama en cada fotograma.
# - frames: el número total de fotogramas a generar.
# - interval: el tiempo en milisegundos entre fotogramas.
# - blit: optimización que redibuja solo las partes que han cambiado (desactivado aquí).
anim = animation.FuncAnimation(fig, animate, frames=720, interval=20, blit=False)

# Ajusta el diseño para evitar que los elementos se superpongan.
plt.tight_layout()

# Muestra la ventana con la animación.
plt.show()