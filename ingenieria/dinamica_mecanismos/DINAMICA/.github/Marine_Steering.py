"""
Análisis Dinámico del Mecanismo de Dirección Marina (Rapson's Slide)
Autor: Análisis de Mecanismos
Problema: Determinar posición, velocidad y aceleración del punto B
"""

# ============ IMPORTACIÓN DE LIBRERÍAS ============
import numpy as np  # Librería para cálculos numéricos y operaciones con arrays
import matplotlib.pyplot as plt  # Librería para crear gráficas estáticas
from matplotlib.animation import FuncAnimation  # Para crear animaciones
from matplotlib.patches import Circle, FancyArrowPatch  # Para dibujar círculos y flechas
import matplotlib.patches as mpatches  # Para crear leyendas personalizadas

# ============ CONFIGURACIÓN DE PARÁMETROS DEL PROBLEMA ============
# R1: Longitud del eslabón OD (timón) en pies
R1 = 8.0  # ft - Radio del eslabón 1 desde el origen O hasta el punto D

# R_BO4: Distancia del punto B al origen O en pies
R_BO4 = 11.0  # ft - Distancia desde O hasta el punto de análisis B

# v2: Velocidad constante del actuador AC (link 2) hacia la izquierda
v2 = 15.0  # ft/s - Velocidad del actuador que mueve el punto D

# theta_0: Ángulo inicial del eslabón OD respecto al eje horizontal
theta_0 = 30.0  # grados - Ángulo inicial dado en el problema

# Convertir el ángulo inicial a radianes para los cálculos
theta_0_rad = np.radians(theta_0)  # rad - Conversión de grados a radianes

# ============ CÁLCULO DE CONDICIONES INICIALES ============
# Posición inicial del punto D en coordenadas cartesianas
x0_D = R1 * np.cos(theta_0_rad)  # ft - Coordenada x inicial de D
y0_D = R1 * np.sin(theta_0_rad)  # ft - Coordenada y inicial de D

# Tiempo máximo de simulación: cuando D alcanza el origen O (x_D = 0)
# x_D = x0_D - v2*t = 0  =>  t_max = x0_D / v2
t_max = x0_D / v2  # s - Tiempo máximo antes de que D llegue a O

# ============ CONFIGURACIÓN DEL VECTOR DE TIEMPO ============
# Crear un array de tiempo desde 0 hasta t_max con 200 puntos
# np.linspace genera valores igualmente espaciados
t = np.linspace(0, t_max, 200)  # s - Vector de tiempo para la simulación

# ============ INICIALIZACIÓN DE ARRAYS PARA ALMACENAR RESULTADOS ============
# Crear arrays vacíos para almacenar los valores calculados en cada instante
theta = np.zeros_like(t)  # rad - Ángulo del eslabón OD en cada instante
omega = np.zeros_like(t)  # rad/s - Velocidad angular del eslabón OD
alpha = np.zeros_like(t)  # rad/s² - Aceleración angular del eslabón OD

# Posición del punto D
x_D = np.zeros_like(t)  # ft - Coordenada x de D en cada instante
y_D = np.zeros_like(t)  # ft - Coordenada y de D en cada instante

# Posición del punto B
x_B = np.zeros_like(t)  # ft - Coordenada x de B en cada instante
y_B = np.zeros_like(t)  # ft - Coordenada y de B en cada instante

# Velocidad del punto B
v_Bx = np.zeros_like(t)  # ft/s - Componente x de la velocidad de B
v_By = np.zeros_like(t)  # ft/s - Componente y de la velocidad de B
v_B_mag = np.zeros_like(t)  # ft/s - Magnitud de la velocidad de B

# Aceleración del punto B
a_Bx = np.zeros_like(t)  # ft/s² - Componente x de la aceleración de B
a_By = np.zeros_like(t)  # ft/s² - Componente y de la aceleración de B
a_B_mag = np.zeros_like(t)  # ft/s² - Magnitud de la aceleración de B

# ============ CÁLCULOS CINEMÁTICOS PRINCIPALES ============
# Iterar sobre cada instante de tiempo para calcular todos los parámetros
for i, time in enumerate(t):
    # -------- ANÁLISIS DE POSICIÓN --------
    # Posición actual de D: se mueve hacia la izquierda con velocidad v2
    x_D[i] = x0_D - v2 * time  # ft - Posición x de D decrece linealmente
    
    # Cálculo del ángulo theta usando la restricción geométrica
    # El punto D siempre está a distancia R1 del origen O
    # cos(θ) = x_D / R1
    theta[i] = np.arccos(x_D[i] / R1)  # rad - Ángulo del eslabón OD
    
    # Posición completa del punto D en coordenadas cartesianas
    y_D[i] = R1 * np.sin(theta[i])  # ft - Coordenada y de D
    
    # -------- ANÁLISIS DE VELOCIDAD --------
    # Velocidad angular del eslabón OD
    # Derivando x_D = R1*cos(θ) con respecto al tiempo:
    # dx_D/dt = -R1*sin(θ)*dθ/dt
    # -v2 = -R1*sin(θ)*ω
    # Por lo tanto: ω = v2 / (R1*sin(θ))
    omega[i] = v2 / (R1 * np.sin(theta[i]))  # rad/s - Velocidad angular
    
    # Velocidad del punto B usando la relación v_B = ω × r_OB
    # El punto B está en el mismo eslabón que D, a distancia R_BO4 del origen
    # v_Bx = -ω * R_BO4 * sin(θ)  (componente horizontal)
    v_Bx[i] = -omega[i] * R_BO4 * np.sin(theta[i])  # ft/s - Velocidad en x
    
    # v_By = ω * R_BO4 * cos(θ)  (componente vertical)
    v_By[i] = omega[i] * R_BO4 * np.cos(theta[i])  # ft/s - Velocidad en y
    
    # Magnitud de la velocidad de B (usando el teorema de Pitágoras)
    v_B_mag[i] = np.sqrt(v_Bx[i]**2 + v_By[i]**2)  # ft/s - |v_B|
    
    # -------- ANÁLISIS DE ACELERACIÓN --------
    # Aceleración angular del eslabón OD
    # Derivando ω = v2/(R1*sin(θ)) con respecto al tiempo:
    # dω/dt = -v2*cos(θ)*(dθ/dt) / (R1*sin²(θ))
    # Sustituyendo dθ/dt = ω:
    # α = -v2*cos(θ)*ω / (R1*sin²(θ))
    alpha[i] = (-v2 * np.cos(theta[i]) * omega[i]) / (R1 * np.sin(theta[i])**2)  # rad/s²
    
    # Aceleración del punto B tiene dos componentes:
    # 1. Aceleración tangencial: a_t = α × r (debida a α)
    a_Bx_tang = -alpha[i] * R_BO4 * np.sin(theta[i])  # ft/s² - Componente tangencial en x
    a_By_tang = alpha[i] * R_BO4 * np.cos(theta[i])  # ft/s² - Componente tangencial en y
    
    # 2. Aceleración normal (centrípeta): a_n = ω² × r (debida a ω)
    a_Bx_norm = -(omega[i]**2) * R_BO4 * np.cos(theta[i])  # ft/s² - Componente normal en x
    a_By_norm = -(omega[i]**2) * R_BO4 * np.sin(theta[i])  # ft/s² - Componente normal en y
    
    # Aceleración total de B (suma vectorial de componentes tangencial y normal)
    a_Bx[i] = a_Bx_tang + a_Bx_norm  # ft/s² - Aceleración total en x
    a_By[i] = a_By_tang + a_By_norm  # ft/s² - Aceleración total en y
    
    # Magnitud de la aceleración de B
    a_B_mag[i] = np.sqrt(a_Bx[i]**2 + a_By[i]**2)  # ft/s² - |a_B|
    
    # Posición del punto B en coordenadas cartesianas
    x_B[i] = R_BO4 * np.cos(theta[i])  # ft - Coordenada x de B
    y_B[i] = R_BO4 * np.sin(theta[i])  # ft - Coordenada y de B

# ============ VISUALIZACIÓN DE RESULTADOS ============
# Configurar el estilo de las gráficas
plt.style.use('dark_background')  # Usar tema oscuro para mejor visualización

# Crear una figura con múltiples subplots (2 filas, 2 columnas)
fig = plt.figure(figsize=(16, 12))  # Tamaño de la figura en pulgadas
fig.suptitle('Análisis Dinámico del Mecanismo Rapson\'s Slide', 
             fontsize=18, fontweight='bold', color='cyan')

# -------- SUBPLOT 1: ANIMACIÓN DEL MECANISMO --------
ax1 = plt.subplot(2, 2, 1)  # Subplot en la posición (1,1)
ax1.set_xlim(-2, 14)  # Límites del eje x en pies
ax1.set_ylim(-2, 14)  # Límites del eje y en pies
ax1.set_aspect('equal')  # Mantener proporción 1:1 en los ejes
ax1.grid(True, alpha=0.3, linestyle='--')  # Mostrar cuadrícula
ax1.set_xlabel('x (ft)', fontsize=12, color='white')  # Etiqueta eje x
ax1.set_ylabel('y (ft)', fontsize=12, color='white')  # Etiqueta eje y
ax1.set_title('Mecanismo en Movimiento', fontsize=14, color='cyan')

# Crear los elementos gráficos para la animación
# Línea para el eslabón OD (de O a D)
line_OD, = ax1.plot([], [], 'o-', color='cyan', linewidth=3, 
                    markersize=8, label='Eslabón OD')

# Línea para el eslabón OB (de O a B) - línea punteada
line_OB, = ax1.plot([], [], 'o--', color='magenta', linewidth=3, 
                    markersize=8, label='Punto B')

# Flecha para el vector velocidad de B
arrow_v = FancyArrowPatch((0, 0), (0, 0), color='lime', 
                          arrowstyle='->', mutation_scale=20, linewidth=2.5)
ax1.add_patch(arrow_v)  # Agregar la flecha al subplot

# Flecha para el vector aceleración de B
arrow_a = FancyArrowPatch((0, 0), (0, 0), color='orange', 
                          arrowstyle='->', mutation_scale=20, linewidth=2.5)
ax1.add_patch(arrow_a)  # Agregar la flecha al subplot

# Texto para mostrar el tiempo actual
time_text = ax1.text(0.02, 0.95, '', transform=ax1.transAxes, 
                     fontsize=12, color='yellow', verticalalignment='top',
                     bbox=dict(boxstyle='round', facecolor='black', alpha=0.7))

# Texto para mostrar valores numéricos
values_text = ax1.text(0.02, 0.75, '', transform=ax1.transAxes, 
                       fontsize=10, color='white', verticalalignment='top',
                       bbox=dict(boxstyle='round', facecolor='black', alpha=0.7))

# Crear leyenda personalizada con colores
legend_elements = [
    mpatches.Patch(color='cyan', label='Eslabón OD'),
    mpatches.Patch(color='magenta', label='Punto B'),
    mpatches.Patch(color='lime', label='Velocidad v_B'),
    mpatches.Patch(color='orange', label='Aceleración a_B')
]
ax1.legend(handles=legend_elements, loc='upper right', fontsize=10)

# -------- SUBPLOT 2: GRÁFICA DE VELOCIDAD VS TIEMPO --------
ax2 = plt.subplot(2, 2, 2)  # Subplot en la posición (1,2)
ax2.plot(t, v_B_mag, color='lime', linewidth=2.5, label='|v_B|')  # Magnitud de velocidad
ax2.plot(t, v_Bx, color='cyan', linewidth=1.5, alpha=0.7, 
         linestyle='--', label='v_Bx')  # Componente x
ax2.plot(t, v_By, color='magenta', linewidth=1.5, alpha=0.7, 
         linestyle='--', label='v_By')  # Componente y
ax2.grid(True, alpha=0.3)  # Mostrar cuadrícula
ax2.set_xlabel('Tiempo (s)', fontsize=12, color='white')  # Etiqueta eje x
ax2.set_ylabel('Velocidad (ft/s)', fontsize=12, color='white')  # Etiqueta eje y
ax2.set_title('Velocidad del Punto B vs Tiempo', fontsize=14, color='lime')
ax2.legend(loc='best', fontsize=10)  # Mostrar leyenda
# Línea vertical móvil para indicar el tiempo actual en la animación
v_line = ax2.axvline(x=0, color='yellow', linestyle='--', linewidth=2, alpha=0.7)

# -------- SUBPLOT 3: GRÁFICA DE ACELERACIÓN VS TIEMPO --------
ax3 = plt.subplot(2, 2, 3)  # Subplot en la posición (2,1)
ax3.plot(t, a_B_mag, color='orange', linewidth=2.5, label='|a_B|')  # Magnitud de aceleración
ax3.plot(t, a_Bx, color='cyan', linewidth=1.5, alpha=0.7, 
         linestyle='--', label='a_Bx')  # Componente x
ax3.plot(t, a_By, color='magenta', linewidth=1.5, alpha=0.7, 
         linestyle='--', label='a_By')  # Componente y
ax3.grid(True, alpha=0.3)  # Mostrar cuadrícula
ax3.set_xlabel('Tiempo (s)', fontsize=12, color='white')  # Etiqueta eje x
ax3.set_ylabel('Aceleración (ft/s²)', fontsize=12, color='white')  # Etiqueta eje y
ax3.set_title('Aceleración del Punto B vs Tiempo', fontsize=14, color='orange')
ax3.legend(loc='best', fontsize=10)  # Mostrar leyenda
# Línea vertical móvil para indicar el tiempo actual en la animación
a_line = ax3.axvline(x=0, color='yellow', linestyle='--', linewidth=2, alpha=0.7)

# -------- SUBPLOT 4: PARÁMETROS ANGULARES VS TIEMPO --------
ax4 = plt.subplot(2, 2, 4)  # Subplot en la posición (2,2)
# Crear dos ejes y para mostrar diferentes escalas
ax4_omega = ax4.twinx()  # Eje y secundario para omega
ax4.plot(t, np.degrees(theta), color='yellow', linewidth=2.5, 
         label='θ (grados)')  # Ángulo en grados
ax4_omega.plot(t, omega, color='cyan', linewidth=2, 
               linestyle='--', label='ω (rad/s)')  # Velocidad angular
ax4.grid(True, alpha=0.3)  # Mostrar cuadrícula
ax4.set_xlabel('Tiempo (s)', fontsize=12, color='white')  # Etiqueta eje x
ax4.set_ylabel('Ángulo θ (grados)', fontsize=12, color='yellow')  # Etiqueta eje y izquierdo
ax4_omega.set_ylabel('Velocidad Angular ω (rad/s)', fontsize=12, 
                     color='cyan')  # Etiqueta eje y derecho
ax4.set_title('Parámetros Angulares vs Tiempo', fontsize=14, color='yellow')
# Combinar leyendas de ambos ejes
lines1, labels1 = ax4.get_legend_handles_labels()
lines2, labels2 = ax4_omega.get_legend_handles_labels()
ax4.legend(lines1 + lines2, labels1 + labels2, loc='best', fontsize=10)
# Línea vertical móvil para indicar el tiempo actual
theta_line = ax4.axvline(x=0, color='yellow', linestyle='--', linewidth=2, alpha=0.7)

# ============ FUNCIÓN DE INICIALIZACIÓN PARA LA ANIMACIÓN ============
def init():
    """
    Función de inicialización para la animación.
    Establece el estado inicial de todos los elementos gráficos.
    """
    # Inicializar las líneas del mecanismo (vacías)
    line_OD.set_data([], [])
    line_OB.set_data([], [])
    
    # Inicializar las flechas de vectores
    arrow_v.set_positions((0, 0), (0, 0))
    arrow_a.set_positions((0, 0), (0, 0))
    
    # Inicializar los textos
    time_text.set_text('')
    values_text.set_text('')
    
    # Retornar todos los elementos que serán animados
    return line_OD, line_OB, arrow_v, arrow_a, time_text, values_text

# ============ FUNCIÓN DE ACTUALIZACIÓN PARA LA ANIMACIÓN ============
def update(frame):
    """
    Función de actualización para cada cuadro de la animación.
    
    Parámetros:
    -----------
    frame : int
        Índice del cuadro actual (de 0 a len(t)-1)
    """
    # Actualizar la línea del eslabón OD (desde el origen hasta el punto D)
    line_OD.set_data([0, x_D[frame]], [0, y_D[frame]])
    
    # Actualizar la línea del eslabón OB (desde el origen hasta el punto B)
    line_OB.set_data([0, x_B[frame]], [0, y_B[frame]])
    
    # Factor de escala para los vectores (para que sean visibles)
    scale_v = 0.3  # Factor de escala para la velocidad
    scale_a = 0.15  # Factor de escala para la aceleración
    
    # Actualizar la flecha del vector velocidad
    # Desde el punto B hasta B + v*escala
    arrow_v.set_positions(
        (x_B[frame], y_B[frame]),  # Posición inicial (punto B)
        (x_B[frame] + v_Bx[frame] * scale_v, 
         y_B[frame] + v_By[frame] * scale_v)  # Posición final
    )
    
    # Actualizar la flecha del vector aceleración
    # Desde el punto B hasta B + a*escala
    arrow_a.set_positions(
        (x_B[frame], y_B[frame]),  # Posición inicial (punto B)
        (x_B[frame] + a_Bx[frame] * scale_a, 
         y_B[frame] + a_By[frame] * scale_a)  # Posición final
    )
    
    # Actualizar el texto del tiempo
    time_text.set_text(f'Tiempo: {t[frame]:.3f} s')
    
    # Actualizar el texto con los valores numéricos actuales
    values_text.set_text(
        f'θ = {np.degrees(theta[frame]):.2f}°\n'
        f'ω = {omega[frame]:.3f} rad/s\n'
        f'α = {alpha[frame]:.3f} rad/s²\n'
        f'|v_B| = {v_B_mag[frame]:.2f} ft/s\n'
        f'|a_B| = {a_B_mag[frame]:.2f} ft/s²'
    )
    
    # Actualizar las líneas verticales en las gráficas
    v_line.set_xdata([t[frame], t[frame]])  # Línea en gráfica de velocidad
    a_line.set_xdata([t[frame], t[frame]])  # Línea en gráfica de aceleración
    theta_line.set_xdata([t[frame], t[frame]])  # Línea en gráfica de ángulo
    
    # Retornar todos los elementos actualizados
    return line_OD, line_OB, arrow_v, arrow_a, time_text, values_text

# ============ CREAR Y MOSTRAR LA ANIMACIÓN ============
# FuncAnimation crea la animación llamando a update() para cada cuadro
anim = FuncAnimation(
    fig,  # Figura donde se mostrará la animación
    update,  # Función que actualiza cada cuadro
    init_func=init,  # Función de inicialización
    frames=len(t),  # Número total de cuadros
    interval=50,  # Intervalo entre cuadros en milisegundos (50ms = 20 fps)
    blit=True,  # Optimización: solo redibujar elementos que cambiaron
    repeat=True  # Repetir la animación cuando termine
)

# Ajustar el espaciado entre subplots para mejor visualización
plt.tight_layout()

# Mostrar la figura con la animación
plt.show()

# ============ IMPRIMIR RESULTADOS CLAVE ============
print("=" * 70)
print("ANÁLISIS DINÁMICO DEL MECANISMO RAPSON'S SLIDE")
print("=" * 70)
print(f"\nPARÁMETROS DEL SISTEMA:")
print(f"  • Longitud del eslabón OD (R₁): {R1} ft")
print(f"  • Distancia OB (R_BO₄): {R_BO4} ft")
print(f"  • Velocidad del actuador (v₂): {v2} ft/s")
print(f"  • Ángulo inicial (θ₀): {theta_0}°")
print(f"  • Tiempo de simulación: {t_max:.3f} s")

print(f"\nCONDICIÓN INICIAL (t = 0 s):")
print(f"  • Ángulo θ: {np.degrees(theta[0]):.2f}°")
print(f"  • Velocidad angular ω: {omega[0]:.4f} rad/s")
print(f"  • Aceleración angular α: {alpha[0]:.4f} rad/s²")
print(f"  • Velocidad de B: |v_B| = {v_B_mag[0]:.3f} ft/s")
print(f"  • Aceleración de B: |a_B| = {a_B_mag[0]:.3f} ft/s²")

# Encontrar el índice del valor máximo de velocidad
idx_max_v = np.argmax(v_B_mag)
print(f"\nVELOCIDAD MÁXIMA DE B:")
print(f"  • Tiempo: t = {t[idx_max_v]:.3f} s")
print(f"  • Ángulo θ: {np.degrees(theta[idx_max_v]):.2f}°")
print(f"  • Velocidad: |v_B| = {v_B_mag[idx_max_v]:.3f} ft/s")

# Encontrar el índice del valor máximo de aceleración
idx_max_a = np.argmax(a_B_mag)
print(f"\nACELERACIÓN MÁXIMA DE B:")
print(f"  • Tiempo: t = {t[idx_max_a]:.3f} s")
print(f"  • Ángulo θ: {np.degrees(theta[idx_max_a]):.2f}°")
print(f"  • Aceleración: |a_B| = {a_B_mag[idx_max_a]:.3f} ft/s²")

print(f"\nCONDICIÓN FINAL (t = {t_max:.3f} s):")
print(f"  • Ángulo θ: {np.degrees(theta[-1]):.2f}°")
print(f"  • Velocidad angular ω: {omega[-1]:.4f} rad/s")
print(f"  • Aceleración angular α: {alpha[-1]:.4f} rad/s²")
print(f"  • Velocidad de B: |v_B| = {v_B_mag[-1]:.3f} ft/s")
print(f"  • Aceleración de B: |a_B| = {a_B_mag[-1]:.3f} ft/s²")
print("=" * 70)