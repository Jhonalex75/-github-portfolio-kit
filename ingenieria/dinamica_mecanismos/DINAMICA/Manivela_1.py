import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.patches import Circle, FancyArrowPatch
import matplotlib.gridspec as gridspec
from matplotlib.collections import LineCollection

# === CONFIGURACIÓN VISUAL PROFESIONAL ===
plt.style.use('seaborn-v0_8-darkgrid')
plt.rcParams['font.size'] = 9
plt.rcParams['axes.labelsize'] = 10
plt.rcParams['axes.titlesize'] = 11
plt.rcParams['legend.fontsize'] = 8
plt.rcParams['figure.facecolor'] = 'white'

# === 1. PARÁMETROS DEL MECANISMO ===
r2 = 0.05      # Longitud manivela [m]
r3 = 0.20      # Longitud biela [m]
w2 = 100.0     # Velocidad angular manivela [rad/s]
alpha2 = 0.0   # Aceleración angular [rad/s²]
lambda_ratio = r2 / r3  # Relación adimensional λ = r/l

# Vector de ángulos para ciclo completo
n_frames = 360
theta_deg = np.linspace(0, 360, n_frames)
theta_rad = np.deg2rad(theta_deg)

# === 2. CÁLCULOS CINEMÁTICOS ===
sin_theta = np.sin(theta_rad)
cos_theta = np.cos(theta_rad)
xB = r2 * cos_theta + r3 * np.sqrt(1 - (lambda_ratio * sin_theta)**2)
Vb = -r2 * w2 * (sin_theta + (lambda_ratio / 2) * np.sin(2 * theta_rad))
Ab = -r2 * w2**2 * (cos_theta + lambda_ratio * np.cos(2 * theta_rad))
phi_rad = np.arcsin(lambda_ratio * sin_theta)
phi_deg = np.rad2deg(phi_rad)

# Información del mecanismo
carrera = xB.max() - xB.min()
print(f"╔══════════════════════════════════════════════════════╗")
print(f"║       PARÁMETROS DEL MECANISMO BIELA-MANIVELA       ║")
print(f"╠══════════════════════════════════════════════════════╣")
print(f"║ Manivela (r):           {r2*1000:6.1f} mm             ║")
print(f"║ Biela (l):              {r3*1000:6.1f} mm             ║")
print(f"║ Relación λ = r/l:       {lambda_ratio:6.4f}               ║")
print(f"║ Velocidad angular (ω):  {w2:6.1f} rad/s          ║")
print(f"║ Carrera del pistón:     {carrera*1000:6.2f} mm            ║")
print(f"║ Velocidad máxima:       {abs(Vb).max():6.2f} m/s           ║")
print(f"║ Aceleración máxima:     {abs(Ab).max():7.1f} m/s²         ║")
print(f"╚══════════════════════════════════════════════════════╝")

# === 3. CREACIÓN DE LA FIGURA ANIMADA ===
fig = plt.figure(figsize=(18, 10))
gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.35, wspace=0.35)

# --- Panel 1: Mecanismo en Movimiento ---
ax_mec = fig.add_subplot(gs[:, 0])
ax_mec.set_xlim([-0.08, 0.30])
ax_mec.set_ylim([-0.10, 0.10])
ax_mec.set_aspect('equal')
ax_mec.grid(True, alpha=0.3, linestyle='--')
ax_mec.set_xlabel('Posición X [m]', fontweight='bold')
ax_mec.set_ylabel('Posición Y [m]', fontweight='bold')
ax_mec.set_title('Mecanismo Biela-Manivela en Movimiento', fontweight='bold', fontsize=12)

# Elementos del mecanismo
line_manivela, = ax_mec.plot([], [], 'r-', linewidth=6, label='Manivela (r)', zorder=3)
line_biela, = ax_mec.plot([], [], 'b-', linewidth=6, label='Biela (l)', zorder=3)
point_A, = ax_mec.plot([], [], 'o', color='orange', markersize=14, label='Punto A', zorder=5)
point_B, = ax_mec.plot([], [], 's', color='red', markersize=14, label='Pistón B', zorder=5)
trail_B, = ax_mec.plot([], [], 'c--', linewidth=2, alpha=0.6, label='Trayectoria')

# Círculo en O2
circle_O2 = Circle((0, 0), 0.005, color='black', fill=True, zorder=10)
ax_mec.add_patch(circle_O2)
ax_mec.plot(0, 0, 'k^', markersize=15, label='O₂ (fijo)', zorder=11)

# Guía del pistón
ax_mec.axhline(y=0, color='gray', linestyle='-', linewidth=3, alpha=0.4, zorder=1)
ax_mec.add_patch(plt.Rectangle((0.23, -0.015), 0.04, 0.03, 
                               fill=True, color='lightgray', alpha=0.5, zorder=1))

ax_mec.legend(loc='upper left', fontsize=9, framealpha=0.9)

# Texto informativo
text_info = ax_mec.text(0.98, 0.98, '', transform=ax_mec.transAxes, 
                        verticalalignment='top', horizontalalignment='right',
                        fontsize=11, fontweight='bold',
                        bbox=dict(boxstyle='round,pad=0.8', facecolor='yellow', 
                                 alpha=0.8, edgecolor='black', linewidth=2))

# --- Panel 2: Posición del Pistón ---
ax_pos = fig.add_subplot(gs[0, 1])
ax_pos.plot(theta_deg, xB * 1000, 'r-', linewidth=1.5, alpha=0.3)
line_pos_anim, = ax_pos.plot([], [], 'r-', linewidth=2.5)
point_pos, = ax_pos.plot([], [], 'ro', markersize=10, zorder=5)
ax_pos.axhline(y=xB.mean()*1000, color='k', linestyle='--', alpha=0.4, linewidth=1.5)
ax_pos.fill_between(theta_deg, xB.min()*1000, xB.max()*1000, alpha=0.15, color='red')
ax_pos.set_xlabel('Ángulo de manivela θ₂ [°]', fontweight='bold')
ax_pos.set_ylabel('Posición [mm]', fontweight='bold')
ax_pos.set_title('Posición del Pistón vs Ángulo', fontweight='bold')
ax_pos.grid(True, alpha=0.3)
ax_pos.set_xlim([0, 360])
ax_pos.set_ylim([xB.min()*1000-5, xB.max()*1000+5])

# --- Panel 3: Velocidad del Pistón ---
ax_vel = fig.add_subplot(gs[0, 2])
ax_vel.plot(theta_deg, Vb, 'g-', linewidth=1.5, alpha=0.3)
line_vel_anim, = ax_vel.plot([], [], 'g-', linewidth=2.5)
point_vel, = ax_vel.plot([], [], 'go', markersize=10, zorder=5)
ax_vel.axhline(y=0, color='k', linestyle='-', alpha=0.4, linewidth=1.5)
ax_vel.fill_between(theta_deg, 0, Vb, where=(Vb>=0), alpha=0.2, color='green')
ax_vel.fill_between(theta_deg, 0, Vb, where=(Vb<0), alpha=0.2, color='orange')
ax_vel.set_xlabel('Ángulo de manivela θ₂ [°]', fontweight='bold')
ax_vel.set_ylabel('Velocidad [m/s]', fontweight='bold')
ax_vel.set_title('Velocidad del Pistón vs Ángulo', fontweight='bold')
ax_vel.grid(True, alpha=0.3)
ax_vel.set_xlim([0, 360])
ax_vel.set_ylim([Vb.min()-0.5, Vb.max()+0.5])

# --- Panel 4: Aceleración del Pistón ---
ax_acc = fig.add_subplot(gs[1, 1])
ax_acc.plot(theta_deg, Ab, 'b-', linewidth=1.5, alpha=0.3)
line_acc_anim, = ax_acc.plot([], [], 'b-', linewidth=2.5)
point_acc, = ax_acc.plot([], [], 'bo', markersize=10, zorder=5)
ax_acc.axhline(y=0, color='k', linestyle='-', alpha=0.4, linewidth=1.5)
ax_acc.fill_between(theta_deg, 0, Ab, where=(Ab>=0), alpha=0.2, color='blue')
ax_acc.fill_between(theta_deg, 0, Ab, where=(Ab<0), alpha=0.2, color='red')
ax_acc.set_xlabel('Ángulo de manivela θ₂ [°]', fontweight='bold')
ax_acc.set_ylabel('Aceleración [m/s²]', fontweight='bold')
ax_acc.set_title('Aceleración del Pistón vs Ángulo', fontweight='bold')
ax_acc.grid(True, alpha=0.3)
ax_acc.set_xlim([0, 360])
ax_acc.set_ylim([Ab.min()-50, Ab.max()+50])

# --- Panel 5: Ángulo de la Biela ---
ax_phi = fig.add_subplot(gs[1, 2])
ax_phi.plot(theta_deg, phi_deg, 'm-', linewidth=1.5, alpha=0.3)
line_phi_anim, = ax_phi.plot([], [], 'm-', linewidth=2.5)
point_phi, = ax_phi.plot([], [], 'mo', markersize=10, zorder=5)
ax_phi.axhline(y=0, color='k', linestyle='-', alpha=0.4, linewidth=1.5)
ax_phi.set_xlabel('Ángulo de manivela θ₂ [°]', fontweight='bold')
ax_phi.set_ylabel('Ángulo de biela φ [°]', fontweight='bold')
ax_phi.set_title('Ángulo de la Biela vs Ángulo de Manivela', fontweight='bold')
ax_phi.grid(True, alpha=0.3)
ax_phi.set_xlim([0, 360])
ax_phi.set_ylim([phi_deg.min()-1, phi_deg.max()+1])

# --- Panel 6: Hodógrafo (Velocidad vs Posición) ---
ax_hodo = fig.add_subplot(gs[2, 1])
ax_hodo.plot(xB * 1000, Vb, 'gray', linewidth=1.5, alpha=0.3)
line_hodo_anim, = ax_hodo.plot([], [], linewidth=2.5, color='cyan')
point_hodo, = ax_hodo.plot([], [], 'ko', markersize=10, zorder=5)
ax_hodo.set_xlabel('Posición [mm]', fontweight='bold')
ax_hodo.set_ylabel('Velocidad [m/s]', fontweight='bold')
ax_hodo.set_title('Hodógrafo: Velocidad vs Posición', fontweight='bold')
ax_hodo.grid(True, alpha=0.3)
ax_hodo.axhline(y=0, color='k', linestyle='-', alpha=0.4, linewidth=1.5)

# --- Panel 7: Diagrama Polar ---
ax_polar = fig.add_subplot(gs[2, 2], projection='polar')
ax_polar.plot(theta_rad, xB * 1000, 'gray', linewidth=1.5, alpha=0.3)
line_polar_anim, = ax_polar.plot([], [], linewidth=2.5, color='red')
point_polar, = ax_polar.plot([], [], 'ro', markersize=10, zorder=5)
ax_polar.set_title('Diagrama Polar: Posición [mm]', fontweight='bold', pad=20)
ax_polar.grid(True, alpha=0.3)

# Variables para almacenar trayectorias
trail_x, trail_y = [], []

# === 4. FUNCIONES DE ANIMACIÓN ===
def init():
    line_manivela.set_data([], [])
    line_biela.set_data([], [])
    point_A.set_data([], [])
    point_B.set_data([], [])
    trail_B.set_data([], [])
    line_pos_anim.set_data([], [])
    point_pos.set_data([], [])
    line_vel_anim.set_data([], [])
    point_vel.set_data([], [])
    line_acc_anim.set_data([], [])
    point_acc.set_data([], [])
    line_phi_anim.set_data([], [])
    point_phi.set_data([], [])
    line_hodo_anim.set_data([], [])
    point_hodo.set_data([], [])
    line_polar_anim.set_data([], [])
    point_polar.set_data([], [])
    text_info.set_text('')
    return (line_manivela, line_biela, point_A, point_B, trail_B,
            line_pos_anim, point_pos, line_vel_anim, point_vel,
            line_acc_anim, point_acc, line_phi_anim, point_phi,
            line_hodo_anim, point_hodo, line_polar_anim, point_polar, text_info)

def animate(frame):
    idx = frame % n_frames
    theta = theta_rad[idx]
    
    # Coordenadas del mecanismo
    xA = r2 * np.cos(theta)
    yA = r2 * np.sin(theta)
    xB_val = xB[idx]
    yB_val = 0.0
    
    # Actualizar mecanismo
    line_manivela.set_data([0, xA], [0, yA])
    line_biela.set_data([xA, xB_val], [yA, yB_val])
    point_A.set_data([xA], [yA])
    point_B.set_data([xB_val], [yB_val])
    
    # Actualizar trayectoria del pistón
    trail_x.append(xB_val)
    trail_y.append(yB_val)
    if len(trail_x) > 50:
        trail_x.pop(0)
        trail_y.pop(0)
    trail_B.set_data(trail_x, trail_y)
    
    # Actualizar gráficas con efecto de barrido
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
    
    # Actualizar texto informativo
    info_text = (f'θ₂ = {theta_deg[idx]:6.1f}°\n'
                 f'φ   = {phi_deg[idx]:6.1f}°\n\n'
                 f'Pos = {xB_val*1000:6.2f} mm\n'
                 f'Vel = {Vb[idx]:6.2f} m/s\n'
                 f'Acc = {Ab[idx]:6.1f} m/s²')
    text_info.set_text(info_text)
    
    return (line_manivela, line_biela, point_A, point_B, trail_B,
            line_pos_anim, point_pos, line_vel_anim, point_vel,
            line_acc_anim, point_acc, line_phi_anim, point_phi,
            line_hodo_anim, point_hodo, line_polar_anim, point_polar, text_info)

# Crear animación (30 fps, 3 ciclos completos = 36 segundos)
anim = FuncAnimation(fig, animate, init_func=init, 
                     frames=n_frames*3, interval=33, blit=True, repeat=True)

plt.suptitle('ANÁLISIS CINEMÁTICO ANIMADO - MECANISMO BIELA-MANIVELA', 
             fontsize=14, fontweight='bold', y=0.98)

print("\n✓ Iniciando animación del mecanismo...")
print("  → La animación mostrará 3 ciclos completos del mecanismo")
print("  → Observa cómo todas las gráficas se sincronizan con el movimiento")
print("  → Duración total: ~36 segundos\n")

plt.show()