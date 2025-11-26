# ----------------------------------------------------------------------------
# Título: Visualización Científica - Python & Matplotlib
# Autor:   Nicolas P. Rougier
# Licencia: BSD
# ----------------------------------------------------------------------------
import numpy as np  # Importa la biblioteca NumPy para operaciones numéricas, especialmente con arrays.
import matplotlib.pyplot as plt  # Importa Pyplot de Matplotlib para crear visualizaciones y gráficos.
import matplotlib.patheffects as path_effects  # Importa path_effects para añadir efectos a los elementos de texto y líneas del gráfico.

# --- Configuración inicial del gráfico ---
fig = plt.figure(figsize=(6, 6))  # Crea una nueva figura (la ventana del gráfico) con un tamaño de 6x6 pulgadas.
ax = plt.subplot(1, 1, 1, projection="polar", frameon=True)  # Añade un subplot a la figura. Será una única gráfica (1,1,1) con proyección polar. `frameon=True` dibuja el marco circular exterior.
ax.set_thetalim(0, 2 * np.pi)  # Establece el límite del eje angular (theta) de 0 a 2*pi radianes (0 a 360 grados).
ax.set_rlim(0, 1000)  # Establece el límite del eje radial (radio) de 0 a 1000.
ax.set_xticks([])  # Elimina las marcas (ticks) del eje angular (theta).
ax.set_xticklabels([])  # Elimina las etiquetas de las marcas del eje angular.
ax.set_yticks(np.linspace(100, 1000, 10))  # Establece 10 marcas en el eje radial, espaciadas uniformemente desde 100 hasta 1000.
ax.set_yticklabels([])  # Elimina las etiquetas de las marcas del eje radial.
ax.tick_params("both", grid_alpha=0.50, grid_zorder=-10, grid_linewidth=0.5)  # Personaliza la apariencia de la rejilla (grid). `grid_alpha` define la transparencia, `grid_zorder` la pone detrás de los datos, y `grid_linewidth` el grosor.

# --- Dibujo de las marcas angulares (Theta ticks) ---
radius = ax.get_rmax()  # Obtiene el valor máximo del radio del eje.
length = 0.025 * radius  # Calcula una longitud para las marcas, proporcional al radio máximo.

# Dibuja marcas pequeñas para cada grado.
for i in range(360):  # Itera de 0 a 359.
    angle = np.pi * i / 180  # Convierte el ángulo de grados a radianes.
    plt.plot(  # Dibuja una línea para la marca.
        [angle, angle],  # La coordenada angular es la misma (línea radial).
        [radius, radius - length],  # La línea va desde el borde exterior hacia adentro.
        linewidth=0.50,  # Grosor de la línea.
        color="0.75",  # Color gris claro.
        clip_on=False,  # Permite que el dibujo se extienda fuera del área del eje.
    )

# Dibuja marcas medianas cada 5 grados.
for i in range(0, 360, 5):  # Itera de 0 a 359, en pasos de 5.
    angle = np.pi * i / 180  # Convierte a radianes.
    plt.plot(
        [angle, angle],
        [radius, radius - 2 * length],  # La marca es el doble de larga que la de 1 grado.
        linewidth=0.75,  # Un poco más gruesa.
        color="0.75",
        clip_on=False,
    )

# Dibuja marcas largas y etiquetas cada 15 grados.
for i in range(0, 360, 15):  # Itera de 0 a 359, en pasos de 15.
    angle = np.pi * i / 180  # Convierte a radianes.
    plt.plot([angle, angle], [radius, 100], linewidth=0.5, color="0.75")  # Dibuja una línea de rejilla gris desde el borde hasta el radio 100.
    plt.plot(  # Dibuja la marca principal en el borde.
        [angle, angle],
        [radius + length, radius],  # La marca se extiende un poco hacia afuera del borde.
        zorder=500,  # `zorder` alto para que se dibuje por encima de otros elementos.
        linewidth=1.0,  # Más gruesa.
        color="0.00",  # Color negro.
        clip_on=False,
    )
    plt.text(  # Añade el texto de la etiqueta del ángulo.
        angle,  # Posición angular.
        radius + 4 * length,  # Posición radial, más allá de la marca.
        "%d°" % i,  # El texto a mostrar (ej. "15°").
        zorder=500,  # `zorder` alto.
        rotation=i - 90,  # Rota el texto para que sea perpendicular al radio.
        rotation_mode="anchor",  # La rotación se aplica alrededor del punto de anclaje del texto.
        va="top",  # Alineación vertical superior.
        ha="center",  # Alineación horizontal centrada.
        size="small",  # Tamaño de fuente pequeño.
        family="Roboto",  # Tipo de fuente.
        color="black",  # Color del texto.
    )

# Dibuja las líneas de los ejes principales (0, 90, 180, 270 grados).
for i in range(0, 360, 90):  # Itera sobre 0, 90, 180, 270.
    angle = np.pi * i / 180  # Convierte a radianes.
    plt.plot([angle, angle], [radius, 0], zorder=500, linewidth=1.00, color="0.0")  # Dibuja una línea negra desde el borde hasta el centro.


# --- Funciones de conversión de coordenadas y dibujo de marcas radiales ---

# Convierte coordenadas polares (ángulo, radio) a cartesianas (x, y).
def polar_to_cartesian(theta, radius):
    x = radius * np.cos(theta)  # Calcula la coordenada x.
    y = radius * np.sin(theta)  # Calcula la coordenada y.
    return np.array([x, y])  # Devuelve un array de NumPy con [x, y].

# Convierte coordenadas cartesianas (x, y) a polares (ángulo, radio).
def cartesian_to_polar(x, y):
    radius = np.sqrt(x**2 + y**2)  # Calcula el radio (distancia al origen).
    theta = np.arctan2(y, x)  # Calcula el ángulo (arcotangente que maneja los cuatro cuadrantes).
    return np.array([theta, radius])  # Devuelve un array de NumPy con [ángulo, radio].

# Dibuja marcas pequeñas en el eje de 0 grados para indicar la escala radial.
for i in range(0, 1000, 10):  # Itera de 0 a 999, en pasos de 10.
    P0 = 0, i  # Define un punto en coordenadas polares (ángulo=0, radio=i).
    # Convierte P0 a cartesiano, le suma un pequeño desplazamiento vertical, y lo vuelve a convertir a polar.
    P1 = cartesian_to_polar(*(polar_to_cartesian(*P0) + [0, 0.75 * length]))
    plt.plot([P0[0], P1[0]], [P0[1], P1[1]], linewidth=0.50, color="0.75")  # Dibuja una pequeña línea entre el punto original y el desplazado.

# Dibuja marcas y etiquetas más grandes cada 100 unidades de radio.
for i in range(100, 1000, 100):  # Itera de 100 a 999, en pasos de 100.
    P0 = 0, i  # Punto polar en el eje de 0 grados.
    # Calcula un punto desplazado hacia "arriba" (en el plano cartesiano).
    P1 = cartesian_to_polar(*(polar_to_cartesian(*P0) + [0, +1.0 * length]))
    plt.plot([P0[0], P1[0]], [P0[1], P1[1]], zorder=500, linewidth=0.75, color="0.0")  # Dibuja la marca negra.
    # Calcula un punto desplazado hacia "abajo" para la posición del texto.
    P1 = cartesian_to_polar(*(polar_to_cartesian(*P0) + [0, -1.0 * length]))
    text = ax.text(  # Añade la etiqueta del radio.
        P1[0],  # Posición angular del texto.
        P1[1],  # Posición radial del texto.
        "%d" % i,  # El texto a mostrar (ej. "100").
        zorder=500,
        va="top",
        ha="center",
        size="x-small",  # Tamaño de fuente extra pequeño.
        family="Roboto",
        color="black",
    )
    # Añade un efecto al texto: un borde blanco para que sea legible sobre cualquier fondo.
    text.set_path_effects(
        [path_effects.Stroke(linewidth=2, foreground="white"), path_effects.Normal()]
    )

# --- Dibujo de las bandas circulares de fondo ---
n = 1000  # Número de puntos para definir el círculo.
T = np.linspace(0, 2 * np.pi, n)  # Crea un array de `n` ángulos desde 0 a 2*pi.
color = "0.95"  # Color gris muy claro para las bandas.
ax.fill_between(T, 0, 100, color=color, zorder=-50)  # Rellena el área entre radio 0 y 100. `zorder` bajo para ponerlo al fondo.
ax.fill_between(T, 200, 300, color=color, zorder=-50)  # Rellena el área entre radio 200 y 300.
ax.fill_between(T, 400, 500, color=color, zorder=-50)  # Rellena el área entre radio 400 y 500.
ax.fill_between(T, 600, 700, color=color, zorder=-50)  # Rellena el área entre radio 600 y 700.
ax.fill_between(T, 800, 900, color=color, zorder=-50)  # Rellena el área entre radio 800 y 900.
plt.scatter([0], [0], 20, facecolor="white", edgecolor="black", zorder=1000)  # Dibuja un punto en el centro (origen) del gráfico.

# --- Generación y dibujo de los datos principales del gráfico ---
np.random.seed(123)  # Fija la semilla del generador de números aleatorios para que el resultado sea reproducible.
n = 145  # Número de puntos de datos a generar.
T = 2 * np.pi / n + np.linspace(0, 2 * np.pi, n)  # Crea un array de `n` ángulos.
T[1::2] = T[0:-1:2]  # Modifica los ángulos para crear un efecto de "histograma" o escalonado.
R = np.random.uniform(400, 800, n)  # Genera `n` valores de radio aleatorios entre 400 y 800.
R[-1] = R[0]  # Asegura que el gráfico se cierre, haciendo que el último punto sea igual al primero.
R[1:-1:2] = R[2::2]  # Modifica los radios para que coincidan con el efecto escalonado de los ángulos.
ax.fill(T, R, color="C1", zorder=150, alpha=0.1)  # Rellena el área bajo la línea de datos con un color semitransparente.
ax.plot(T, R, color="white", zorder=200, linewidth=3.5)  # Dibuja una línea blanca gruesa (como un borde).
ax.plot(T, R, color="C1", zorder=250, linewidth=1.5)  # Dibuja la línea de datos principal sobre la línea blanca.

# --- Finalización y visualización ---
plt.tight_layout()  # Ajusta automáticamente los parámetros del subplot para que el gráfico se vea bien.
# plt.savefig("../../figures/scales-projections/projection-polar-histogram.pdf")  # Línea comentada para guardar la figura en un archivo PDF.
plt.show()  # Muestra la figura en una ventana.
