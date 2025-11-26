import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
import matplotlib.gridspec as gridspec

# === CONFIGURACIÓN VISUAL PROFESIONAL ===
plt.style.use('seaborn-v0_8-darkgrid')
# La línea original 'seaborn-v0_8-darkgrid' puede fallar si la versión de matplotlib es antigua.
# Usamos 'dark_background' o 'ggplot' como alternativas más compatibles.
plt.style.use('dark_background')
plt.rcParams['font.size'] = 9
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.labelsize'] = 10
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['xtick.labelsize'] = 8
plt.rcParams['ytick.labelsize'] = 8
plt.rcParams['legend.fontsize'] = 8
plt.rcParams['figure.titlesize'] = 14

# === 1. PARÁMETROS DEL MECANISMO ===
r2 = 0.05          # Longitud manivela (r) [m]
r3 = 0.20          # Longitud biela (l) [m]
w2 = 100.0         # Velocidad angular constante (ω) [rad/s]
alpha2 = 0.0       # Aceleración angular (α) [rad/s²]
lambda_ratio = r2 / r3  # Relación adimensional λ = r/l

# Parámetros de simulación
n_frames = 360
theta_deg = np.linspace(0, 360, n_frames)
theta_rad = np.deg2rad(theta_deg)

# === 2. CÁLCULOS CINEMÁTICOS ===
sin_theta = np.sin(theta_rad)
cos_theta = np.cos(theta_rad)

# Posición del Pistón (xB)
# xB ≈ r·cos(θ) + l·√(1 - (λ·sin(θ))²)
xB = r2 * cos_theta + r3 * np.sqrt(1 - (lambda_ratio * sin_theta)**2)

# Velocidad del Pistón (Vb)
# Vb ≈ -r·ω·(sin(θ) + (λ/2)·sin(2θ))
Vb = -r2 * w2 * (sin_theta + (lambda_ratio / 2) * np.sin(2 * theta_rad))

# Aceleración del Pistón (Ab)
# Ab ≈ -r·ω²·(cos(θ) + λ·cos(2θ))
Ab = -r2 * w2**2 * (cos_theta + lambda_ratio * np.cos(2 * theta_rad))

# Ángulo de la Biela (φ)
# φ ≈ arcsin(λ·sin(θ))
phi_rad = np.arcsin(lambda_ratio * sin_theta)
phi_deg = np.rad2deg(phi_rad)

# === 3. INFORMACIÓN DEL MECANISMO ===
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

# === 4. CONFIGURACIÓN DE LA FIGURA ===
fig = plt.figure(figsize=(16, 10))
gs = gridspec.GridSpec(3, 2, figure=fig, hspace=0.3, wspace=0.3)

# Subplots
ax_mech = fig.add_subplot(gs[:, 0])      # Mecanismo (izquierda, toda la altura)
ax_pos = fig.add_subplot(gs[0, 1])      # Posición
ax_vel = fig.add_subplot(gs[1, 1])      # Velocidad
ax_acc = fig.add_subplot(gs[2, 1])      # Aceleración

# Configuración del subplot del mecanismo
ax_mech.set_xlim(-0.08, 0.30)
ax_mech.set_ylim(-0.15, 0.15)
ax_mech.set_aspect('equal')
ax_mech.grid(True, alpha=0.3)
ax_mech.set_xlabel('Posición X [m]')
ax_mech.set_ylabel('Posición Y [m]')
ax_mech.set_title('Mecanismo Biela-Manivela', fontweight='bold')

# Configuración de gráficas cinemáticas
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
ax_vel.axhline(y=0, color='k', linestyle='--', linewidth=0.5)

ax_acc.set_xlim(0, 360)
ax_acc.set_ylim(Ab.min() - 1000, Ab.max() + 1000)
ax_acc.set_xlabel('Ángulo θ [°]')
ax_acc.set_ylabel('Aceleración [m/s²]')
ax_acc.set_title('Aceleración del Pistón (→ Fuerza Inercia)', fontweight='bold')
ax_acc.grid(True, alpha=0.3)
ax_acc.axhline(y=0, color='k', linestyle='--', linewidth=0.5)

# Elementos gráficos del mecanismo
crank, = ax_mech.plot([], [], 'b-', linewidth=3, label='Manivela')
rod, = ax_mech.plot([], [], 'r-', linewidth=3, label='Biela')
piston, = ax_mech.plot([], [], 'gs', markersize=12, label='Pistón')
point_A, = ax_mech.plot([], [], 'ko', markersize=8)
point_B, = ax_mech.plot([], [], 'go', markersize=8)
trail, = ax_mech.plot([], [], 'c-', linewidth=1, alpha=0.5, label='Trayectoria')

# Líneas de las gráficas
line_pos, = ax_pos.plot(theta_deg, xB*1000, 'b-', linewidth=1.5, alpha=0.3)
line_vel, = ax_vel.plot(theta_deg, Vb, 'g-', linewidth=1.5, alpha=0.3)
line_acc, = ax_acc.plot(theta_deg, Ab, 'r-', linewidth=1.5, alpha=0.3)

# Marcadores actuales
current_pos, = ax_pos.plot([], [], 'bo', markersize=8)
current_vel, = ax_vel.plot([], [], 'go', markersize=8)
current_acc, = ax_acc.plot([], [], 'ro', markersize=8)

# Texto informativo
text_info = ax_mech.text(0.02, 0.98, '', transform=ax_mech.transAxes,
                         verticalalignment='top', fontsize=9,
                         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

ax_mech.legend(loc='lower right', framealpha=0.9)

# Variables globales para trayectoria
trail_x, trail_y = [], []

# === 5. FUNCIONES DE ANIMACIÓN ===
def init():
    """Inicializa los elementos de la animación"""
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
    
    return (crank, rod, piston, point_A, point_B, trail, 
            current_pos, current_vel, current_acc, text_info)

def animate(frame):
    """Actualiza la animación en cada frame"""
    global trail_x, trail_y
    
    # Índice cíclico
    i = frame % n_frames
    
    # Coordenadas del mecanismo
    theta = theta_rad[i]
    xA = r2 * np.cos(theta)
    yA = r2 * np.sin(theta)
    xB_current = xB[i]
    yB = 0
    
    # Actualizar elementos del mecanismo
    crank.set_data([0, xA], [0, yA])
    rod.set_data([xA, xB_current], [yA, yB])
    piston.set_data([xB_current], [yB])
    point_A.set_data([xA], [yA])
    point_B.set_data([xB_current], [yB])
    
    # Trayectoria del punto A (manivela)
    trail_x.append(xA)
    trail_y.append(yA)
    if len(trail_x) > 50:
        trail_x.pop(0)
        trail_y.pop(0)
    trail.set_data(trail_x, trail_y)
    
    # Actualizar marcadores en gráficas
    current_pos.set_data([theta_deg[i]], [xB_current * 1000])
    current_vel.set_data([theta_deg[i]], [Vb[i]])
    current_acc.set_data([theta_deg[i]], [Ab[i]])
    
    # Actualizar información
    text_info.set_text(
        f'θ = {theta_deg[i]:.1f}°\n'
        f'φ = {phi_deg[i]:.2f}°\n'
        f'x = {xB_current*1000:.2f} mm\n'
        f'V = {Vb[i]:.2f} m/s\n'
        f'a = {Ab[i]:.1f} m/s²'
    )
    
    return (crank, rod, piston, point_A, point_B, trail,
            current_pos, current_vel, current_acc, text_info)

# === 6. INICIAR ANIMACIÓN ===
print("Preparando animacion del mecanismo...")
print("  -> La animacion mostrara 3 ciclos completos")
print("  -> Observa la curva de Aceleracion: su magnitud determina la Fuerza de Inercia")
print("  -> F_inercia = m*a (donde 'a' es la aceleracion mostrada)\n")

anim = FuncAnimation(fig, animate, init_func=init,
                    frames=n_frames*3, interval=33, blit=True, repeat=True)

plt.tight_layout()
plt.show()