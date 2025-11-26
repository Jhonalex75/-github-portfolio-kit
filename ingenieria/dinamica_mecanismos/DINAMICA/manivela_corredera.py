import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.patches import Circle
import matplotlib.gridspec as gridspec

# === CONFIGURACIÓN VISUAL PROFESIONAL ===
plt.style.use('seaborn-v0_8-darkgrid')
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['legend.fontsize'] = 9
plt.rcParams['figure.facecolor'] = 'white'

# === 1. PARÁMETROS DEL MECANISMO ===
r2 = 0.05      # Longitud manivela [m]
r3 = 0.20      # Longitud biela [m]
w2 = 100.0     # Velocidad angular manivela [rad/s]
alpha2 = 0.0   # Aceleración angular [rad/s²]
lambda_ratio = r2 / r3  # Relación adimensional λ = r/l

# Vector de ángulos para ciclo completo (mayor resolución)
theta_deg = np.linspace(0, 360, 720)
theta_rad = np.deg2rad(theta_deg)

# === 2. CÁLCULOS CINEMÁTICOS MEJORADOS ===

# Posición del pistón (fórmula exacta mejorada)
sin_theta = np.sin(theta_rad)
cos_theta = np.cos(theta_rad)
xB = r2 * cos_theta + r3 * np.sqrt(1 - (lambda_ratio * sin_theta)**2)

# Velocidad del pistón
Vb = -r2 * w2 * (sin_theta + (lambda_ratio / 2) * np.sin(2 * theta_rad))

# Aceleración del pistón
Ab = -r2 * w2**2 * (cos_theta + lambda_ratio * np.cos(2 * theta_rad))

# === 3. CÁLCULO DE PARÁMETROS ADICIONALES ===

# Ángulo de la biela (φ)
phi_rad = np.arcsin(lambda_ratio * sin_theta)
phi_deg = np.rad2deg(phi_rad)

# Carrera del pistón
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

# === 4. VISUALIZACIÓN PRINCIPAL CON MÚLTIPLES GRÁFICAS ===

fig = plt.figure(figsize=(16, 10))
gs = gridspec.GridSpec(3, 2, figure=fig, hspace=0.3, wspace=0.3)

# --- 4.1 Posición del Pistón ---
ax1 = fig.add_subplot(gs[0, 0])
ax1.plot(theta_deg, xB * 1000, 'r-', linewidth=2, label='Posición $x_B$')
ax1.axhline(y=xB.mean()*1000, color='k', linestyle='--', alpha=0.3, label='Posición media')
ax1.fill_between(theta_deg, xB.min()*1000, xB.max()*1000, alpha=0.1, color='red')
ax1.set_xlabel('Ángulo de manivela θ₂ [°]')
ax1.set_ylabel('Posición [mm]')
ax1.set_title('Posición del Pistón vs Ángulo de Manivela')
ax1.grid(True, alpha=0.3)
ax1.legend()
ax1.set_xlim([0, 360])

# --- 4.2 Velocidad del Pistón ---
ax2 = fig.add_subplot(gs[0, 1])
ax2.plot(theta_deg, Vb, 'g-', linewidth=2, label='Velocidad $V_B$')
ax2.axhline(y=0, color='k', linestyle='-', alpha=0.3)
ax2.fill_between(theta_deg, 0, Vb, where=(Vb>=0), alpha=0.3, color='green', label='Avance')
ax2.fill_between(theta_deg, 0, Vb, where=(Vb<0), alpha=0.3, color='orange', label='Retroceso')
ax2.set_xlabel('Ángulo de manivela θ₂ [°]')
ax2.set_ylabel('Velocidad [m/s]')
ax2.set_title('Velocidad del Pistón vs Ángulo de Manivela')
ax2.grid(True, alpha=0.3)
ax2.legend()
ax2.set_xlim([0, 360])

# --- 4.3 Aceleración del Pistón ---
ax3 = fig.add_subplot(gs[1, 0])
ax3.plot(theta_deg, Ab, 'b-', linewidth=2, label='Aceleración $A_B$')
ax3.axhline(y=0, color='k', linestyle='-', alpha=0.3)
ax3.fill_between(theta_deg, 0, Ab, where=(Ab>=0), alpha=0.3, color='blue')
ax3.fill_between(theta_deg, 0, Ab, where=(Ab<0), alpha=0.3, color='red')
ax3.set_xlabel('Ángulo de manivela θ₂ [°]')
ax3.set_ylabel('Aceleración [m/s²]')
ax3.set_title('Aceleración del Pistón vs Ángulo de Manivela')
ax3.grid(True, alpha=0.3)
ax3.legend()
ax3.set_xlim([0, 360])

# --- 4.4 Ángulo de la Biela ---
ax4 = fig.add_subplot(gs[1, 1])
ax4.plot(theta_deg, phi_deg, 'm-', linewidth=2, label='Ángulo φ')
ax4.axhline(y=0, color='k', linestyle='-', alpha=0.3)
ax4.set_xlabel('Ángulo de manivela θ₂ [°]')
ax4.set_ylabel('Ángulo de biela φ [°]')
ax4.set_title('Ángulo de la Biela vs Ángulo de Manivela')
ax4.grid(True, alpha=0.3)
ax4.legend()
ax4.set_xlim([0, 360])

# --- 4.5 Diagrama de Hodógrafo (Velocidad vs Posición) ---
ax5 = fig.add_subplot(gs[2, 0])
scatter = ax5.scatter(xB * 1000, Vb, c=theta_deg, cmap='hsv', s=10, alpha=0.6)
ax5.set_xlabel('Posición [mm]')
ax5.set_ylabel('Velocidad [m/s]')
ax5.set_title('Hodógrafo: Velocidad vs Posición')
ax5.grid(True, alpha=0.3)
cbar = plt.colorbar(scatter, ax=ax5)
cbar.set_label('Ángulo θ₂ [°]')

# --- 4.6 Diagrama Vectorial en Postura Específica ---
ax6 = fig.add_subplot(gs[2, 1])

# Selección de múltiples posturas para visualización
posturas = [0, 60, 120, 180, 240, 300]
colores = ['red', 'orange', 'green', 'cyan', 'blue', 'magenta']

for i, postura_deg in enumerate(posturas):
    idx = int(postura_deg * len(theta_deg) / 360)
    theta = theta_rad[idx]
    
    # Coordenadas
    xA = r2 * np.cos(theta)
    yA = r2 * np.sin(theta)
    xB_val = xB[idx]
    yB_val = 0.0
    
    # Dibujar mecanismo
    alpha_val = 0.4 + 0.1 * (i == 1)  # Destacar postura de 60°
    ax6.plot([0, xA], [0, yA], color=colores[i], linewidth=2, alpha=alpha_val)
    ax6.plot([xA, xB_val], [yA, yB_val], color=colores[i], linewidth=2, alpha=alpha_val, 
             label=f'θ={postura_deg}°')
    ax6.plot(xA, yA, 'o', color=colores[i], markersize=6, alpha=alpha_val)
    ax6.plot(xB_val, yB_val, 's', color=colores[i], markersize=6, alpha=alpha_val)

# Punto fijo O2
circle = Circle((0, 0), 0.003, color='black', fill=True, zorder=10)
ax6.add_patch(circle)
ax6.plot(0, 0, 'k^', markersize=12, label='O₂ (fijo)', zorder=11)

ax6.set_xlabel('Posición X [m]')
ax6.set_ylabel('Posición Y [m]')
ax6.set_title('Configuraciones del Mecanismo (Múltiples Posturas)')
ax6.axis('equal')
ax6.grid(True, alpha=0.3)
ax6.legend(loc='upper right', fontsize=8)
ax6.set_xlim([-0.08, 0.28])
ax6.set_ylim([-0.08, 0.08])

plt.suptitle('ANÁLISIS CINEMÁTICO COMPLETO - MECANISMO BIELA-MANIVELA', 
             fontsize=14, fontweight='bold', y=0.995)

plt.show()

# === 5. ANIMACIÓN INTERACTIVA DEL MECANISMO ===

fig_anim = plt.figure(figsize=(14, 6))
gs_anim = gridspec.GridSpec(1, 2, figure=fig_anim, wspace=0.3)

# Panel izquierdo: Mecanismo animado
ax_mec = fig_anim.add_subplot(gs_anim[0, 0])
ax_mec.set_xlim([-0.08, 0.28])
ax_mec.set_ylim([-0.08, 0.08])
ax_mec.set_aspect('equal')
ax_mec.grid(True, alpha=0.3)
ax_mec.set_xlabel('Posición X [m]')
ax_mec.set_ylabel('Posición Y [m]')
ax_mec.set_title('Mecanismo en Movimiento')

# Panel derecho: Gráficas dinámicas
ax_dyn = fig_anim.add_subplot(gs_anim[0, 1])
ax_dyn.set_xlim([0, 360])
ax_dyn.set_xlabel('Ángulo θ₂ [°]')
ax_dyn.set_ylabel('Magnitudes Cinemáticas')
ax_dyn.set_title('Evolución de Variables Cinemáticas')
ax_dyn.grid(True, alpha=0.3)

# Inicializar elementos gráficos
line_manivela, = ax_mec.plot([], [], 'r-', linewidth=4, label='Manivela')
line_biela, = ax_mec.plot([], [], 'b-', linewidth=4, label='Biela')
point_A, = ax_mec.plot([], [], 'ro', markersize=10, label='Punto A')
point_B, = ax_mec.plot([], [], 'bs', markersize=10, label='Punto B')
trail_B, = ax_mec.plot([], [], 'c--', linewidth=1, alpha=0.5, label='Trayectoria B')

# Círculo en O2
circle_O2 = Circle((0, 0), 0.003, color='black', fill=True, zorder=10)
ax_mec.add_patch(circle_O2)

# Líneas dinámicas
line_pos, = ax_dyn.plot([], [], 'r-', linewidth=2, label='Posición [mm]')
line_vel, = ax_dyn.plot([], [], 'g-', linewidth=2, label='Velocidad [m/s]')
line_acc, = ax_dyn.plot([], [], 'b-', linewidth=2, label='Aceleración/10 [m/s²]')
point_current, = ax_dyn.plot([], [], 'ko', markersize=8)

ax_mec.legend(loc='upper left')
ax_dyn.legend(loc='upper right')

# Texto informativo
text_info = ax_mec.text(0.02, 0.95, '', transform=ax_mec.transAxes, 
                        verticalalignment='top', fontsize=10,
                        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))

# Almacenar trayectoria
trail_x, trail_y = [], []

def init():
    line_manivela.set_data([], [])
    line_biela.set_data([], [])
    point_A.set_data([], [])
    point_B.set_data([], [])
    trail_B.set_data([], [])
    line_pos.set_data([], [])
    line_vel.set_data([], [])
    line_acc.set_data([], [])
    point_current.set_data([], [])
    text_info.set_text('')
    return (line_manivela, line_biela, point_A, point_B, trail_B,
            line_pos, line_vel, line_acc, point_current, text_info)

def animate(frame):
    idx = frame % len(theta_deg)
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
    
    # Actualizar trayectoria
    trail_x.append(xB_val)
    trail_y.append(yB_val)
    if len(trail_x) > 100:
        trail_x.pop(0)
        trail_y.pop(0)
    trail_B.set_data(trail_x, trail_y)
    
    # Actualizar gráficas dinámicas
    line_pos.set_data(theta_deg[:idx+1], xB[:idx+1] * 1000)
    line_vel.set_data(theta_deg[:idx+1], Vb[:idx+1])
    line_acc.set_data(theta_deg[:idx+1], Ab[:idx+1] / 10)
    point_current.set_data([theta_deg[idx]], [xB[idx] * 1000])
    
    # Actualizar texto
    info_text = (f'θ₂ = {theta_deg[idx]:.1f}°\n'
                 f'Pos = {xB_val*1000:.2f} mm\n'
                 f'Vel = {Vb[idx]:.2f} m/s\n'
                 f'Acc = {Ab[idx]:.1f} m/s²')
    text_info.set_text(info_text)
    
    return (line_manivela, line_biela, point_A, point_B, trail_B,
            line_pos, line_vel, line_acc, point_current, text_info)

anim = FuncAnimation(fig_anim, animate, init_func=init, 
                     frames=len(theta_deg), interval=20, blit=True, repeat=True)

plt.suptitle('ANIMACIÓN DEL MECANISMO BIELA-MANIVELA', fontsize=13, fontweight='bold')
plt.show()

print("\n✓ Análisis completado exitosamente")