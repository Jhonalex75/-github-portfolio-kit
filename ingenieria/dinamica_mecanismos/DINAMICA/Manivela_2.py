# =====================================================================================
# ANÁLISIS CINEMÁTICO DE UN MECANISMO BIELA-MANIVELA
# =====================================================================================
#
# Este script realiza un análisis cinemático de un mecanismo de biela-manivela,
# que es fundamental en motores de combustión interna y compresores.
#
# MODELO FÍSICO:
# 1.  MANIVELA (Barra r2): Gira con velocidad angular constante ω. Su extremo A
#     describe un círculo.
# 2.  BIELA (Barra r3): Conecta la manivela con el pistón. Su extremo A sigue a la
#     manivela y su extremo B se mueve linealmente.
# 3.  PISTÓN (Corredera): Se desplaza horizontalmente (en este modelo) en una guía.
#
# El análisis se basa en ecuaciones de lazo vectorial para obtener la posición,
# velocidad y aceleración del pistón en función del ángulo de la manivela (θ).
# Se utilizan aproximaciones comunes para simplificar los cálculos, válidas cuando
# la longitud de la biela (l) es significativamente mayor que la de la manivela (r).
#
# =====================================================================================

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import matplotlib.gridspec as gridspec

# === CONFIGURACIÓN VISUAL PROFESIONAL ===
# Define un estilo visual agradable y consistente para todos los gráficos.
plt.style.use('seaborn-v0_8-darkgrid')
plt.rcParams['font.size'] = 9
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.labelsize'] = 10
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['xtick.labelsize'] = 8
plt.rcParams['ytick.labelsize'] = 8
plt.rcParams['legend.fontsize'] = 8
plt.rcParams['figure.titlesize'] = 14

# === 1. PARÁMETROS FÍSICOS Y DE SIMULACIÓN DEL MECANISMO ===
# Aquí se definen las dimensiones físicas del mecanismo y las condiciones de operación.

r2 = 0.05          # Longitud de la manivela (radio de giro), 'r' [metros]
r3 = 0.20          # Longitud de la biela, 'l' [metros]
w2 = 100.0         # Velocidad angular constante de la manivela (ω) [rad/s].
                   # Un valor positivo indica giro antihorario.
alpha2 = 0.0       # Aceleración angular (α) [rad/s²]. Cero para velocidad constante.

# La relación lambda (λ) es un parámetro adimensional clave que simplifica las ecuaciones.
# λ = r / l. Si λ es pequeño (< 0.25), las aproximaciones son muy precisas.
lambda_ratio = r2 / r3

# Parámetros para la simulación y animación
n_frames = 360     # Número de puntos a calcular en una rotación completa (360°).
                   # Corresponde a los "frames" de la animación.
theta_deg = np.linspace(0, 360, n_frames)  # Vector de ángulos de la manivela en grados.
theta_rad = np.deg2rad(theta_deg)          # Conversión a radianes para cálculos trigonométricos.

# === 2. CÁLCULOS CINEMÁTICOS (ECUACIONES DEL MOVIMIENTO) ===
# Se calculan las propiedades cinemáticas (posición, velocidad, aceleración) del pistón
# para cada ángulo de la manivela definido en theta_rad.

# Pre-cálculo de seno y coseno para eficiencia
sin_theta = np.sin(theta_rad)
cos_theta = np.cos(theta_rad)

# --- Posición del Pistón (xB) ---
# Ecuación deducida del lazo vectorial r2 + r3 = xB.
# La fórmula exacta es xB = r·cos(θ) + l·cos(φ).
# Usando la aproximación cos(φ) ≈ √(1 - (λ·sin(θ))²), obtenemos:
# xB ≈ r·cos(θ) + l·√(1 - (r/l·sin(θ))²)
xB = r2 * cos_theta + r3 * np.sqrt(1 - (lambda_ratio * sin_theta)**2)

# --- Velocidad del Pistón (Vb) ---
# Se obtiene derivando la ecuación de posición xB con respecto al tiempo (d/dt).
# d(xB)/dt = Vb. La velocidad angular ω = dθ/dt.
# La fórmula aproximada es:
# Vb ≈ -r·ω·(sin(θ) + (λ/2)·sin(2θ))
Vb = -r2 * w2 * (sin_theta + (lambda_ratio / 2) * np.sin(2 * theta_rad))

# --- Aceleración del Pistón (Ab) ---
# Se obtiene derivando la ecuación de velocidad Vb con respecto al tiempo (d/dt).
# d(Vb)/dt = Ab.
# Esta aceleración es crucial, ya que la fuerza de inercia que actúa sobre el pistón
# es F_inercia = -m_pistón * Ab.
# La fórmula aproximada es:
# Ab ≈ -r·ω²·(cos(θ) + λ·cos(2θ))
Ab = -r2 * w2**2 * (cos_theta + lambda_ratio * np.cos(2 * theta_rad))

# --- Ángulo de la Biela (φ) ---
# El ángulo φ que forma la biela con la horizontal se puede calcular a partir de la
# componente vertical del lazo vectorial: r·sin(θ) = l·sin(φ).
# φ = arcsin((r/l)·sin(θ)) = arcsin(λ·sin(θ))
phi_rad = np.arcsin(lambda_ratio * sin_theta)
phi_deg = np.rad2deg(phi_rad)

# === 3. INFORMACIÓN Y RESULTADOS CLAVE DEL MECANISMO ===
# Se calculan y muestran valores importantes del rendimiento del mecanismo.

# La carrera es la distancia total que recorre el pistón entre sus puntos muertos.
carrera = xB.max() - xB.min()

print(f"+------------------------------------------------------+")
print(f"|       PARAMETROS DEL MECANISMO BIELA-MANIVELA       |")
print(f"------------------------------------------------------")
print(f"| Manivela (r):           {r2*1000:6.1f} mm             |")
print(f"| Biela (l):              {r3*1000:6.1f} mm             |")
print(f"| Relacion lambda = r/l:  {lambda_ratio:6.4f}               |")
print(f"| Velocidad angular (w):  {w2:6.1f} rad/s          |")
print(f"| Carrera del piston:     {carrera*1000:6.2f} mm            |")
print(f"| Velocidad maxima:       {abs(Vb).max():6.2f} m/s           |")
print(f"| Aceleracion maxima:     {abs(Ab).max():7.1f} m/s²         |")
print(f"------------------------------------------------------")

# === 4. CONFIGURACIÓN DE LA INTERFAZ GRÁFICA (PLOTS) ===
# Se prepara la ventana de visualización con múltiples subplots.

fig = plt.figure(figsize=(16, 10))
# GridSpec permite organizar los subplots en una rejilla flexible.
gs = gridspec.GridSpec(3, 2, figure=fig, hspace=0.3, wspace=0.3)

# Definición de los ejes para cada gráfico
ax_mech = fig.add_subplot(gs[:, 0])      # Gráfico del mecanismo (ocupa toda la columna izquierda)
ax_pos = fig.add_subplot(gs[0, 1])      # Gráfico de Posición vs. Ángulo
ax_vel = fig.add_subplot(gs[1, 1])      # Gráfico de Velocidad vs. Ángulo
ax_acc = fig.add_subplot(gs[2, 1])      # Gráfico de Aceleración vs. Ángulo

# --- Configuración del subplot del mecanismo ---
ax_mech.set_xlim(-0.08, 0.30)
ax_mech.set_ylim(-0.15, 0.15)
ax_mech.set_aspect('equal')  # Asegura que las proporciones sean realistas (círculos se ven como círculos)
ax_mech.grid(True, alpha=0.3)
ax_mech.set_xlabel('Posición X [m]')
ax_mech.set_ylabel('Posición Y [m]')
ax_mech.set_title('Mecanismo Biela-Manivela', fontweight='bold')

# --- Configuración de las gráficas cinemáticas (derecha) ---
# Se ajustan los límites y etiquetas para cada gráfico.
ax_pos.set_xlim(0, 360)
ax_pos.set_ylim(xB.min()*1000 - 5, xB.max()*1000 + 5)
ax_pos.set_xlabel('Ángulo θ [°]')
ax_pos.set_ylabel('Posición [mm]')
ax_pos.set_title('Posición del Pistón', fontweight='bold')
ax_pos.grid(True, alpha=0.3)

ax_vel.set_xlim(0, 360)
ax_vel.set_ylim(Vb.min() - 1, Vb.max() + 1)
ax_vel.set_xlabel('Ángulo θ [°]')
ax_vel.set_ylabel('Velocidad [m/s]')
ax_vel.set_title('Velocidad del Pistón', fontweight='bold')
ax_vel.grid(True, alpha=0.3)
ax_vel.axhline(y=0, color='k', linestyle='--', linewidth=0.5) # Línea de referencia en cero

ax_acc.set_xlim(0, 360)
ax_acc.set_ylim(Ab.min() - 1000, Ab.max() + 1000)
ax_acc.set_xlabel('Ángulo θ [°]')
ax_acc.set_ylabel('Aceleración [m/s²]')
ax_acc.set_title('Aceleración del Pistón (→ Fuerza Inercia)', fontweight='bold')
ax_acc.grid(True, alpha=0.3)
ax_acc.axhline(y=0, color='k', linestyle='--', linewidth=0.5) # Línea de referencia en cero

# --- Creación de los elementos gráficos que se animarán ---
# Se crean objetos de línea y punto vacíos. La función de animación les dará datos.
crank, = ax_mech.plot([], [], 'b-', linewidth=3, label='Manivela')
rod, = ax_mech.plot([], [], 'r-', linewidth=3, label='Biela')
piston, = ax_mech.plot([], [], 'gs', markersize=12, label='Pistón')
point_A, = ax_mech.plot([], [], 'ko', markersize=8) # Articulación Manivela-Biela
point_B, = ax_mech.plot([], [], 'go', markersize=8) # Articulación Biela-Pistón
trail, = ax_mech.plot([], [], 'c-', linewidth=1, alpha=0.5, label='Trayectoria') # Estela de la manivela

# Líneas de las gráficas cinemáticas (se dibujan completas desde el inicio)
line_pos, = ax_pos.plot(theta_deg, xB*1000, 'b-', linewidth=1.5, alpha=0.3)
line_vel, = ax_vel.plot(theta_deg, Vb, 'g-', linewidth=1.5, alpha=0.3)
line_acc, = ax_acc.plot(theta_deg, Ab, 'r-', linewidth=1.5, alpha=0.3)

# Marcadores que indicarán el valor actual en cada gráfica
current_pos, = ax_pos.plot([], [], 'bo', markersize=8)
current_vel, = ax_vel.plot([], [], 'go', markersize=8)
current_acc, = ax_acc.plot([], [], 'ro', markersize=8)

# Cuadro de texto para mostrar valores numéricos en tiempo real
text_info = ax_mech.text(0.02, 0.98, '', transform=ax_mech.transAxes,
                         verticalalignment='top', fontsize=9,
                         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

ax_mech.legend(loc='lower right', framealpha=0.9)

# Variables para almacenar la trayectoria de la estela
trail_x, trail_y = [], []

# === 5. FUNCIONES DE ANIMACIÓN ===

def init():
    """
    Función de inicialización para la animación.
    Se ejecuta una vez al principio para establecer el estado inicial.
    Limpia todos los elementos gráficos que se van a redibujar en cada frame.
    """
    global trail_x, trail_y
    trail_x, trail_y = [], []
    
    crank.set_data([], [])
    rod.set_data([], [])
    piston.set_data([], [])
    point_A.set_data([], [])
    point_B.set_data([], [])
    trail.set_data([], [])
    current_pos.set_data([], [])
    current_vel.set_data([], [])
    current_acc.set_data([], [])
    text_info.set_text('')
    
    # Devuelve una tupla con todos los objetos que la función 'animate' actualizará.
    return (crank, rod, piston, point_A, point_B, trail, 
            current_pos, current_vel, current_acc, text_info)

def animate(frame):
    """
    Función principal de la animación. Se llama repetidamente para cada 'frame'.
    """
    global trail_x, trail_y
    
    # El índice 'i' se mapea al vector de ángulos precalculados.
    i = frame % n_frames
    
    # --- Coordenadas instantáneas del mecanismo ---
    theta = theta_rad[i]
    # Punto A (unión manivela-biela)
    xA = r2 * np.cos(theta)
    yA = r2 * np.sin(theta)
    # Punto B (unión biela-pistón)
    xB_current = xB[i] # Se usa el valor precalculado
    yB = 0             # El pistón se mueve en el eje X
    
    # --- Actualización de los datos de los elementos gráficos ---
    crank.set_data([0, xA], [0, yA]) # La manivela va del origen (0,0) al punto A
    rod.set_data([xA, xB_current], [yA, yB]) # La biela va del punto A al punto B
    piston.set_data([xB_current], [yB]) # El pistón es un punto en B
    point_A.set_data([xA], [yA])
    point_B.set_data([xB_current], [yB])
    
    # Actualización de la estela de la manivela
    trail_x.append(xA)
    trail_y.append(yA)
    if len(trail_x) > 50: # Limita la longitud de la estela
        trail_x.pop(0)
        trail_y.pop(0)
    trail.set_data(trail_x, trail_y)
    
    # Actualización de los marcadores en las gráficas cinemáticas
    current_pos.set_data([theta_deg[i]], [xB_current * 1000])
    current_vel.set_data([theta_deg[i]], [Vb[i]])
    current_acc.set_data([theta_deg[i]], [Ab[i]])
    
    # Actualización del cuadro de texto con la información del frame actual
    text_info.set_text(
        f'θ = {theta_deg[i]:.1f}°\n'      # Ángulo de manivela
        f'φ = {phi_deg[i]:.2f}°\n'      # Ángulo de biela
        f'x = {xB_current*1000:.2f} mm\n' # Posición del pistón
        f'V = {Vb[i]:.2f} m/s\n'         # Velocidad del pistón
        f'a = {Ab[i]:.1f} m/s²'          # Aceleración del pistón
    )
    
    # Devuelve los objetos actualizados para que Matplotlib los redibuje eficientemente.
    return (crank, rod, piston, point_A, point_B, trail,
            current_pos, current_vel, current_acc, text_info)

# === 6. INICIAR Y MOSTRAR LA ANIMACIÓN ===
print(" Preparando animación del mecanismo...")
print("  La animación mostrará 3 ciclos completos.")
print("  Observa la curva de Aceleración: su magnitud determina la Fuerza de Inercia.")
print("  F_inercia = -m·a (donde 'a' es la aceleración mostrada)\n")

# FuncAnimation es la clase de Matplotlib que orchestra la animación.
# - fig: la figura donde se dibuja.
# - animate: la función que se llama en cada frame.
# - init_func: la función de inicialización.
# - frames: número total de frames a generar. 3 ciclos * 360 frames/ciclo.
# - interval: tiempo en milisegundos entre frames (aprox. 30 FPS).
# - blit=True: optimización que solo redibuja las partes que han cambiado.
anim = FuncAnimation(fig, animate, init_func=init,
                    frames=n_frames*3, interval=33, blit=True, repeat=True)

plt.tight_layout() # Ajusta el espaciado para que no se solapen los títulos.
plt.show()         # Muestra la ventana con la animación.
