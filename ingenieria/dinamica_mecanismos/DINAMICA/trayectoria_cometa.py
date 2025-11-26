"""
Simulación de Trayectoria del Cometa 3I/ATLAS y la Órbita Terrestre
-----------------------------------------------------------------

Este script visualiza la trayectoria hiperbólica del cometa 3I/ATLAS en relación
con la órbita terrestre alrededor del Sol, usando una proyección simplificada 2D.

Las órbitas hiperbólicas son características de objetos que pasan por el sistema solar
pero tienen suficiente energía para escapar de la gravedad solar.
"""

import matplotlib.pyplot as plt
import numpy as np

# Definición de constantes astronómicas
AU = 1.496e8  # Unidad Astronómica en kilómetros (distancia media Sol-Tierra)

# Simulación de la órbita terrestre
# ---------------------------------
# Aproximamos la órbita de la Tierra como circular (en realidad es ligeramente elíptica)
theta = np.linspace(0, 2*np.pi, 500)  # Ángulo polar completo (360°) con 500 puntos
earth_x = np.cos(theta) * AU          # Coordenada X de la Tierra
earth_y = np.sin(theta) * AU          # Coordenada Y de la Tierra

# Parámetros orbitales del cometa 3I/ATLAS
# ---------------------------------------
# La órbita hiperbólica se define por dos parámetros principales:
a = -0.6 * AU   # Semieje mayor (negativo para hipérbola) - define la "apertura"
e = 2.4         # Excentricidad > 1 indica trayectoria hiperbólica
r_min = a * (e - 1)  # Distancia de máximo acercamiento al Sol (perihelio)

# Cálculo de la trayectoria hiperbólica
# ------------------------------------
# La anomalía verdadera (nu) es el ángulo desde el perihelio
nu = np.linspace(-2, 2, 500)  # Rango limitado para visualización
# Ecuación de la órbita hiperbólica en coordenadas polares
r = a * (e**2 - 1) / (1 + e * np.cos(nu))
# Convertimos a coordenadas cartesianas y rotamos 45° para mejor visualización
atlas_x = r * np.cos(nu + np.pi/4)  
atlas_y = r * np.sin(nu + np.pi/4)  

# Visualización de las órbitas
# --------------------------
plt.figure(figsize=(8, 8))  # Crea figura cuadrada de 8x8 pulgadas

# Dibujamos la órbita terrestre (dividida por AU para mostrar en unidades astronómicas)
plt.plot(earth_x/AU, earth_y/AU, label="Órbita Terrestre (1 UA)", linewidth=2)

# Dibujamos la trayectoria del cometa
plt.plot(atlas_x/AU, atlas_y/AU, '--', 
         label="Trayectoria Hiperbólica 3I/ATLAS", linewidth=2)

# Añadimos el Sol en el centro
plt.scatter(0, 0, color='orange', s=200, label="Sol")

# Configuración de la visualización
plt.xlim(-3, 3)  # Límites del eje X en UA
plt.ylim(-3, 3)  # Límites del eje Y en UA
plt.gca().set_aspect('equal', adjustable='box')  # Mantiene escala 1:1
plt.title("Geometría Orbital: Tierra vs Cometa 3I/ATLAS", fontsize=12)
plt.xlabel("X (Unidades Astronómicas)")
plt.ylabel("Y (Unidades Astronómicas)")
plt.legend()  # Muestra leyenda con etiquetas
plt.grid(True)  # Añade cuadrícula para mejor referencia
plt.show()  # Muestra la figura
