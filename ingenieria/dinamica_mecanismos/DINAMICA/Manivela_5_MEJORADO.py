# =============================================================================
# SIMULADOR DE MECANISMO BIELA-MANIVELA CON ANÁLISIS DINÁMICO
# =============================================================================
"""
Este script implementa un simulador interactivo de un mecanismo biela-manivela
con análisis cinemático y dinámico completo. El programa muestra:
1. Animación del mecanismo en movimiento
2. Gráficas de posición, velocidad y aceleración del pistón
3. Análisis de fuerzas inerciales y en la biela
4. Control interactivo de la velocidad angular

Estructura del código:
1. Importación de bibliotecas y configuración visual
2. Definición de la clase MecanismoBielaManivela
3. Configuración de la interfaz gráfica
4. Implementación de la animación
5. Control interactivo con slider
"""

# === 1. IMPORTACIÓN DE BIBLIOTECAS ===
import numpy as np          # Para cálculos numéricos eficientes
import matplotlib.pyplot as plt        # Para crear gráficos
from matplotlib.animation import FuncAnimation  # Para animar gráficos
import matplotlib.gridspec as gridspec # Para organizar subplots
from matplotlib.widgets import Slider  # Para control interactivo

# === CONFIGURACIÓN VISUAL PROFESIONAL ===
plt.style.use('seaborn-v0_8-darkgrid')
plt.rcParams.update({
    'font.size': 9, 'axes.labelsize': 10, 'axes.titlesize': 12,
    'xtick.labelsize': 8, 'ytick.labelsize': 8, 'legend.fontsize': 9,
    'figure.titlesize': 14, 'figure.facecolor': '#2E2E2E',
    'axes.facecolor': '#2E2E2E', 'xtick.color': 'white', 'ytick.color': 'white',
    'axes.labelcolor': 'white', 'axes.titlecolor': 'white', 'text.color': 'white'
})

# === IMPLEMENTACIÓN DEL MECANISMO USANDO PROGRAMACIÓN ORIENTADA A OBJETOS ===
class MecanismoBielaManivela:
    """
    Esta clase encapsula toda la lógica del mecanismo biela-manivela.
    
    Componentes del mecanismo:
    - Manivela (r2): Elemento giratorio conectado al motor
    - Biela (r3): Conecta la manivela con el pistón
    - Pistón: Elemento que se mueve linealmente
    
    Variables cinemáticas:
    - theta: Ángulo de la manivela
    - phi: Ángulo de la biela
    - xB: Posición horizontal del pistón
    - Vb: Velocidad del pistón
    - Ab: Aceleración del pistón
    
    Variables dinámicas:
    - F_inercia: Fuerza de inercia del pistón (-m*a)
    - F_biela: Fuerza que se transmite a través de la biela
    """
    def __init__(self, r2, r3, m_piston):
        """
        Inicializa un nuevo mecanismo biela-manivela.
        
        Parámetros:
        - r2 (float): Longitud de la manivela [m]
        - r3 (float): Longitud de la biela [m]
        - m_piston (float): Masa del pistón [kg]
        """
        # === PARÁMETROS GEOMÉTRICOS Y DE MASA ===
        self.r2 = r2              # Longitud de la manivela [m]
        self.r3 = r3              # Longitud de la biela [m]
        self.m_piston = m_piston  # Masa del pistón [kg]
        # La relación lambda es un parámetro adimensional importante en el análisis
        self.lambda_ratio = r2 / r3    # Relación r2/r3 (típicamente < 1)

        # === PARÁMETROS DE SIMULACIÓN ===
        # Discretizamos una revolución completa en 360 puntos
        self.n_frames = 360           # Un punto por grado para precisión
        # Generamos los ángulos en grados y radianes
        self.theta_deg = np.linspace(0, 360, self.n_frames)    # [grados]
        self.theta_rad = np.deg2rad(self.theta_deg)            # [rad]
        # Pre-calculamos funciones trigonométricas para eficiencia
        self.sin_theta = np.sin(self.theta_rad)    # sin(θ)
        self.cos_theta = np.cos(self.theta_rad)    # cos(θ)

        # Atributos que se calcularán
        self.xB = None
        self.Vb = None
        self.Ab = None
        self.F_inercia = None
        self.F_biela = None
        self.phi_rad = None
        self.phi_deg = None

    def calcular_cinematica(self, w2):
        """
        Calcula todas las variables cinemáticas y dinámicas del mecanismo.
        
        Este método implementa las ecuaciones exactas del mecanismo biela-manivela:
        1. Posición: xB = r2*cos(θ) + √(r3² - (r2*sin(θ))²)
        2. Velocidad: vB = -r2*ω2*[sin(θ) + (r2*sin(2θ))/(2d)]
        3. Aceleración: aB = -r2*ω2²[cos(θ) + (r2*cos(2θ))/d - (r2³*sin²(2θ))/(4d³)]
        4. Fuerza inercial: FI = -m*aB
        5. Fuerza en biela: FB = -FI/cos(φ)
        
        Parámetros:
        - w2 (float): Velocidad angular de la manivela [rad/s]
        """
        # === 1. CÁLCULOS PRELIMINARES ===
        # La distancia 'd' es clave en las ecuaciones y requiere cuidado numérico
        eps = 1e-12  # Epsilon para evitar división por cero
        # d² = r3² - (r2*sin(θ))² (teorema de Pitágoras)
        d_sq = np.maximum(eps, self.r3**2 - (self.r2 * self.sin_theta)**2)
        d = np.sqrt(d_sq)    # Distancia horizontal efectiva [m]

        # === 2. ANÁLISIS DE POSICIÓN ===
        # La posición del pistón es la suma de dos términos:
        # 1) Proyección horizontal de la manivela: r2*cos(θ)
        # 2) Proyección horizontal de la biela: d
        self.xB = self.r2 * self.cos_theta + d    # Posición del pistón [m]

        # === 3. ANÁLISIS DE VELOCIDAD ===
        # La velocidad tiene dos componentes:
        # 1) Velocidad debido al movimiento de la manivela
        # 2) Velocidad debido al cambio en la orientación de la biela
        sin_2theta = np.sin(2 * self.theta_rad)    # Precalculamos sin(2θ)
        self.Vb = -self.r2 * w2 * (
            self.sin_theta +           # Término de la manivela
            (self.r2 * sin_2theta) / (2 * d)  # Término de la biela
        )   # Velocidad del pistón [m/s]

        # === 4. ANÁLISIS DE ACELERACIÓN ===
        # La aceleración tiene tres términos:
        # 1) Aceleración normal de la manivela
        # 2) Aceleración debida al acoplamiento manivela-biela
        # 3) Término no lineal debido a la geometría
        cos_theta = self.cos_theta
        cos_2theta = np.cos(2 * self.theta_rad)
        
        term1 = -self.r2 * w2**2 * cos_theta           # Aceleración normal [m/s²]
        term2 = -(self.r2**2 * w2**2 * cos_2theta) / d # Acoplamiento [m/s²]
        term3 = (self.r2**4 * w2**2 * sin_2theta**2) / (4 * d_sq * d)  # No lineal [m/s²]
        self.Ab = term1 + term2 + term3    # Aceleración total del pistón [m/s²]

        # === 5. ANÁLISIS DE FUERZAS (DINÁMICA) ===
        # Calculamos las fuerzas usando la Segunda Ley de Newton (F = ma)
        
        # 5.1 Fuerza de Inercia
        # La fuerza de inercia es la resistencia del pistón al movimiento
        # F = -ma (el signo negativo indica que se opone al movimiento)
        self.F_inercia = -self.m_piston * self.Ab    # Fuerza de inercia [N]

        # 5.2 Ángulo de la biela (necesario para descomponer fuerzas)
        # El ángulo φ se calcula usando la relación r2/r3*sin(θ)
        self.phi_rad = np.arcsin(self.lambda_ratio * self.sin_theta)  # [rad]
        self.phi_deg = np.rad2deg(self.phi_rad)    # Conversión a grados
        
        # 5.3 Fuerza en la Biela
        # La fuerza en la biela se calcula por equilibrio de fuerzas horizontales:
        # F_biela * cos(φ) = -F_inercia
        # Por lo tanto: F_biela = -F_inercia / cos(φ)
        # Usamos np.maximum para evitar división por cero cuando cos(φ) es muy pequeño
        self.F_biela = -self.F_inercia / np.maximum(1e-9, np.cos(self.phi_rad))    # [N]


    def imprimir_info(self, w2):
        carrera = self.xB.max() - self.xB.min()
        print("+------------------------------------------------------+")
        print("|       PARAMETROS DEL MECANISMO BIELA-MANIVELA       |")
        print("+------------------------------------------------------+")
        print(f"| Manivela (r):           {self.r2*1000:6.1f} mm             |")
        print(f"| Biela (l):              {self.r3*1000:6.1f} mm             |")
        print(f"| Masa Piston:            {self.m_piston:6.2f} kg              |")
        print(f"| Relacion lambda = r/l:  {self.lambda_ratio:6.4f}               |")
        print(f"| Velocidad angular (w):  {w2:6.1f} rad/s          |")
        print(f"| Carrera del piston:     {carrera*1000:6.2f} mm            |")
        print(f"| Velocidad maxima:       {abs(self.Vb).max():6.2f} m/s           |")
        print(f"| Aceleracion maxima:     {abs(self.Ab).max():7.1f} m/s²         |")
        print(f"| Fuerza Inercia max:     {abs(self.F_inercia).max()/1000:6.2f} kN          |")
        print(f"| Fuerza Biela max:       {abs(self.F_biela).max()/1000:6.2f} kN          |")
        print("+------------------------------------------------------+")

# === 1. PARÁMETROS INICIALES ===
r2_init = 0.05
r3_init = 0.20
w2_init = 100.0
m_piston_init = 0.5

# Instanciar el mecanismo
mecanismo = MecanismoBielaManivela(r2=r2_init, r3=r3_init, m_piston=m_piston_init)
mecanismo.calcular_cinematica(w2=w2_init)
mecanismo.imprimir_info(w2=w2_init)

# === 2. CONFIGURACIÓN DE LA FIGURA Y SUBPLOTS ===
fig = plt.figure(figsize=(18, 10))
fig.suptitle('Analisis Cinematico y Cinetico Interactivo', fontweight='bold')

# Se define un layout con GridSpec para un control preciso de la posición de los subplots.
# Se crea una cuadrícula de 3x3. La primera columna se usará para la animación del mecanismo.
# Las dos columnas de la derecha se usarán para las gráficas de cinemática y cinética.
gs = gridspec.GridSpec(3, 3, figure=fig, hspace=0.6, wspace=0.4, top=0.9, bottom=0.15, left=0.07, right=0.95)

ax_mech = fig.add_subplot(gs[:, 0])      # Eje para el mecanismo (ocupa toda la columna izquierda)
ax_pos = fig.add_subplot(gs[0, 1])       # Eje para la posición
ax_vel = fig.add_subplot(gs[1, 1])       # Eje para la velocidad
ax_acc = fig.add_subplot(gs[2, 1])       # Eje para la aceleración
ax_fuerza = fig.add_subplot(gs[0, 2])    # Eje para la fuerza de inercia
ax_hodo = fig.add_subplot(gs[1, 2])      # Eje para el hodógrafo
ax_biela = fig.add_subplot(gs[2, 2])     # Eje para la fuerza en la biela

# Configuración del mecanismo
ax_mech.set_xlim(-0.08, 0.30)
ax_mech.set_ylim(-0.15, 0.15)
ax_mech.set_aspect('equal')
ax_mech.grid(True, alpha=0.3)
ax_mech.set_xlabel('Posicion X [m]'); ax_mech.set_ylabel('Posicion Y [m]')
ax_mech.set_title('Mecanismo Biela-Manivela', fontweight='bold')

# Configuración de los demás subplots
def setup_plot(ax, title, xlabel, ylabel):
    ax.set_title(title, fontweight='bold'); ax.set_xlabel(xlabel); ax.set_ylabel(ylabel)
    ax.grid(True, alpha=0.3); ax.axhline(0, color='gray', lw=0.5, ls='--')
    if xlabel == 'Angulo [°]':
        ax.set_xlim(0, 360)

setup_plot(ax_pos, 'Posicion del Piston', 'Angulo [°]', 'Posicion [mm]')
setup_plot(ax_vel, 'Velocidad del Piston', 'Angulo [°]', 'Velocidad [m/s]')
setup_plot(ax_acc, 'Aceleracion del Piston', 'Angulo [°]', 'Aceleracion [m/s²]')
setup_plot(ax_fuerza, 'Fuerza de Inercia', 'Angulo [°]', 'Fuerza [kN]')
setup_plot(ax_hodo, 'Hodografo', 'Posicion [mm]', 'Velocidad [m/s]')
setup_plot(ax_biela, 'Fuerza en la Biela', 'Angulo [°]', 'Fuerza [kN]')

# === 3. ELEMENTOS GRÁFICOS ===
crank, = ax_mech.plot([], [], 'b-', linewidth=3, label='Manivela')
rod, = ax_mech.plot([], [], 'r-', linewidth=3, label='Biela')
piston, = ax_mech.plot([], [], 'gs', markersize=12, label='Pistón')
point_A, = ax_mech.plot([], [], 'ko', markersize=8)
point_B, = ax_mech.plot([], [], 'go', markersize=8)

line_pos, = ax_pos.plot([], [], 'c-', lw=1.5)
line_vel, = ax_vel.plot([], [], 'g-', lw=1.5)
line_acc, = ax_acc.plot([], [], 'r-', lw=1.5)
line_fuerza, = ax_fuerza.plot([], [], 'm-', lw=1.5)
line_hodo, = ax_hodo.plot([], [], 'y-', lw=1.5)
line_biela, = ax_biela.plot([], [], color='#FF8C00', linestyle='-', lw=1.5)

point_pos, = ax_pos.plot([], [], 'co', markersize=8)
point_vel, = ax_vel.plot([], [], 'go', markersize=8)
point_acc, = ax_acc.plot([], [], 'ro', markersize=8)
point_fuerza, = ax_fuerza.plot([], [], 'mo', markersize=8)
point_hodo, = ax_hodo.plot([], [], 'yo', markersize=8)
point_biela, = ax_biela.plot([], [], 'o', color='#FF8C00', markersize=8)

text_info = ax_mech.text(0.02, 0.98, '', transform=ax_mech.transAxes,
                         verticalalignment='top', fontsize=9,
                         bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8, ec='black'))
ax_mech.legend(loc='lower right', framealpha=0.9)

# === PROPUESTA 4: SLIDER INTERACTIVO ===
ax_slider = plt.axes([0.25, 0.05, 0.65, 0.03], facecolor='gray')
w2_slider = Slider(
    ax=ax_slider, label='Velocidad Angular (rad/s)', valmin=10, valmax=500,
    valinit=w2_init, valstep=10, color='cyan'
)

# === 4. FUNCIONES DE ACTUALIZACIÓN Y ANIMACIÓN ===
def init():
    """Inicializa los elementos de la animación."""
    artists = [crank, rod, piston, point_A, point_B,
               line_pos, line_vel, line_acc, line_fuerza, line_hodo, line_biela,
               point_pos, point_vel, point_acc, point_fuerza, point_hodo, point_biela]
    for artist in artists:
        artist.set_data([], [])
    text_info.set_text('')
    return artists + [text_info]

def animate(frame):
    """
    Función principal de animación que se ejecuta para cada frame.
    
    Esta función realiza tres tareas principales:
    1. Actualiza la posición de los elementos del mecanismo
    2. Actualiza las gráficas de análisis hasta el frame actual
    3. Actualiza el texto informativo con valores instantáneos
    
    Parámetros:
    - frame (int): Número del frame actual en la animación
    
    Retorna:
    - tuple: Lista de todos los elementos gráficos que deben actualizarse
    """
    i = frame % mecanismo.n_frames
    theta = mecanismo.theta_rad[i]
    
    xA = mecanismo.r2 * np.cos(theta)
    yA = mecanismo.r2 * np.sin(theta)
    xB_current = mecanismo.xB[i]
    
    # Actualizar mecanismo
    crank.set_data([0, xA], [0, yA])
    rod.set_data([xA, xB_current], [yA, 0])
    piston.set_data([xB_current], [0])
    point_A.set_data([xA], [yA])
    point_B.set_data([xB_current], [0])
    
    # Actualizar puntos y líneas de las gráficas
    # Líneas: mostrar datos hasta el frame actual
    line_pos.set_data(mecanismo.theta_deg[:i+1], mecanismo.xB[:i+1] * 1000)
    line_vel.set_data(mecanismo.theta_deg[:i+1], mecanismo.Vb[:i+1])
    line_acc.set_data(mecanismo.theta_deg[:i+1], mecanismo.Ab[:i+1])
    line_fuerza.set_data(mecanismo.theta_deg[:i+1], mecanismo.F_inercia[:i+1] / 1000)
    line_hodo.set_data(mecanismo.xB[:i+1] * 1000, mecanismo.Vb[:i+1])
    line_biela.set_data(mecanismo.theta_deg[:i+1], mecanismo.F_biela[:i+1] / 1000)
    
    # Puntos: mostrar posición actual
    point_pos.set_data([mecanismo.theta_deg[i]], [mecanismo.xB[i] * 1000])
    point_vel.set_data([mecanismo.theta_deg[i]], [mecanismo.Vb[i]])
    point_acc.set_data([mecanismo.theta_deg[i]], [mecanismo.Ab[i]])
    point_fuerza.set_data([mecanismo.theta_deg[i]], [mecanismo.F_inercia[i] / 1000])
    point_hodo.set_data([mecanismo.xB[i] * 1000], [mecanismo.Vb[i]])
    point_biela.set_data([mecanismo.theta_deg[i]], [mecanismo.F_biela[i] / 1000])
    
    text_info.set_text(
        f'Angulo: {mecanismo.theta_deg[i]:.1f}°\n'
        f'Pos: {xB_current*1000:.2f} mm\n'
        f'Vel: {mecanismo.Vb[i]:.2f} m/s\n'
        f'Acc: {mecanismo.Ab[i]:.1f} m/s²\n'
        f'F Inercia: {mecanismo.F_inercia[i]/1000:.2f} kN\n'
        f'F Biela: {mecanismo.F_biela[i]/1000:.2f} kN'
    )
    return (crank, rod, piston, point_A, point_B,
            line_pos, line_vel, line_acc, line_fuerza, line_hodo, line_biela,
            point_pos, point_vel, point_acc, point_fuerza, point_hodo, point_biela,
            text_info)

def update_slider(val):
    """
    Función que se ejecuta cuando el usuario mueve el slider de velocidad angular.
    
    Esta función realiza las siguientes tareas:
    1. Obtiene la nueva velocidad angular del slider
    2. Recalcula toda la cinemática y dinámica con la nueva velocidad
    3. Actualiza todas las gráficas con los nuevos valores
    4. Ajusta las escalas de los ejes para mostrar todos los datos
    
    Parámetros:
    - val (float): Nuevo valor de velocidad angular del slider [rad/s]
    """
    w2_new = w2_slider.val
    mecanismo.calcular_cinematica(w2_new)

    # Actualizar datos de las líneas completas
    line_pos.set_data(mecanismo.theta_deg, mecanismo.xB * 1000)
    line_vel.set_data(mecanismo.theta_deg, mecanismo.Vb)
    line_acc.set_data(mecanismo.theta_deg, mecanismo.Ab)
    line_fuerza.set_data(mecanismo.theta_deg, mecanismo.F_inercia / 1000)
    line_hodo.set_data(mecanismo.xB * 1000, mecanismo.Vb)
    line_biela.set_data(mecanismo.theta_deg, mecanismo.F_biela / 1000)

    # Reajustar límites de los ejes Y
    ax_pos.set_ylim(mecanismo.xB.min()*1000 - 5, mecanismo.xB.max()*1000 + 5)
    ax_vel.set_ylim(mecanismo.Vb.min() - 1, mecanismo.Vb.max() + 1)
    ax_acc.set_ylim(mecanismo.Ab.min() - 100, mecanismo.Ab.max() + 100)
    ax_fuerza.set_ylim(mecanismo.F_inercia.min()/1000 - 1, mecanismo.F_inercia.max()/1000 + 1)
    ax_hodo.set_xlim(mecanismo.xB.min()*1000 - 5, mecanismo.xB.max()*1000 + 5)
    ax_hodo.set_ylim(mecanismo.Vb.min() - 1, mecanismo.Vb.max() + 1)
    ax_biela.set_ylim(mecanismo.F_biela.min()/1000 - 1, mecanismo.F_biela.max()/1000 + 1)

    fig.canvas.draw_idle()

# Conectar el slider a la función de actualización
w2_slider.on_changed(update_slider)

# Llamada inicial para dibujar las curvas
update_slider(w2_init)

# === 5. INICIAR ANIMACIÓN ===
print("\nIniciando simulador interactivo...")
print("  -> Mueva el slider para cambiar la velocidad angular.")

# Configuración de la animación para un movimiento más suave
anim = FuncAnimation(
    fig, animate, init_func=init, frames=mecanismo.n_frames,
    interval=100, blit=True, repeat=True
)

plt.show()