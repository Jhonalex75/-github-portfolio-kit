# ==============================================================
#  ANÁLISIS CINEMÁTICO ANIMADO - MECANISMO BIELA-MANIVELA
#  Autor: Jhon Alexander Valencia Marulanda
#  Descripción: Simulación animada del mecanismo biela-manivela
#               con análisis de posición, velocidad, aceleración
#               y ángulo de la biela en función del ángulo de la manivela.
# ==============================================================

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.patches import Circle
import matplotlib.gridspec as gridspec


# ==============================================================
# === CONFIGURACIÓN VISUAL PROFESIONAL ===
# ==============================================================

plt.style.use('seaborn-v0_8-darkgrid')
plt.rcParams.update({
    'font.size': 9,
    'axes.labelsize': 10,
    'axes.titlesize': 11,
    'legend.fontsize': 8,
    'figure.facecolor': 'white'
})


# ==============================================================
# === 1. PARÁMETROS DEL MECANISMO ===
# ==============================================================

r2 = 0.05      # Longitud de la manivela [m]
r3 = 0.20      # Longitud de la biela [m]
w2 = 100.0     # Velocidad angular de la manivela [rad/s]
alpha2 = 0.0   # Aceleración angular (no utilizada) [rad/s²]

lambda_ratio = r2 / r3  # Relación adimensional λ = r / l

# Vector de ángulos para simular un ciclo completo (0° a 360°)
n_frames = 360
theta_deg = np.linspace(0, 360, n_frames)
theta_rad = np.deg2rad(theta_deg)


# ==============================================================
# === 2. CÁLCULOS CINEMÁTICOS DEL MECANISMO ===
# ==============================================================

# Relaciones trigonométricas
sin_theta = np.sin(theta_rad)
cos_theta = np.cos(theta_rad)

# Posición del pistón (xB)
xB = r2 * cos_theta + r3 * np.sqrt(1 - (lambda_ratio * sin_theta)**2)

# Velocidad y aceleración del pistón
Vb = -r2 * w2 * (sin_theta + (lambda_ratio / 2) * np.sin(2 * theta_rad))
Ab = -r2 * w2**2 * (cos_theta + lambda_ratio * np.cos(2 * theta_rad))

# Ángulo de la biela (φ)
phi_rad = np.arcsin(lambda_ratio * sin_theta)
phi_deg = np.rad2deg(phi_rad)

# Cálculo de carrera y valores extremos
carrera = xB.max() - xB.min()

# === IMPRESIÓN DE DATOS DEL MECANISMO EN CONSOLA ===
print("╔══════════════════════════════════════════════════════╗")
print("║       PARÁMETROS DEL MECANISMO BIELA-MANIVELA       ║")
print("╠══════════════════════════════════════════════════════╣")
print(f"║ Manivela (r):           {r2*1000:6.1f} mm             ║")
print(f"║ Biela (l):              {r3*1000:6.1f} mm             ║")
print(f"║ Relación λ = r/l:       {lambda_ratio:6.4f}               ║")
print(f"║ Velocidad angular (ω):  {w2:6.1f} rad/s          ║")
print(f"║ Carrera del pistón:     {carrera*1000:6.2f} mm            ║")
print(f"║ Velocidad máxima:       {abs(Vb).max():6.2f} m/s           ║")
print(f"║ Aceleración máxima:     {abs(Ab).max():7.1f} m/s²         ║")
print("╚══════════════════════════════════════════════════════╝")


# ==============================================================
# === 3. CONFIGURACIÓN DE LA FIGURA Y SUBPANELES ===
# ==============================================================

fig = plt.figure(figsize=(20, 20))
gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.35, wspace=0.35)


# --------------------------------------------------------------
# PANEL 1: MECANISMO EN MOVIMIENTO
# --------------------------------------------------------------
ax_mec = fig.add_subplot(gs[:, 0])
ax_mec.set_xlim([-0.08, 0.30])
ax_mec.set_ylim([-0.10, 0.10])
ax_mec.set_aspect('equal')
ax_mec.set_title('Mecanismo Biela-Manivela en Movimiento', fontweight='bold')
ax_mec.set_xlabel('Posición X [m]', fontweight='bold')
ax_mec.set_ylabel('Posición Y [m]', fontweight='bold')
ax_mec.grid(True, alpha=0.3, linestyle='--')

# Elementos del mecanismo
line_manivela, = ax_mec.plot([], [], 'r-', linewidth=6, label='Manivela (r)')
line_biela, = ax_mec.plot([], [], 'b-', linewidth=6, label='Biela (l)')
point_A, = ax_mec.plot([], [], 'o', color='orange', markersize=14, label='Punto A')
point_B, = ax_mec.plot([], [], 's', color='red', markersize=14, label='Pistón B')
trail_B, = ax_mec.plot([], [], 'c--', linewidth=2, alpha=0.6, label='Trayectoria')

# Círculo en el centro fijo O₂
ax_mec.add_patch(Circle((0, 0), 0.005, color='black'))
ax_mec.plot(0, 0, 'k^', markersize=15, label='O₂ (fijo)')

# Guía del pistón
ax_mec.axhline(y=0, color='gray', linestyle='-', linewidth=3, alpha=0.4)
ax_mec.add_patch(plt.Rectangle((0.23, -0.015), 0.04, 0.03, color='lightgray', alpha=0.5))

# Texto informativo que se actualizará con el movimiento
text_info = ax_mec.text(0.98, 0.98, '', transform=ax_mec.transAxes,
                        verticalalignment='top', horizontalalignment='right',
                        fontsize=11, fontweight='bold',
                        bbox=dict(boxstyle='round,pad=0.8', facecolor='yellow',
                                  alpha=0.8, edgecolor='black', linewidth=2))

ax_mec.legend(loc='upper left', framealpha=0.9)


# --------------------------------------------------------------
# PANEL 2–7: GRÁFICAS DE ANÁLISIS CINEMÁTICO
# --------------------------------------------------------------

# Posición del pistón
ax_pos = fig.add_subplot(gs[0, 1])
ax_pos.plot(theta_deg, xB * 1000, 'r-', alpha=0.3)
line_pos_anim, = ax_pos.plot([], [], 'r-', linewidth=2.5)
point_pos, = ax_pos.plot([], [], 'ro', markersize=8)
ax_pos.set(title='Posición del Pistón vs Ángulo', xlabel='Ángulo θ₂ [°]',
           ylabel='Posición [mm]', xlim=[0, 360],
           ylim=[xB.min()*1000-5, xB.max()*1000+5])

# Velocidad del pistón
ax_vel = fig.add_subplot(gs[0, 2])
ax_vel.plot(theta_deg, Vb, 'g-', alpha=0.3)
line_vel_anim, = ax_vel.plot([], [], 'g-', linewidth=2.5)
point_vel, = ax_vel.plot([], [], 'go', markersize=8)
ax_vel.set(title='Velocidad del Pistón vs Ángulo', xlabel='Ángulo θ₂ [°]',
           ylabel='Velocidad [m/s]', xlim=[0, 360],
           ylim=[Vb.min()-0.5, Vb.max()+0.5])

# Aceleración
ax_acc = fig.add_subplot(gs[1, 1])
ax_acc.plot(theta_deg, Ab, 'b-', alpha=0.3)
line_acc_anim, = ax_acc.plot([], [], 'b-', linewidth=2.5)
point_acc, = ax_acc.plot([], [], 'bo', markersize=8)
ax_acc.set(title='Aceleración del Pistón vs Ángulo', xlabel='Ángulo θ₂ [°]',
           ylabel='Aceleración [m/s²]', xlim=[0, 360],
           ylim=[Ab.min()-50, Ab.max()+50])

# Ángulo de la biela
ax_phi = fig.add_subplot(gs[1, 2])
ax_phi.plot(theta_deg, phi_deg, 'm-', alpha=0.3)
line_phi_anim, = ax_phi.plot([], [], 'm-', linewidth=2.5)
point_phi, = ax_phi.plot([], [], 'mo', markersize=8)
ax_phi.set(title='Ángulo de la Biela vs Ángulo de Manivela', xlabel='Ángulo θ₂ [°]',
           ylabel='Ángulo φ [°]', xlim=[0, 360],
           ylim=[phi_deg.min()-1, phi_deg.max()+1])

# Hodógrafo (Velocidad vs Posición)
ax_hodo = fig.add_subplot(gs[2, 1])
ax_hodo.plot(xB * 1000, Vb, 'gray', alpha=0.3)
line_hodo_anim, = ax_hodo.plot([], [], color='cyan', linewidth=2.5)
point_hodo, = ax_hodo.plot([], [], 'ko', markersize=8)
ax_hodo.set(title='Hodógrafo: Velocidad vs Posición', xlabel='Posición [mm]', ylabel='Velocidad [m/s]')

# Diagrama polar
ax_polar = fig.add_subplot(gs[2, 2], projection='polar')
ax_polar.plot(theta_rad, xB * 1000, 'gray', alpha=0.3)
line_polar_anim, = ax_polar.plot([], [], color='red', linewidth=2.5)
point_polar, = ax_polar.plot([], [], 'ro', markersize=8)
ax_polar.set_title('Diagrama Polar: Posición [mm]', pad=20)


# ==============================================================
# === 4. FUNCIONES DE ANIMACIÓN ===
# ==============================================================

trail_x, trail_y = [], []  # Trayectoria del pistón

def init():
    """Inicializa todos los elementos de la animación vacíos."""
    for element in [line_manivela, line_biela, point_A, point_B, trail_B,
                    line_pos_anim, point_pos, line_vel_anim, point_vel,
                    line_acc_anim, point_acc, line_phi_anim, point_phi,
                    line_hodo_anim, point_hodo, line_polar_anim, point_polar]:
        element.set_data([], [])
    text_info.set_text('')
    return (line_manivela, line_biela, point_A, point_B, trail_B,
            line_pos_anim, point_pos, line_vel_anim, point_vel,
            line_acc_anim, point_acc, line_phi_anim, point_phi,
            line_hodo_anim, point_hodo, line_polar_anim, point_polar, text_info)


def animate(frame):
    """Actualiza el mecanismo y las gráficas en cada frame."""
    idx = frame % n_frames
    theta = theta_rad[idx]

    # Coordenadas del punto A (extremo de manivela)
    xA, yA = r2 * np.cos(theta), r2 * np.sin(theta)
    # Coordenadas del pistón B
    xB_val, yB_val = xB[idx], 0.0

    # === Actualización gráfica del mecanismo ===
    line_manivela.set_data([0, xA], [0, yA])
    line_biela.set_data([xA, xB_val], [yA, yB_val])
    point_A.set_data([xA], [yA])
    point_B.set_data([xB_val], [yB_val])

    # Trayectoria del pistón
    trail_x.append(xB_val)
    trail_y.append(yB_val)
    if len(trail_x) > 50:
        trail_x.pop(0)
        trail_y.pop(0)
    trail_B.set_data(trail_x, trail_y)

    # === Actualización sincronizada de gráficas ===
    indices = range(max(0, idx-90), idx+1)

    line_pos_anim.set_data(theta_deg[indices], xB[indices] * 1000)
    point_pos.set_data([theta_deg[idx]], [xB[idx] * 1000])

    line_vel_anim.set_data(theta_deg[indices], Vb[indices])
    point_vel.set_data([theta_deg[idx]], [Vb[idx]])

    line_acc_anim.set_data(theta_deg[indices], Ab[indices])
    point_acc.set_data([theta_deg[idx]], [Ab[idx]])

    line_phi_anim.set_data(theta_deg[indices], phi_deg[indices])
    point_phi.set_data([theta_deg[idx]], [phi_deg[idx]])

    line_hodo_anim.set_data(xB[indices] * 1000, Vb[indices])
    point_hodo.set_data([xB[idx] * 1000], [Vb[idx]])

    line_polar_anim.set_data(theta_rad[indices], xB[indices] * 1000)
    point_polar.set_data([theta_rad[idx]], [xB[idx] * 1000])

    # === Actualización del texto informativo ===
    text_info.set_text(
        f'θ₂ = {theta_deg[idx]:6.1f}°\n'
        f'φ   = {phi_deg[idx]:6.1f}°\n\n'
        f'Pos = {xB_val*1000:6.2f} mm\n'
        f'Vel = {Vb[idx]:6.2f} m/s\n'
        f'Acc = {Ab[idx]:6.1f} m/s²'
    )

    return (line_manivela, line_biela, point_A, point_B, trail_B,
            line_pos_anim, point_pos, line_vel_anim, point_vel,
            line_acc_anim, point_acc, line_phi_anim, point_phi,
            line_hodo_anim, point_hodo, line_polar_anim, point_polar, text_info)


# ==============================================================
# === 5. EJECUCIÓN DE LA ANIMACIÓN ===
# ==============================================================

anim = FuncAnimation(
    fig, animate, init_func=init,
    frames=n_frames * 3, interval=33, blit=True, repeat=True
)

plt.suptitle(
    'ANÁLISIS CINEMÁTICO ANIMADO - MECANISMO BIELA-MANIVELA',
    fontsize=14, fontweight='bold', y=0.98
)

print("\n✓ Iniciando animación del mecanismo...")
print("  → La animación mostrará 3 ciclos completos del mecanismo")
print("  → Observa cómo todas las gráficas se sincronizan con el movimiento")
print("  → Duración total: ~36 segundos\n")

plt.show()
