# ----------------------------------------------------------------------------
# Title:   Polar Graph Visualization - Enhanced Version (Explicado)
# Author:  Adaptado por Jhon Alexander Valencia M.
# License: BSD
# Description:
#   Gráfico polar avanzado con explicaciones línea por línea y escala radial
#   en degradado de colores desde azul (0) hasta rojo (1000)
# ----------------------------------------------------------------------------

import numpy as np  # Librería para operaciones matemáticas y arrays
import matplotlib.pyplot as plt  # Librería para crear gráficos
import matplotlib.patheffects as path_effects  # Efectos visuales para texto

# === CONFIGURACIÓN DE LA FIGURA ===
# Crea una figura (lienzo) de 6x6 pulgadas para el gráfico
fig = plt.figure(figsize=(6, 6))

# Crea un subplot (área de dibujo) con proyección polar
# projection="polar" convierte el gráfico a coordenadas polares (ángulo, radio)
# frameon=True mantiene el marco visible alrededor del gráfico
ax = plt.subplot(1, 1, 1, projection="polar", frameon=True)

# Establece el rango angular de 0 a 2π radianes (0° a 360°)
ax.set_thetalim(0, 2 * np.pi)

# Establece el rango radial de 0 a 1000 unidades
ax.set_rlim(0, 1000)

# Elimina las marcas angulares predeterminadas del eje theta (ángulos)
ax.set_xticks([])

# Elimina las etiquetas angulares predeterminadas
ax.set_xticklabels([])

# Define 10 posiciones para marcas radiales entre 100 y 1000
ax.set_yticks(np.linspace(100, 1000, 10))

# Oculta las etiquetas de las marcas radiales (las personalizaremos después)
ax.set_yticklabels([])

# Configura la transparencia (alpha=0.4), orden de dibujo (zorder=-10) y 
# grosor (linewidth=0.8) de las líneas de cuadrícula
ax.tick_params("both", grid_alpha=0.4, grid_zorder=-10, grid_linewidth=0.8)

# === ESTILO DE FONDO Y COLORACIÓN ===
# Color de fondo del área de gráfico (gris oscuro elegante)
ax.set_facecolor("#0b0c10")

# Color del marco exterior de la figura (gris medio)
fig.patch.set_facecolor("#1f2833")

# Configura las líneas de cuadrícula: color cyan, líneas discontinuas, 
# grosor 0.5, transparencia 0.2
ax.grid(color="#45a29e", linestyle="--", linewidth=0.5, alpha=0.2)

# === MARCADORES DE ÁNGULO (TICKS) ===
# Obtiene el radio máximo del gráfico (1000 en este caso)
radius = ax.get_rmax()

# Calcula la longitud base para los ticks (2.5% del radio)
length = 0.025 * radius

# --- Ticks finos (cada 1°) ---
# Bucle de 0 a 359 grados
for i in range(360):
    # Convierte grados a radianes
    angle = np.pi * i / 180
    # Dibuja una línea corta desde el borde hacia adentro
    plt.plot(
        [angle, angle],  # Mismo ángulo para ambos puntos (línea radial)
        [radius, radius - length],  # Desde el borde hasta length hacia adentro
        linewidth=0.4,  # Línea muy delgada
        color="#45a29e",  # Color cyan oscuro
        alpha=0.3,  # Muy transparente
        clip_on=False,  # Permite dibujar fuera del área del gráfico
    )

# --- Ticks medianos (cada 5°) ---
# Bucle cada 5 grados
for i in range(0, 360, 5):
    # Convierte a radianes
    angle = np.pi * i / 180
    # Dibuja línea más larga que los ticks finos
    plt.plot(
        [angle, angle],
        [radius, radius - 2 * length],  # Doble de longitud
        linewidth=0.6,  # Un poco más gruesa
        color="#66fcf1",  # Cyan brillante
        alpha=0.6,  # Más visible
        clip_on=False,
    )

# --- Ticks principales (cada 15°) ---
# Bucle cada 15 grados
for i in range(0, 360, 15):
    # Convierte a radianes
    angle = np.pi * i / 180
    
    # Dibuja línea radial completa desde el centro hasta el borde
    plt.plot([angle, angle], [radius, 100], linewidth=0.8, color="#c5c6c7", alpha=0.7)
    
    # Dibuja tick principal que sobresale hacia afuera
    plt.plot(
        [angle, angle],
        [radius + length, radius],  # Desde fuera hacia el borde
        zorder=500,  # zorder alto para dibujar encima de otros elementos
        linewidth=1.2,
        color="#66fcf1",
        clip_on=False,
    )
    
    # Añade etiqueta de texto con el ángulo en grados
    plt.text(
        angle,  # Posición angular
        radius + 4 * length,  # Posición radial (fuera del círculo)
        f"{i}°",  # Texto a mostrar
        zorder=500,  # Dibuja encima
        rotation=i - 90,  # Rota el texto para que sea legible
        rotation_mode="anchor",  # Modo de rotación alrededor del punto ancla
        va="top",  # Alineación vertical
        ha="center",  # Alineación horizontal
        size="small",  # Tamaño pequeño
        family="DejaVu Sans",  # Fuente
        color="yellow",  # Color amarillo para contraste
    )

# --- Líneas principales (ejes cardinales: 0°, 90°, 180°, 270°) ---
for i in range(0, 360, 90):
    # Convierte a radianes
    angle = np.pi * i / 180
    # Dibuja línea completa desde el centro hasta el borde
    plt.plot([angle, angle], [radius, 0], zorder=500, linewidth=1.5, color="#45a29e", alpha=0.9)


# === FUNCIONES DE CONVERSIÓN ===
# Función para convertir coordenadas polares (ángulo, radio) a cartesianas (x, y)
def polar_to_cartesian(theta, radius):
    # x = r * cos(θ)
    x = radius * np.cos(theta)
    # y = r * sen(θ)
    y = radius * np.sin(theta)
    # Retorna un array con [x, y]
    return np.array([x, y])


# Función para convertir coordenadas cartesianas (x, y) a polares (ángulo, radio)
def cartesian_to_polar(x, y):
    # Calcula el radio usando el teorema de Pitágoras
    radius = np.sqrt(x ** 2 + y ** 2)
    # Calcula el ángulo usando arcotangente de y/x
    theta = np.arctan2(y, x)
    # Retorna un array con [θ, r]
    return np.array([theta, radius])


# === TICKS RADIALES PEQUEÑOS (ESCALA CON DEGRADADO DE COLORES) ===
# Bucle cada 10 unidades de radio
for i in range(0, 1000, 10):
    # Calcula el color basado en la posición radial (degradado azul → rojo)
    # i/1000 va de 0 a 1, donde 0=azul y 1=rojo
    color_ratio = i / 1000
    # Componente rojo aumenta con la distancia
    r = color_ratio
    # Componente verde es bajo
    g = 0.2
    # Componente azul disminuye con la distancia
    b = 1 - color_ratio
    tick_color = (r, g, b)
    
    # Punto inicial del tick en coordenadas polares (ángulo=0, radio=i)
    P0 = 0, i
    
    # Convierte P0 a cartesianas, le suma un desplazamiento vertical,
    # y convierte de vuelta a polares para obtener el punto final del tick
    P1 = cartesian_to_polar(*(polar_to_cartesian(*P0) + [0, 0.75 * length]))
    
    # Dibuja el tick radial con el color del degradado
    plt.plot([P0[0], P1[0]], [P0[1], P1[1]], linewidth=0.6, color=tick_color, alpha=0.5)

# === TICKS RADIALES GRANDES CON ETIQUETAS ===
# Bucle cada 100 unidades (marcas principales de escala)
for i in range(100, 1000, 100):
    # Calcula color según posición radial
    color_ratio = i / 1000
    r = color_ratio
    g = 0.2
    b = 1 - color_ratio
    tick_color = (r, g, b)
    
    # Punto inicial en coordenadas polares
    P0 = 0, i
    
    # Calcula punto final del tick hacia afuera
    P1 = cartesian_to_polar(*(polar_to_cartesian(*P0) + [0, +1.0 * length]))
    
    # Dibuja el tick principal con color del degradado
    plt.plot([P0[0], P1[0]], [P0[1], P1[1]], zorder=500, linewidth=1.0, color=tick_color)

    # Calcula posición para la etiqueta de texto (hacia adentro)
    P1 = cartesian_to_polar(*(polar_to_cartesian(*P0) + [0, -1.0 * length]))
    
    # Añade texto con el valor numérico de la escala
    text = ax.text(
        P1[0],  # Posición angular
        P1[1],  # Posición radial
        f"{i}",  # Valor a mostrar
        zorder=500,
        va="top",  # Alineación vertical
        ha="center",  # Alineación horizontal
        size="x-small",  # Tamaño extra pequeño
        family="DejaVu Sans",
        color=tick_color,  # Color del degradado
        weight="bold",  # Texto en negrita
    )
    
    # Aplica efecto de borde oscuro al texto para mejor legibilidad
    text.set_path_effects(
        [path_effects.Stroke(linewidth=2, foreground="#0b0c10"), path_effects.Normal()]
    )

# === BANDAS CIRCULARES DECORATIVAS ===
# Crea 1000 puntos angulares distribuidos uniformemente de 0 a 2π
n = 1000
T = np.linspace(0, 2 * np.pi, n)

# Define colores alternos para las bandas (gris oscuro y muy oscuro)
band_colors = ["#1f2833", "#0b0c10"]

# Dibuja 5 bandas circulares concéntricas con colores alternos
for i, (r0, r1) in enumerate([(0,100), (200,300), (400,500), (600,700), (800,900)]):
    # fill_between rellena el área entre dos radios con un color
    ax.fill_between(T, r0, r1, color=band_colors[i % 2], zorder=-50, alpha=0.8)

# Dibuja un punto brillante en el centro del gráfico
plt.scatter([0], [0], 40, facecolor="#66fcf1", edgecolor="#0b0c10", zorder=1000)

# === GRÁFICA PRINCIPAL DE DATOS ===
# Fija la semilla aleatoria para reproducibilidad
np.random.seed(123)

# Número de puntos de datos
n = 145

# Crea ángulos distribuidos uniformemente, con patrón escalonado
# Los ángulos impares se copian de los pares para crear efecto zigzag
T = 2 * np.pi / n + np.linspace(0, 2 * np.pi, n)
T[1::2] = T[0:-1:2]  # Copia ángulos pares a posiciones impares

# Genera radios aleatorios entre 400 y 800
R = np.random.uniform(400, 800, n)

# Cierra el polígono haciendo que el último punto coincida con el primero
R[-1] = R[0]

# Crea el patrón escalonado en los radios
R[1:-1:2] = R[2::2]

# Dibuja el área sombreada del polígono (relleno semitransparente)
ax.fill(T, R, color="#45a29e", zorder=150, alpha=0.25)

# Dibuja el contorno principal blanco grueso
ax.plot(T, R, color="#ffffff", zorder=200, linewidth=3)

# Dibuja el contorno secundario cyan brillante más delgado encima
ax.plot(T, R, color="#66fcf1", zorder=250, linewidth=1.5)

# Ajusta automáticamente el diseño para evitar solapamientos
plt.tight_layout()

# Muestra el gráfico en pantalla
plt.show()