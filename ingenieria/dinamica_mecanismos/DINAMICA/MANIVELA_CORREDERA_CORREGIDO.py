import numpy as np
import matplotlib.pyplot as plt

# --- 1. DATOS DEL PROBLEMA (Constantes Geométricas y de Operación) ---
r2 = 0.05   # Longitud de la manivela (m)
r3 = 0.20   # Longitud de la biela (m)
w2 = 100.0  # Velocidad angular (rad/s)
alpha2 = 0.0  # Aceleración angular (rad/s²)
ratio_r_l = r2 / r3  # Relación r/l

# Vector de ángulos para un ciclo completo (0° a 360°)
theta_deg = np.linspace(0, 360, 360)
theta_rad = np.deg2rad(theta_deg)

# --- 2. CÁLCULOS CINEMÁTICOS (Pistón B) ---

# Término común para evitar cálculos repetidos
d = np.maximum(1e-10, r3**2 - (r2 * np.sin(theta_rad))**2)
sqrt_d = np.sqrt(d)

# 1. Posición del Pistón (xB)
xB = r2 * np.cos(theta_rad) + np.sqrt(np.maximum(0, r3**2 - (r2 * np.sin(theta_rad))**2))

# 2. Velocidad del Pistón (Vb)
Vb = -r2 * w2 * np.sin(theta_rad) - (r2**2 * w2 * np.sin(2*theta_rad)) / (2 * sqrt_d)

# 3. Aceleración del Pistón (Ab)
Ab = -r2 * w2**2 * np.cos(theta_rad) - (r2**2 * w2**2 * (2 * np.cos(2*theta_rad) * d + 
                     (r2**2 * np.sin(2*theta_rad)**2) / (4 * d))) / (2 * d**1.5)

# --- 3. VISUALIZACIÓN DE MAGNITUDES ---
plt.figure(figsize=(12, 9))

# 3.1. Gráfico de Posición
plt.subplot(3, 1, 1)
plt.plot(theta_deg, xB * 1000, 'r')
plt.title('Posición del Pistón ($x_B$) vs. Ángulo de la Manivela ($\Theta_2$)')
plt.ylabel('Posición (mm)')
plt.grid(True)

# 3.2. Gráfico de Velocidad
plt.subplot(3, 1, 2)
plt.plot(theta_deg, Vb, 'g')
plt.title('Velocidad del Pistón ($V_B$) vs. Ángulo de la Manivela ($\Theta_2$)')
plt.ylabel('Velocidad (m/s)')
plt.grid(True)

# 3.3. Gráfico de Aceleración
plt.subplot(3, 1, 3)
plt.plot(theta_deg, Ab, 'b')
plt.title('Aceleración del Pistón ($A_B$) vs. Ángulo de la Manivela ($\Theta_2$)')
plt.ylabel('Aceleración (m/s$^2$)')
plt.xlabel('Ángulo ($\Theta_2$, grados)')
plt.grid(True)

plt.tight_layout()
plt.show()

# --- 4. GRÁFICO VECTORIAL (Instante específico) ---
postura_idx = 60  # 60 grados
theta_manivela = theta_rad[postura_idx]
Ab_val = Ab[postura_idx]
Vb_val = Vb[postura_idx]

# Coordenadas de los puntos
xA = r2 * np.cos(theta_manivela)
yA = r2 * np.sin(theta_manivela)
xB_val = xB[postura_idx]
yB_val = 0.0

# Crear figura
plt.figure(figsize=(9, 7))

# Dibujar eslabones
plt.plot([0, xA], [0, yA], 'r-', linewidth=3, label='Manivela (r2)')
plt.plot([xA, xB_val], [yA, yB_val], 'b-', linewidth=3, label='Biela (r3)')

# Marcar puntos
plt.plot(0, 0, 'k^', markersize=10, label='O2 (Fijo)')
plt.plot(xA, yA, 'ro', markersize=8, label='Punto A')
plt.plot(xB_val, yB_val, 'bs', markersize=8, label='Punto B (Pistón)')

# Factores de escala
A_scale_factor = 2500 / r2 / w2**2
V_scale_factor = 100 / r2 / w2

# Vector Aceleración
plt.quiver(xB_val, yB_val, Ab_val, 0, 
           color='m', scale=A_scale_factor, 
           width=0.003, label=f'Aceleración $\mathbf{{A}}_B$ ({Ab_val:.1f} m/s²)')

# Vector Velocidad
plt.quiver(xB_val, yB_val, Vb_val, 0, 
           color='c', scale=V_scale_factor, 
           width=0.003, headwidth=5, headlength=7,
           label=f'Velocidad $\mathbf{{V}}_B$ ({Vb_val:.1f} m/s)')

plt.title(f'Análisis Vectorial a $\Theta_2 = 60^{{\circ}}$ (Dinámica de Máquinas)')
plt.xlabel('Eje X (m)')
plt.ylabel('Eje Y (m)')
plt.axis('equal')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
