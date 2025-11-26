# ----------------------------------------------------------------------------
# Title:   Visualización 3D de Sonar Submarino con Animación
# Author:  Adaptado para visualización 3D por Copilot
# Description:
#   Simulación interactiva de sonar submarino 3D con:
#   - Barrido animado del sonar
#   - Controles interactivos para vista y parámetros
#   - Detección simulada de objetos en tiempo real
# ----------------------------------------------------------------------------

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.colors as colors
from matplotlib.animation import FuncAnimation
from matplotlib.widgets import Slider, Button, CheckButtons
import time

class SonarDisplay:
    def __init__(self):
        # Configuración inicial
        self.max_range = 1000  # rango máximo del sonar en metros
        self.n_objects = 5     # número inicial de objetos
        self.scan_speed = 2    # velocidad de barrido (rad/s)
        self.current_angle = 0 # ángulo actual del barrido
        self.objects_visible = True  # control de visibilidad de objetos
        
        # Crear figura y ejes 3D
        self.fig = plt.figure(figsize=(12, 8))
        self.ax = self.fig.add_subplot(111, projection='3d')
        
        # Configurar área de visualización
        self.setup_display()
        
        # Generar objetos iniciales
        self.generate_objects()
        
        # Configurar controles interactivos
        self.setup_controls()
        
        # Iniciar animación
        self.ani = FuncAnimation(self.fig, self.update, interval=50,
                               blit=False, save_count=50)

    def spherical_to_cartesian(self, r, theta, phi):
        """Convierte coordenadas esféricas a cartesianas."""
        x = r * np.cos(phi) * np.cos(theta)
        y = r * np.cos(phi) * np.sin(theta)
        z = r * np.sin(phi)
        return x, y, z

    def setup_display(self):
        """Configura el área de visualización 3D."""
        # Configurar límites y etiquetas
        self.ax.set_xlim([-self.max_range, self.max_range])
        self.ax.set_ylim([-self.max_range, self.max_range])
        self.ax.set_zlim([-self.max_range, self.max_range])
        self.ax.set_xlabel('X (m)')
        self.ax.set_ylabel('Y (m)')
        self.ax.set_zlabel('Z (m)')
        
        # Crear esferas de referencia
        phi = np.linspace(-np.pi/2, np.pi/2, 50)
        theta = np.linspace(0, 2*np.pi, 50)
        self.phi_grid, self.theta_grid = np.meshgrid(phi, theta)
        
        # Dibujar esferas de referencia
        for r in [200, 400, 600, 800, self.max_range]:
            x, y, z = self.spherical_to_cartesian(r, self.theta_grid, self.phi_grid)
            self.ax.plot_surface(x, y, z, alpha=0.1, color='gray')
        
        # Dibujar ejes principales
        for axis in [(self.max_range,0,0), (0,self.max_range,0), (0,0,self.max_range)]:
            x, y, z = axis
            self.ax.plot([0,x], [0,y], [0,z], 'r--', alpha=0.5)
            self.ax.plot([0,-x], [0,-y], [0,-z], 'r--', alpha=0.5)
        
        # Submarino en el origen
        self.ax.scatter([0], [0], [0], c='red', s=200, marker='^', label='Submarino')
        
        # Sector de barrido (inicialmente vacío)
        self.scan_line = None
        self.scan_surface = None

    def generate_objects(self):
        """Genera objetos aleatorios para detectar con diferentes tipos y tamaños."""
        # Generar posiciones aleatorias
        self.objects_r = np.random.uniform(100, self.max_range, self.n_objects)
        self.objects_theta = np.random.uniform(0, 2*np.pi, self.n_objects)
        self.objects_phi = np.random.uniform(-np.pi/3, np.pi/3, self.n_objects)
        
        # Generar tamaños y tipos aleatorios
        self.objects_size = np.random.uniform(50, 200, self.n_objects)
        object_types = ['o', 's', '^', 'D', 'v']  # Diferentes formas para distintos tipos de objetos
        self.objects_markers = np.random.choice(object_types, self.n_objects)
        
        # Convertir a coordenadas cartesianas
        self.objects_x, self.objects_y, self.objects_z = self.spherical_to_cartesian(
            self.objects_r, self.objects_theta, self.objects_phi)
        
        # Crear scatter plot de objetos con efectos visuales mejorados
        self.scatter = self.ax.scatter([], [], [], s=self.objects_size,
                                     c=[], cmap='plasma', alpha=0.8,
                                     marker='o', edgecolor='white', linewidth=1)
        
        # Colorbar con estilo mejorado
        self.colorbar = plt.colorbar(self.scatter, label='Distancia (m)',
                                   pad=0.1)
        self.colorbar.ax.yaxis.set_tick_params(color='white')
        self.colorbar.set_label('Distancia (m)', color='white')
        plt.setp(plt.getp(self.colorbar.ax, 'yticklabels'), color='white')

    def setup_controls(self):
        """Configura los controles interactivos con estilo mejorado."""
        # Ajustar layout para dejar espacio a los controles
        plt.subplots_adjust(left=0.1, bottom=0.25)
        
        # Estilo común para los controles
        control_color = '#2C2C2C'
        text_color = 'white'
        
        # Slider para velocidad de barrido
        ax_speed = plt.axes([0.2, 0.1, 0.3, 0.03], facecolor=control_color)
        self.speed_slider = Slider(ax_speed, 'Velocidad de Barrido', 0.5, 5.0,
                                 valinit=self.scan_speed, color='#00A6D6',
                                 label_color=text_color)
        self.speed_slider.on_changed(self.update_speed)
        
        # Botón para reiniciar objetos
        ax_reset = plt.axes([0.8, 0.1, 0.1, 0.04])
        self.reset_button = Button(ax_reset, 'Reiniciar', color=control_color,
                                 hovercolor='#404040')
        self.reset_button.label.set_color(text_color)
        self.reset_button.on_clicked(self.reset_objects)
        
        # Slider para número de objetos
        ax_objects = plt.axes([0.2, 0.15, 0.3, 0.03], facecolor=control_color)
        self.objects_slider = Slider(ax_objects, 'Número de Objetos', 1, 20,
                                   valinit=self.n_objects, valstep=1,
                                   color='#00A6D6', label_color=text_color)
        self.objects_slider.on_changed(self.update_n_objects)
        
        # Checkbox para mostrar/ocultar objetos
        ax_check = plt.axes([0.1, 0.1, 0.1, 0.04])
        self.check = CheckButtons(ax_check, ['Objetos'], [True])
        self.check.on_clicked(self.toggle_objects)

    def update_speed(self, val):
        """Actualiza la velocidad de barrido."""
        self.scan_speed = val

    def reset_objects(self, event):
        """Regenera los objetos aleatorios."""
        self.generate_objects()

    def toggle_objects(self, label):
        """Muestra/oculta los objetos detectados."""
        self.objects_visible = not self.objects_visible

    def update_scan(self):
        """Actualiza la posición del barrido del sonar."""
        # Actualizar ángulo de barrido
        self.current_angle += self.scan_speed * 0.05  # 0.05s * velocidad
        if self.current_angle >= 2*np.pi:
            self.current_angle = 0
            
        # Actualizar línea de barrido
        r = np.linspace(0, self.max_range, 20)
        theta = np.full_like(r, self.current_angle)
        phi = np.zeros_like(r)
        x, y, z = self.spherical_to_cartesian(r, theta, phi)
        
        if self.scan_line:
            self.scan_line.remove()
        self.scan_line = self.ax.plot(x, y, z, 'g-', alpha=0.8, linewidth=2)[0]
        
        # Actualizar superficie de barrido
        phi_scan = np.linspace(-np.pi/3, np.pi/3, 20)
        r_scan, phi_scan = np.meshgrid(r, phi_scan)
        theta_scan = np.full_like(r_scan, self.current_angle)
        x, y, z = self.spherical_to_cartesian(r_scan, theta_scan, phi_scan)
        
        if self.scan_surface:
            self.scan_surface.remove()
        self.scan_surface = self.ax.plot_surface(x, y, z, alpha=0.2, 
                                               color='g', shade=False)

    def update_n_objects(self, val):
        """Actualiza el número de objetos en la simulación."""
        self.n_objects = int(val)
        self.generate_objects()

    def update_objects(self):
        """Actualiza la visualización de objetos detectados con efectos mejorados."""
        if self.objects_visible:
            # Determinar qué objetos son visibles (están en el sector de barrido)
            angle_diff = np.abs(self.objects_theta - self.current_angle)
            angle_diff = np.minimum(angle_diff, 2*np.pi - angle_diff)
            visible = angle_diff < 0.5  # objetos en un sector de ±0.5 rad
            
            # Calcular intensidad basada en la distancia al centro del sector
            intensity = 1 - (angle_diff[visible] / 0.5)
            
            # Actualizar scatter plot con efectos visuales
            self.scatter._offsets3d = (
                self.objects_x[visible],
                self.objects_y[visible],
                self.objects_z[visible])
            
            # Actualizar colores y tamaños basados en la distancia y la intensidad
            distances = self.objects_r[visible]
            sizes = self.objects_size[visible] * (0.5 + 0.5 * intensity)
            
            self.scatter.set_sizes(sizes)
            self.scatter.set_array(distances)  # Actualizar colormap basado en distancia
            )
            self.scatter.set_array(self.objects_r[visible])
        else:
            self.scatter._offsets3d = ([], [], [])

    def update(self, frame):
        """Función principal de actualización para la animación."""
        self.update_scan()
        self.update_objects()
        
        # Rotar vista lentamente
        self.ax.view_init(elev=20, azim=frame/2)
        
        # Retornar objetos actualizados
        return self.scatter, self.scan_line, self.scan_surface

# Crear y mostrar la visualización
if __name__ == '__main__':
    sonar = SonarDisplay()
    plt.show()