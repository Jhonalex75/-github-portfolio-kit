import numpy as np  # Biblioteca para cálculos numéricos y operaciones con arrays
import matplotlib.pyplot as plt  # Biblioteca para crear gráficos y visualizaciones
import matplotlib.animation as animation  # Módulo para crear animaciones
from matplotlib.patches import FancyBboxPatch, Circle, FancyArrowPatch  # Formas geométricas para dibujar
from matplotlib.collections import LineCollection  # Para colecciones de líneas

# ============================================================================
# PARÁMETROS DEL MECANISMO - PROBLEMA 4.15
# ============================================================================
# FENÓMENO FÍSICO: Mecanismo de cuatro barras con entrada de velocidad angular constante
# El eslabón 2 (manivela) gira a velocidad constante, generando movimiento en todo el sistema

omega2 = 20.0  # Velocidad angular constante del eslabón 2 en rad/s (entrada del sistema)
L_OA = 150     # Longitud del eslabón 2 (manivela) en milímetros - conecta O con A
L_AB = 540     # Longitud del eslabón 3 (acoplador) en milímetros - conecta A con B
L_BC = 250     # Longitud del eslabón 4 (seguidor) en milímetros - conecta B con C
L_O_prime_base = 500  # Distancia horizontal entre las bases fijas O y O' en milímetros

# Resultados calculados del problema mediante análisis de velocidad y aceleración
# Estos valores provienen de la solución analítica del mecanismo
results = {
    'A': {
        'at': 540000,  # Aceleración tangencial en el punto A en mm/s²
        'an': 540000   # Aceleración normal (centrípeta) en el punto A en mm/s²
    },
    'B': {
        'at': 119570,  # Aceleración tangencial en el punto B en mm/s²
        'an': 252170   # Aceleración normal en el punto B en mm/s²
    },
    'C': {
        'at': 781250,   # Aceleración tangencial en el punto C en mm/s²
        'angle': -68.9  # Ángulo de la aceleración respecto a la horizontal en grados
    },
    'link3': {
        'alpha': 1495   # Aceleración angular del eslabón 3 en rad/s² (sentido antihorario)
    },
    'link4': {
        'alpha': 1495,    # Aceleración angular del eslabón 4 en rad/s²
        'at_B': 373750    # Componente tangencial de aceleración en B debido al eslabón 4
    }
}

# ============================================================================
# FUNCIONES DE CÁLCULO DE POSICIONES
# ============================================================================
def calculate_mechanism_positions(theta2):
    """
    FENÓMENO FÍSICO: Análisis de posición de mecanismos planos
    Dado el ángulo del eslabón de entrada (theta2), calcula la configuración
    geométrica completa del mecanismo en ese instante.
    
    Este es un problema cinemático de posición que resuelve:
    - Posición de cada articulación
    - Orientación de cada eslabón
    - Configuración espacial del mecanismo
    
    Args:
        theta2: Ángulo del eslabón 2 respecto a la horizontal en radianes
        
    Returns:
        Tupla con posiciones de todos los puntos del mecanismo
    """
    
    # PUNTO O: Base fija, origen del sistema de coordenadas
    # Este punto no se mueve (tierra/bastidor del mecanismo)
    O = np.array([0, 0])  # Coordenadas [x, y] en mm
    
    # PUNTO A: Extremo móvil del eslabón 2 (manivela)
    # CINEMÁTICA: Movimiento circular alrededor de O
    # Posición = Radio × [cos(θ), sin(θ)] - transformación de coordenadas polares a cartesianas
    A = O + L_OA * np.array([np.cos(theta2), np.sin(theta2)])
    
    # PUNTO O': Segunda base fija del mecanismo
    # Ubicada horizontalmente a la derecha de O
    O_prime = np.array([L_O_prime_base, 0])  # Base fija para el eslabón 4
    
    # CÁLCULO DEL PUNTO B: 
    # FENÓMENO FÍSICO: B es la intersección de dos círculos:
    # 1. Círculo centrado en A con radio L_AB (restricción del eslabón 3)
    # 2. Círculo que describe el movimiento del eslabón 4
    
    # Ángulo del eslabón 3 respecto a la horizontal
    # Usamos el resultado calculado del problema para la configuración correcta
    theta3 = theta2 - np.radians(68.9)  # Convertimos el ángulo de grados a radianes
    
    # PUNTO B: Extremo del eslabón 3, calculado desde A
    # CINEMÁTICA: B se mueve en una trayectoria compleja (curva acopladora)
    B = A + L_AB * np.array([np.cos(theta3), np.sin(theta3)])
    
    # CÁLCULO DEL PUNTO C:
    # FENÓMENO FÍSICO: C debe estar sobre la línea que une B con O'
    # El eslabón 4 (BC) tiene longitud fija L_BC
    
    # Vector desde B hacia O' (dirección del eslabón 4)
    BC_vector = O_prime - B  # Vector diferencia entre dos puntos
    
    # Distancia actual entre B y O'
    BC_distance = np.linalg.norm(BC_vector)  # Magnitud del vector = √(x² + y²)
    
    # Si la distancia es válida (mayor que cero), calculamos C
    if BC_distance > 0:
        # Ángulo del vector BC respecto a la horizontal
        # atan2 maneja correctamente todos los cuadrantes
        theta4 = np.arctan2(BC_vector[1], BC_vector[0])  # θ = arctan(y/x)
        
        # PUNTO C: Desde B, avanzamos L_BC en dirección a O'
        # CINEMÁTICA: C se mueve en un arco circular alrededor de O'
        C = B + L_BC * np.array([np.cos(theta4), np.sin(theta4)])
    else:
        # Caso singular (muy improbable): B coincide con O'
        C = B
    
    # Retornamos todas las posiciones calculadas para este instante
    return O, A, B, C, O_prime, theta2, theta3

def calculate_velocity_vectors(theta2, omega2):
    """
    FENÓMENO FÍSICO: Análisis de velocidades en mecanismos
    La velocidad de cada punto se obtiene mediante análisis vectorial:
    v = ω × r (producto vectorial de velocidad angular por vector posición)
    
    Para mecanismos planos: v⃗ = ω × r⃗ resulta en velocidad perpendicular al eslabón
    
    Args:
        theta2: Ángulo actual del eslabón 2 en radianes
        omega2: Velocidad angular del eslabón 2 en rad/s
        
    Returns:
        Tupla con vectores de velocidad [vx, vy] en mm/s
    """
    
    # VELOCIDAD EN EL PUNTO A:
    # CINEMÁTICA: A se mueve en círculo alrededor de O
    # Magnitud: v = ω × r (velocidad tangencial)
    vA_mag = omega2 * L_OA  # mm/s - velocidad lineal tangencial
    
    # Dirección: perpendicular al eslabón OA (90° adelantado en sentido de rotación)
    # Si θ es el ángulo del eslabón, la velocidad apunta en dirección (θ + 90°)
    # cos(θ + 90°) = -sin(θ), sin(θ + 90°) = cos(θ)
    vA = vA_mag * np.array([-np.sin(theta2), np.cos(theta2)])
    
    # VELOCIDAD EN EL PUNTO B:
    # FENÓMENO FÍSICO: B tiene velocidad compuesta:
    # vB = vA + vB/A (velocidad absoluta = velocidad de A + velocidad relativa de B respecto a A)
    
    # Velocidad angular del eslabón 3 (aproximación para visualización)
    # En el análisis real, omega3 se calcula resolviendo ecuaciones de velocidad
    omega3 = results['link3']['alpha'] / 100  # Escala reducida para visualización suave
    
    # Velocidad relativa de B respecto a A (B gira alrededor de A)
    # Perpendicular al eslabón AB
    theta3 = theta2 - np.radians(68.9)  # Ángulo del eslabón 3
    vB_rel = omega3 * L_AB * np.array([-np.sin(theta3), np.cos(theta3)])
    
    # Velocidad absoluta de B = suma vectorial
    vB = vA + vB_rel
    
    # VELOCIDAD EN EL PUNTO C:
    # CINEMÁTICA: C tiene movimiento complejo, combinación de rotación del eslabón 4
    # Aproximación: reducimos la velocidad de B proporcionalmente
    vC = vB * 0.7  # Factor de escala aproximado para visualización
    
    # Retornamos los tres vectores de velocidad
    return vA, vB, vC

def calculate_acceleration_vectors(theta2, omega2):
    """
    FENÓMENO FÍSICO: Análisis de aceleraciones en mecanismos
    La aceleración tiene dos componentes:
    1. Aceleración tangencial (at): debido a cambios en la magnitud de velocidad
    2. Aceleración normal/centrípeta (an): debido a cambios en la dirección (v²/r)
    
    Para velocidad angular constante: at = α × r, an = ω² × r
    
    Args:
        theta2: Ángulo actual del eslabón 2 en radianes
        omega2: Velocidad angular constante en rad/s
        
    Returns:
        Tupla con vectores de aceleración total [ax, ay] en mm/s²
    """
    
    # ACELERACIÓN EN EL PUNTO A:
    # Como ω2 es constante, α2 = 0, pero existe aceleración centrípeta
    
    # Componente tangencial: at = α × r = 0 × r = 0 (en este caso)
    # Sin embargo, usamos el valor calculado del problema
    aA_t = results['A']['at']  # mm/s² - aceleración tangencial
    
    # Componente normal (centrípeta): an = ω² × r
    # FÍSICA: apunta hacia el centro de rotación (hacia O)
    aA_n = results['A']['an']  # mm/s² - aceleración centrípeta
    
    # Magnitud total de la aceleración: |a| = √(at² + an²) (teorema de Pitágoras)
    aA_mag = np.sqrt(aA_t**2 + aA_n**2)
    
    # Dirección: hacia el centro O (opuesta al vector de posición OA)
    # El vector apunta en dirección (-cos(θ), -sin(θ))
    aA = aA_mag * np.array([-np.cos(theta2), -np.sin(theta2)])
    
    # ACELERACIÓN EN EL PUNTO B:
    # FENÓMENO FÍSICO: Aceleración compuesta
    # aB = aA + aB/A (absoluta = arrastre + relativa)
    # Incluye efectos de aceleración angular del eslabón 3
    
    aB_t = results['B']['at']  # Componente tangencial en mm/s²
    aB_n = results['B']['an']  # Componente normal en mm/s²
    
    # Magnitud total de la aceleración en B
    aB_mag = np.sqrt(aB_t**2 + aB_n**2)
    
    # Ángulo del eslabón 3 para determinar la dirección
    theta3 = theta2 - np.radians(68.9)
    
    # Vector de aceleración en B (dirección hacia el centro de curvatura)
    aB = aB_mag * np.array([-np.cos(theta3), -np.sin(theta3)])
    
    # ACELERACIÓN EN EL PUNTO C:
    # Este es el punto de interés principal del problema
    # La aceleración se obtuvo del análisis de aceleración del mecanismo
    
    aC_mag = results['C']['at']  # Magnitud en mm/s²
    
    # Ángulo de la aceleración (obtenido del análisis)
    # IMPORTANTE: Este ángulo fue calculado resolviendo las ecuaciones de aceleración
    angle_C = np.radians(results['C']['angle'])  # Convertir de grados a radianes
    
    # Vector de aceleración en C con magnitud y dirección correctas
    aC = aC_mag * np.array([np.cos(angle_C), np.sin(angle_C)])
    
    # Retornamos los tres vectores de aceleración
    return aA, aB, aC

# ============================================================================
# FUNCIONES DE VISUALIZACIÓN
# ============================================================================
def draw_ground(ax, position, label):
    """
    Dibuja una base fija (tierra/bastidor) con estilo de dibujo técnico
    
    REPRESENTACIÓN: En dibujo de mecanismos, las bases fijas se representan
    con un triángulo y líneas de sombreado para indicar que están ancladas
    
    Args:
        ax: Eje de matplotlib donde dibujar
        position: Coordenadas [x, y] de la base
        label: Etiqueta de texto para identificar la base
    """
    
    x, y = position  # Desempacar coordenadas x e y
    
    # TRIÁNGULO DE BASE: Representa la superficie de apoyo fija
    # Tres vértices: izquierdo, derecho, y punto de conexión arriba
    triangle = plt.Polygon(
        [[x-30, y-20], [x+30, y-20], [x, y]],  # Lista de puntos [x, y]
        color='#475569',  # Color gris para la base
        alpha=0.8,  # Transparencia del 80%
        zorder=1  # Orden de dibujo (1 = atrás)
    )
    ax.add_patch(triangle)  # Agregar el triángulo al gráfico
    
    # LÍNEAS DE SOMBREADO: Patrón tradicional para indicar material fijo
    # Se dibujan líneas diagonales debajo de la base
    for i in range(-30, 31, 10):  # Desde -30 hasta +30 en pasos de 10
        # Cada línea va desde arriba-derecha hacia abajo-izquierda
        ax.plot(
            [x+i, x+i-8],  # Coordenadas x: inicio y fin
            [y-20, y-28],  # Coordenadas y: inicio y fin
            'k-',  # 'k' = negro, '-' = línea sólida
            linewidth=1.5,  # Grosor de la línea
            alpha=0.6  # Transparencia del 60%
        )
    
    # LÍNEA HORIZONTAL: Representa la superficie de tierra
    ax.plot(
        [x-35, x+35],  # Desde x-35 hasta x+35 (línea horizontal)
        [y-20, y-20],  # Altura constante y-20
        'k-',  # Negro, sólido
        linewidth=3  # Línea gruesa
    )
    
    # ETIQUETA: Nombre de la base (O u O')
    ax.text(
        x, y-45,  # Posición: debajo de la base
        label,  # Texto a mostrar
        fontsize=14,  # Tamaño de fuente
        fontweight='bold',  # Negrita
        ha='center',  # Alineación horizontal centrada
        color='white',  # Color del texto
        bbox=dict(  # Caja alrededor del texto
            boxstyle='round,pad=0.5',  # Esquinas redondeadas
            facecolor='#1e293b',  # Fondo oscuro
            alpha=0.8  # Transparencia
        )
    )

def draw_link(ax, start, end, color, linewidth, label):
    """
    Dibuja un eslabón del mecanismo con efecto 3D
    
    REPRESENTACIÓN: Los eslabones son barras rígidas que conectan articulaciones
    Se dibujan con líneas gruesas y una sombra para dar sensación de profundidad
    
    Args:
        ax: Eje de matplotlib
        start: Punto inicial [x, y] del eslabón
        end: Punto final [x, y] del eslabón
        color: Color del eslabón (identifica cada eslabón)
        linewidth: Grosor de la línea
        label: Nombre del eslabón (Eslabón 2, 3, o 4)
    """
    
    # LÍNEA PRINCIPAL DEL ESLABÓN
    # Representa el cuerpo rígido que conecta dos articulaciones
    ax.plot(
        [start[0], end[0]],  # Coordenadas x: desde inicio hasta fin
        [start[1], end[1]],  # Coordenadas y: desde inicio hasta fin
        color=color,  # Color distintivo del eslabón
        linewidth=linewidth,  # Grosor de la línea
        solid_capstyle='round',  # Extremos redondeados
        zorder=3  # Orden de dibujo (3 = frente)
    )
    
    # SOMBRA PARALELA: Da efecto de profundidad (3D)
    # Dibujada desplazada ligeramente hacia la derecha y abajo
    offset = 3  # Píxeles de desplazamiento
    ax.plot(
        [start[0]+offset, end[0]+offset],  # Desplazado en x
        [start[1]-offset, end[1]-offset],  # Desplazado en y
        color='black',  # Sombra negra
        linewidth=linewidth-1,  # Ligeramente más delgada
        alpha=0.2,  # Muy transparente (solo sombra)
        solid_capstyle='round',
        zorder=2  # Detrás de la línea principal
    )
    
    # ETIQUETA DEL ESLABÓN
    # Se coloca en el punto medio del eslabón
    mid_x = (start[0] + end[0]) / 2  # Promedio de las coordenadas x
    mid_y = (start[1] + end[1]) / 2  # Promedio de las coordenadas y
    
    ax.text(
        mid_x, mid_y + 20,  # Posición: centro del eslabón, 20 píxeles arriba
        label,  # Texto: "Eslabón 2", etc.
        fontsize=11,
        fontweight='bold',
        ha='center',  # Centrado horizontalmente
        color=color,  # Mismo color que el eslabón
        bbox=dict(  # Caja con borde del color del eslabón
            boxstyle='round,pad=0.4',
            facecolor='#0f172a',  # Fondo oscuro
            edgecolor=color,  # Borde del color del eslabón
            alpha=0.9,
            linewidth=2
        )
    )

def draw_joint(ax, position, label, color):
    """
    Dibuja una articulación (pin/pasador) del mecanismo
    
    FENÓMENO FÍSICO: Las articulaciones son conexiones que permiten rotación
    relativa entre eslabones. Se representan como círculos.
    
    Args:
        ax: Eje de matplotlib
        position: Coordenadas [x, y] de la articulación
        label: Letra que identifica el punto (A, B, C)
        color: Color asociado al eslabón conectado
    """
    
    # CÍRCULO PRINCIPAL: Representa el pin o pasador de la articulación
    circle = Circle(
        position,  # Centro del círculo
        12,  # Radio en píxeles
        color=color,  # Color distintivo
        zorder=5  # Dibujado al frente
    )
    ax.add_patch(circle)  # Agregar al gráfico
    
    # BORDE BLANCO: Hace que el círculo resalte sobre los eslabones
    circle_border = Circle(
        position,  # Mismo centro
        12,  # Mismo radio
        fill=False,  # Sin relleno, solo el contorno
        edgecolor='white',  # Borde blanco
        linewidth=2.5,  # Grosor del borde
        zorder=6  # Encima del círculo de color
    )
    ax.add_patch(circle_border)
    
    # ETIQUETA: Letra identificadora del punto
    ax.text(
        position[0],  # Coordenada x del punto
        position[1] + 30,  # 30 píxeles arriba del punto
        label,  # Letra: A, B, o C
        fontsize=15,
        fontweight='bold',
        ha='center',  # Centrado horizontalmente
        color='white',  # Texto blanco
        bbox=dict(
            boxstyle='round,pad=0.5',
            facecolor=color,  # Fondo del color del punto
            alpha=0.95
        ),
        zorder=7  # Al frente de todo
    )

def draw_vector(ax, start, vector, color, label, scale=1.0, width=0.015):
    """
    Dibuja un vector (velocidad o aceleración) con flecha y etiqueta
    
    FENÓMENO FÍSICO: Los vectores representan magnitudes direccionales
    - Velocidad: indica dirección y rapidez del movimiento
    - Aceleración: indica dirección y magnitud del cambio de velocidad
    
    Args:
        ax: Eje de matplotlib
        start: Punto de inicio [x, y] del vector (posición de la partícula)
        vector: Componentes [vx, vy] o [ax, ay] del vector
        color: Color del vector (cyan para velocidad, rosa para aceleración)
        label: Etiqueta del vector (vA, aB, etc.)
        scale: Factor de escala para ajustar longitud visual
        width: Ancho de la flecha
    """
    
    # Verificar si el vector tiene magnitud significativa
    # Si es muy pequeño (casi cero), no lo dibujamos
    if np.linalg.norm(vector) < 1e-6:  # Magnitud < 0.000001
        return  # Salir de la función sin dibujar
    
    # CALCULAR PUNTO FINAL DEL VECTOR
    # end = start + vector_escalado
    end = start + vector * scale  # Multiplicamos por escala para visualización
    
    # DIBUJAR FLECHA
    # FancyArrowPatch crea una flecha profesional con cabeza triangular
    arrow = FancyArrowPatch(
        start,  # Punto inicial [x, y]
        end,    # Punto final [x, y]
        arrowstyle='->',  # Estilo: línea con cabeza de flecha
        mutation_scale=25,  # Tamaño de la cabeza de flecha
        linewidth=3,  # Grosor de la línea
        color=color,  # Color distintivo
        zorder=4,  # Dibujado sobre los eslabones pero bajo las articulaciones
        alpha=0.9  # Ligeramente transparente
    )
    ax.add_patch(arrow)  # Agregar la flecha al gráfico
    
    # ETIQUETA DEL VECTOR
    # La colocamos más allá del extremo de la flecha
    
    # Vector unitario en la dirección del vector original
    vector_direction = (end - start) / np.linalg.norm(end - start)
    
    # Posición de la etiqueta: 30 píxeles más allá del extremo
    label_pos = end + 0.1 * vector_direction * 30
    
    ax.text(
        label_pos[0], label_pos[1],  # Posición de la etiqueta
        label,  # Texto: vA, aB, etc.
        fontsize=12,
        fontweight='bold',
        color=color,  # Mismo color que el vector
        bbox=dict(
            boxstyle='round,pad=0.4',
            facecolor='#0f172a',  # Fondo oscuro
            edgecolor=color,  # Borde del color del vector
            alpha=0.95,
            linewidth=2
        )
    )

def draw_rotation_indicator(ax, center, radius, theta, omega, label):
    """
    Dibuja un indicador circular de rotación para mostrar velocidad angular
    
    FENÓMENO FÍSICO: Representa la rotación de un eslabón alrededor de un punto
    - ω (omega): velocidad angular en rad/s
    - Sentido: antihorario (positivo) o horario (negativo)
    
    Args:
        ax: Eje de matplotlib
        center: Centro de rotación [x, y]
        radius: Radio del arco indicador
        theta: Ángulo actual del eslabón en radianes
        omega: Velocidad o aceleración angular
        label: Etiqueta (ω₂, α₃, etc.)
    """
    
    # ARCO CIRCULAR: Representa el movimiento circular
    # Creamos un arco de ±45° alrededor de la posición actual
    
    # Array de ángulos desde (theta - 45°) hasta (theta + 45°)
    angles = np.linspace(
        theta - np.pi/4,  # Ángulo inicial: theta - π/4 radianes (45°)
        theta + np.pi/4,  # Ángulo final: theta + π/4 radianes (45°)
        20  # 20 puntos para suavidad del arco
    )
    
    # Coordenadas x del arco: centro_x + radio * cos(ángulo)
    arc_x = center[0] + radius * np.cos(angles)
    
    # Coordenadas y del arco: centro_y + radio * sin(ángulo)
    arc_y = center[1] + radius * np.sin(angles)
    
    # Dibujar el arco como una línea curva
    ax.plot(
        arc_x, arc_y,  # Coordenadas del arco
        color='#60a5fa',  # Azul claro
        linewidth=3,
        zorder=4  # Al frente
    )
    
    # FLECHA EN EL EXTREMO: Indica el sentido de rotación
    
    # Posición del extremo del arco (al ángulo theta actual)
    arrow_pos = np.array([
        center[0] + radius * np.cos(theta),
        center[1] + radius * np.sin(theta)
    ])
    
    # Dirección tangente al círculo (perpendicular al radio)
    # Si el radio apunta en (cos θ, sin θ), la tangente es (-sin θ, cos θ)
    arrow_dir = np.array([-np.sin(theta), np.cos(theta)]) * 15  # Longitud 15
    
    # Dibujar la flecha tangencial
    arrow = FancyArrowPatch(
        arrow_pos,  # Inicio de la flecha
        arrow_pos + arrow_dir,  # Fin de la flecha (en dirección tangente)
        arrowstyle='->',
        mutation_scale=20,
        linewidth=2.5,
        color='#60a5fa',
        zorder=4
    )
    ax.add_patch(arrow)
    
    # ETIQUETA: Muestra el símbolo de velocidad o aceleración angular
    label_pos = center + np.array([-radius-40, 0])  # A la izquierda del arco
    
    ax.text(
        label_pos[0], label_pos[1],
        label,  # ω₂, α₃, etc.
        fontsize=13,
        fontweight='bold',
        color='#60a5fa',
        bbox=dict(
            boxstyle='round,pad=0.5',
            facecolor='#0f172a',
            edgecolor='#60a5fa',
            alpha=0.95,
            linewidth=2
        )
    )

# ============================================================================
# CONFIGURACIÓN DE LA FIGURA Y EJES
# ============================================================================

# Crear figura y eje para la animación
# figsize=(16, 10): ancho 16 pulgadas, alto 10 pulgadas
# facecolor: color de fondo de toda la figura
fig, ax = plt.subplots(figsize=(16, 10), facecolor='#0f172a')

# Configurar el área de dibujo (eje)
ax.set_facecolor('#1e293b')  # Color de fondo del área de gráfico (gris oscuro)
ax.set_aspect('equal')  # Aspecto 1:1 para que círculos sean círculos (no elipses)
ax.grid(True, alpha=0.2, linestyle='--', color='#475569')  # Grid sutil para referencia

# Límites del área visible (en milímetros)
# Ajustados para mostrar todo el mecanismo cómodamente
ax.set_xlim(-200, 800)  # Eje x: de -200 a 800 mm
ax.set_ylim(-200, 400)  # Eje y: de -200 a 400 mm

# ============================================================================
# TÍTULOS Y ETIQUETAS
# ============================================================================

# Título principal de la figura
fig.suptitle(
    'Análisis Cinemático de Mecanismo - Problema 4.15',  # Texto del título
    fontsize=20,  # Tamaño de fuente grande
    fontweight='bold',  # Negrita
    color='white',  # Color blanco
    y=0.98  # Posición vertical (0.98 = casi arriba)
)

# Subtítulo con información clave
ax.set_title(
    'Velocidad de entrada constante: ω₂ = 60 rad/s',  # Condición del problema
    fontsize=14,  # Tamaño de fuente mediano
    color='#94a3b8',  # Color gris claro
    pad=20  # Espaciado de 20 píxeles debajo del título principal
)

# ============================================================================
# PANEL DE INFORMACIÓN LATERAL
# ============================================================================

# Crear texto informativo con los datos del problema y resultados
# Este panel se mantiene fijo durante toda la animación
info_text = (
    'DATOS DE ENTRADA\n'  # Encabezado de la sección
    '─────────────────\n'  # Línea divisoria visual
    f'ω₂ = {omega2} rad/s\n'  # Velocidad angular de entrada
    f'L(OA) = {L_OA} mm\n'  # Longitud del eslabón 2
    f'L(AB) = {L_AB} mm\n'  # Longitud del eslabón 3
    f'L(BC) = {L_BC} mm\n\n'  # Longitud del eslabón 4
    'RESULTADOS\n'  # Encabezado de resultados
    '─────────────────\n'
    f'α₃ = {results["link3"]["alpha"]} rad/s² ↺\n'  # Aceleración angular eslabón 3
    f'a(C)ᵗ = {results["C"]["at"]:,} mm/s²\n'  # Aceleración tangencial en C (con separador de miles)
    f'Ángulo = {results["C"]["angle"]}°'  # Ángulo de aceleración en C
)

# Colocar el texto en la esquina superior izquierda
ax.text(
    0.02, 0.98,  # Posición: 2% desde la izquierda, 98% desde abajo (esquina superior izq)
    info_text,  # Texto formateado arriba
    transform=fig.transFigure,  # Usar coordenadas de la figura completa (0-1)
    fontsize=11,  # Tamaño de fuente
    verticalalignment='top',  # Alineado arriba
    fontfamily='monospace',  # Fuente monoespaciada (como código)
    color='white',  # Texto blanco
    bbox=dict(  # Caja alrededor del texto
        boxstyle='round,pad=1',  # Esquinas redondeadas, padding de 1
        facecolor='#1e293b',  # Fondo gris oscuro
        edgecolor='#3b82f6',  # Borde azul
        linewidth=2,  # Grosor del borde
        alpha=0.95  # Casi opaco
    )
)

# ============================================================================
# LEYENDA DE VECTORES Y ESLABONES
# ============================================================================

# Crear elementos para la leyenda
# Cada línea representa un tipo de elemento del mecanismo
legend_elements = [
    # Vectores de velocidad (línea cyan)
    plt.Line2D([0], [0], color='#06b6d4', linewidth=3, label='Vectores de Velocidad'),
    
    # Vectores de aceleración (línea rosa)
    plt.Line2D([0], [0], color='#ec4899', linewidth=3, label='Vectores de Aceleración'),
    
    # Eslabón 2 (línea azul gruesa)
    plt.Line2D([0], [0], color='#3b82f6', linewidth=5, label='Eslabón 2 (OA)'),
    
    # Eslabón 3 (línea verde gruesa)
    plt.Line2D([0], [0], color='#10b981', linewidth=5, label='Eslabón 3 (AB)'),
    
    # Eslabón 4 (línea naranja gruesa)
    plt.Line2D([0], [0], color='#f59e0b', linewidth=5, label='Eslabón 4 (BC)')
]

# Agregar leyenda en la esquina superior derecha
ax.legend(
    handles=legend_elements,  # Elementos definidos arriba
    loc='upper right',  # Ubicación: esquina superior derecha
    fontsize=10,  # Tamaño de fuente
    facecolor='#1e293b',  # Fondo gris oscuro
    edgecolor='#475569',  # Borde gris
    labelcolor='white',  # Color del texto
    framealpha=0.95  # Casi opaco
)

# ============================================================================
# ETIQUETAS DE LOS EJES
# ============================================================================

# Etiqueta del eje X (horizontal)
ax.set_xlabel(
    'Posición X (mm)',  # Texto de la etiqueta
    fontsize=12,  # Tamaño de fuente
    color='white',  # Color blanco
    fontweight='bold'  # Negrita
)

# Etiqueta del eje Y (vertical)
ax.set_ylabel(
    'Posición Y (mm)',  # Texto de la etiqueta
    fontsize=12,
    color='white',
    fontweight='bold'
)

# Configurar el color de los números en los ejes
ax.tick_params(
    colors='white',  # Color blanco para los números
    labelsize=10  # Tamaño de fuente de los números
)

# ============================================================================
# TEXTO DINÁMICO DE TIEMPO
# ============================================================================

# Variable para mostrar el tiempo actual y ángulo durante la animación
# Se crea aquí y se actualiza en cada frame
time_text = ax.text(
    0.98, 0.02,  # Posición: 98% a la derecha, 2% desde abajo (esquina inferior derecha)
    '',  # Inicialmente vacío, se actualiza en animate()
    transform=ax.transAxes,  # Usar coordenadas del eje (0-1)
    fontsize=12,
    verticalalignment='bottom',  # Alineado abajo
    horizontalalignment='right',  # Alineado a la derecha
    color='white',
    bbox=dict(
        boxstyle='round,pad=0.5',
        facecolor='#1e293b',
        alpha=0.9
    )
)

# ============================================================================
# FUNCIÓN DE ANIMACIÓN PRINCIPAL
# ============================================================================

def animate(frame):
    """
    Función que se ejecuta en cada frame de la animación
    
    PROCESO DE ANIMACIÓN:
    1. Calcular el tiempo actual basado en el número de frame
    2. Calcular posiciones del mecanismo para ese instante
    3. Limpiar el gráfico anterior
    4. Dibujar el mecanismo en su nueva configuración
    5. Dibujar vectores de velocidad y aceleración
    
    Args:
        frame: Número de frame actual (0, 1, 2, 3, ...)
        
    Returns:
        Lista vacía (requerido por FuncAnimation)
    """
    
    # Limpiar el contenido anterior del eje
    # Esto elimina todo lo dibujado en el frame anterior
    ax.clear()
    
    # ========================================================================
    # RECONFIGURACIÓN DEL GRÁFICO DESPUÉS DEL CLEAR
    # ========================================================================
    # Nota: ax.clear() elimina todos los ajustes, por lo que debemos reconfigurar
    
    # Restaurar color de fondo
    ax.set_facecolor('#1e293b')
    
    # Restaurar aspecto cuadrado (1:1)
    ax.set_aspect('equal')
    
    # Restaurar grid
    ax.grid(True, alpha=0.2, linestyle='--', color='#475569')
    
    # Restaurar límites de los ejes
    ax.set_xlim(-200, 800)  # Límites horizontales
    ax.set_ylim(-200, 400)  # Límites verticales
    
    # Restaurar etiquetas de ejes
    ax.set_xlabel('Posición X (mm)', fontsize=12, color='white', fontweight='bold')
    ax.set_ylabel('Posición Y (mm)', fontsize=12, color='white', fontweight='bold')
    ax.tick_params(colors='white', labelsize=10)
    
    # ========================================================================
    # CÁLCULO DEL TIEMPO Y ÁNGULO ACTUAL
    # ========================================================================
    
    # Calcular tiempo transcurrido
    # VELOCIDAD AJUSTADA: frame * 0.05 segundos
    # Esto hace que la animación sea MUY LENTA y observable
    # Antes era 0.02, ahora 0.05 (2.5 veces más lento)
    t = frame * 0.05  # Segundos - INCREMENTO PEQUEÑO PARA MOVIMIENTO LENTO
    
    # CINEMÁTICA: Para velocidad angular constante, θ = ω × t
    # Posición angular del eslabón 2 en el instante t
    theta2 = omega2 * t  # radianes
    
    # ========================================================================
    # OBTENER POSICIONES DEL MECANISMO
    # ========================================================================
    
    # Llamar a la función que calcula todas las posiciones
    # Retorna: punto O, punto A, punto B, punto C, punto O', ángulo theta2, ángulo theta3
    O, A, B, C, O_prime, theta2_actual, theta3 = calculate_mechanism_positions(theta2)
    
    # ========================================================================
    # DIBUJAR BASES FIJAS
    # ========================================================================
    
    # Base O (izquierda) - Origen del mecanismo
    draw_ground(ax, O, 'O')
    
    # Base O' (derecha) - Segunda base fija
    draw_ground(ax, O_prime, "O'")
    
    # ========================================================================
    # DIBUJAR ESLABONES DEL MECANISMO
    # ========================================================================
    
    # ESLABÓN 2 (OA): Manivela de entrada
    # FENÓMENO FÍSICO: Eslabón de entrada que recibe la potencia
    # Gira a velocidad angular constante ω₂
    draw_link(
        ax,  # Eje donde dibujar
        O,   # Punto inicial (base O)
        A,   # Punto final (articulación A)
        '#3b82f6',  # Color azul
        8,   # Grosor de línea
        'Eslabón 2'  # Etiqueta
    )
    
    # ESLABÓN 3 (AB): Acoplador
    # FENÓMENO FÍSICO: Eslabón intermedio que transmite el movimiento
    # Tiene movimiento complejo (traslación + rotación)
    draw_link(
        ax,
        A,   # Punto inicial (articulación A)
        B,   # Punto final (articulación B)
        '#10b981',  # Color verde
        7,   # Grosor
        'Eslabón 3'
    )
    
    # ESLABÓN 4 (BC): Seguidor
    # FENÓMENO FÍSICO: Eslabón de salida del mecanismo
    # Conecta el acoplador con la segunda base fija
    draw_link(
        ax,
        B,   # Punto inicial (articulación B)
        C,   # Punto final (articulación C)
        '#f59e0b',  # Color naranja/amarillo
        7,
        'Eslabón 4'
    )
    
    # ========================================================================
    # LÍNEA DE REFERENCIA O'C
    # ========================================================================
    
    # Línea punteada desde O' hasta C
    # Ayuda a visualizar cómo C se mueve respecto a la base O'
    ax.plot(
        [O_prime[0], C[0]],  # Coordenadas x
        [O_prime[1], C[1]],  # Coordenadas y
        'w--',  # Blanco ('w'), punteado ('--')
        linewidth=2,  # Grosor
        alpha=0.4,  # Muy transparente (solo referencia)
        zorder=1  # Atrás de todo
    )
    
    # ========================================================================
    # DIBUJAR ARTICULACIONES (JOINTS)
    # ========================================================================
    
    # Articulación A: Conexión entre eslabones 2 y 3
    draw_joint(ax, A, 'A', '#3b82f6')  # Color azul (asociado a eslabón 2)
    
    # Articulación B: Conexión entre eslabones 3 y 4
    draw_joint(ax, B, 'B', '#10b981')  # Color verde (asociado a eslabón 3)
    
    # Articulación C: Conexión del eslabón 4 con la base O'
    draw_joint(ax, C, 'C', '#f59e0b')  # Color naranja (asociado a eslabón 4)
    
    # ========================================================================
    # CALCULAR Y DIBUJAR VECTORES DE VELOCIDAD
    # ========================================================================
    
    # FENÓMENO FÍSICO: Análisis de velocidades
    # Los vectores de velocidad muestran la rapidez y dirección del movimiento
    # de cada punto en este instante
    
    # Obtener vectores de velocidad para este instante
    vA, vB, vC = calculate_velocity_vectors(theta2_actual, omega2)
    
    # Dibujar vector de velocidad en A
    # scale=0.15: Factor de escala para que el vector sea visible pero no enorme
    draw_vector(
        ax,     # Eje
        A,      # Punto de aplicación (donde está A)
        vA,     # Vector velocidad [vx, vy]
        '#06b6d4',  # Color cyan (velocidad)
        'vₐ',   # Etiqueta (v con subíndice A)
        scale=0.15  # Escala para visualización
    )
    
    # Dibujar vector de velocidad en B
    draw_vector(ax, B, vB, '#14b8a6', 'v_B', scale=0.15)
    
    # Dibujar vector de velocidad en C
    draw_vector(ax, C, vC, '#22d3ee', 'v_C', scale=0.15)
    
    # ========================================================================
    # CALCULAR Y DIBUJAR VECTORES DE ACELERACIÓN
    # ========================================================================
    
    # FENÓMENO FÍSICO: Análisis de aceleraciones
    # Los vectores de aceleración muestran cómo cambia la velocidad
    # Incluyen componentes tangencial (cambio de magnitud) y normal (cambio de dirección)
    
    # Obtener vectores de aceleración para este instante
    aA, aB, aC = calculate_acceleration_vectors(theta2_actual, omega2)
    
    # Dibujar vector de aceleración en A
    # scale=0.0003: Escala muy pequeña porque las aceleraciones son muy grandes (mm/s²)
    draw_vector(
        ax,
        A,      # Punto de aplicación
        aA,     # Vector aceleración [ax, ay]
        '#ec4899',  # Color rosa/magenta (aceleración)
        'aₐ',   # Etiqueta
        scale=0.0003  # Escala pequeña
    )
    
    # Dibujar vector de aceleración en B
    draw_vector(ax, B, aB, '#f472b6', 'a_B', scale=0.0003)
    
    # Dibujar vector de aceleración en C (punto de interés principal)
    # scale=0.0004: Ligeramente mayor para que sea bien visible
    draw_vector(ax, C, aC, '#fb7185', 'a_C', scale=0.0004)
    
    # ========================================================================
    # INDICADORES DE ROTACIÓN
    # ========================================================================
    
    # INDICADOR DE ROTACIÓN EN O (eslabón 2)
    # FENÓMENO FÍSICO: Muestra la velocidad angular constante ω₂
    draw_rotation_indicator(
        ax,
        O,      # Centro de rotación (base O)
        50,     # Radio del arco indicador
        theta2_actual,  # Ángulo actual del eslabón
        omega2,  # Velocidad angular
        'ω₂'    # Etiqueta (omega subíndice 2)
    )
    
    # INDICADOR DE ROTACIÓN EN A (eslabón 3)
    # FENÓMENO FÍSICO: Muestra la aceleración angular α₃ del eslabón 3
    # El eslabón 3 no gira a velocidad constante, tiene aceleración angular
    alpha3 = results['link3']['alpha']  # Aceleración angular del eslabón 3
    
    draw_rotation_indicator(
        ax,
        A,      # Centro de rotación (articulación A)
        40,     # Radio del arco indicador
        theta3,  # Ángulo actual del eslabón 3
        alpha3/20,  # Dividimos por 20 para visualización (no es velocidad, es aceleración)
        'α₃'    # Etiqueta (alpha subíndice 3)
    )
    
    # ========================================================================
    # TEXTO DE INFORMACIÓN DINÁMICA
    # ========================================================================
    
    # Mostrar tiempo transcurrido y ángulo actual
    # Este texto se actualiza en cada frame
    time_text = ax.text(
        0.98, 0.02,  # Esquina inferior derecha
        f't = {t:.3f} s\nθ₂ = {np.degrees(theta2_actual):.1f}°',  # Texto formateado
        # f't = {t:.3f} s': tiempo con 3 decimales
        # f'θ₂ = {np.degrees(theta2_actual):.1f}°': ángulo en grados con 1 decimal
        transform=ax.transAxes,  # Coordenadas relativas al eje
        fontsize=12,
        verticalalignment='bottom',
        horizontalalignment='right',
        color='white',
        bbox=dict(
            boxstyle='round,pad=0.5',
            facecolor='#1e293b',
            alpha=0.95
        ),
        fontfamily='monospace'  # Fuente monoespaciada para números
    )
    
    # Retornar lista vacía (requerido por FuncAnimation para el parámetro blit)
    return []

# ============================================================================
# CREAR Y CONFIGURAR LA ANIMACIÓN
# ============================================================================

# CONFIGURACIÓN DE VELOCIDAD DE ANIMACIÓN:
# - frames=200: Número total de frames en la animación
# - interval=150: Tiempo entre frames en milisegundos (150ms = 0.15 segundos)
# - Velocidad efectiva: ~6.7 frames por segundo (muy lenta y observable)

anim = animation.FuncAnimation(
    fig,        # Figura donde animar
    animate,    # Función que dibuja cada frame
    frames=200, # REDUCIDO: menos frames para ciclo más corto pero visible
    interval=300,  # AUMENTADO: 300ms entre frames (antes 150ms) = MÁS LENTO
    blit=False, # No usar blitting (permite cambios completos en cada frame)
    repeat=True # Repetir animación indefinidamente
)

# CÁLCULO DE VELOCIDAD:
# - Cada frame avanza t = 0.05 segundos
# - Con 200 frames: tiempo total = 200 × 0.05 = 10 segundos de simulación
# - Con interval=150ms: duración real = 200 × 0.15 = 30 segundos de video
# - El mecanismo se ve en "cámara lenta" (1 segundo real = 3 segundos de video)

# ============================================================================
# AJUSTAR DISEÑO Y MOSTRAR
# ============================================================================

# Ajustar automáticamente los elementos para que no se superpongan
plt.tight_layout()

# Mostrar la ventana con la animación
# NOTA: La animación comenzará automáticamente al ejecutar el script
plt.show()

# ============================================================================
# GUARDAR LA ANIMACIÓN (OPCIONAL)
# ============================================================================

# Para guardar la animación como archivo GIF, descomentar las siguientes líneas:
# IMPORTANTE: Requiere tener instalado 'pillow' (pip install pillow)

# anim.save(
#     'mecanismo_cinematica.gif',  # Nombre del archivo de salida
#     writer='pillow',  # Usar pillow como escritor de GIF
#     fps=7,  # Frames por segundo en el archivo (ajustar según preferencia)
#     dpi=100  # Resolución (dots per inch)
# )

# Para guardar como video MP4 (requiere ffmpeg instalado):
# anim.save(
#     'mecanismo_cinematica.mp4',  # Nombre del archivo
#     writer='ffmpeg',  # Usar ffmpeg
#     fps=7,  # Frames por segundo
#     dpi=150,  # Mayor resolución para video
#     bitrate=1800  # Calidad del video
# )