# ----------------------------------------------------------------------------
# Title:   Simulador de Sistemas Dinámicos (Estilo Simscape)
# Author:  Copilot
# Description:
#   Este script implementa un simulador de sistemas dinámicos similar a Simscape,
#   permitiendo la entrada de parámetros, simulación y visualización de resultados
#   para sistemas mecánicos, eléctricos o hidráulicos.
# ----------------------------------------------------------------------------

import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint
from dataclasses import dataclass
from typing import List, Tuple, Callable, Dict
import tkinter as tk
from tkinter import ttk
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

# Configuración del estilo de matplotlib
plt.style.use('seaborn-v0_8-darkgrid')
plt.rcParams.update({
    'font.family': 'DejaVu Sans',
    'font.size': 10,
    'figure.figsize': [10, 6],
    'figure.dpi': 100,
    'lines.linewidth': 2
})

@dataclass
class SimulationParameters:
    """Clase para almacenar parámetros de simulación"""
    t_start: float = 0.0      # Tiempo inicial
    t_end: float = 10.0       # Tiempo final
    dt: float = 0.01         # Paso de tiempo
    method: str = 'RK45'     # Método de integración

@dataclass
class SystemParameters:
    """Clase para almacenar parámetros del sistema"""
    name: str                # Nombre del sistema
    params: Dict[str, float] # Diccionario de parámetros
    states: List[str]        # Lista de variables de estado
    inputs: List[str]        # Lista de entradas
    outputs: List[str]       # Lista de salidas
    
@dataclass
class GearMechanismParams:
    """Parámetros específicos para sistema de engranajes"""
    J1: float = 0.1         # Momento de inercia engranaje entrada
    J2: float = 0.2         # Momento de inercia engranaje salida
    N1: float = 20          # Número de dientes engranaje entrada
    N2: float = 40          # Número de dientes engranaje salida
    b: float = 0.5          # Coeficiente de amortiguamiento
    tau_in: float = 10.0    # Torque de entrada
    gear_ratio: float = 2.0 # Relación de transmisión

class SystemSimulator:
    """Clase principal del simulador"""
    def __init__(self, system_params: SystemParameters, sim_params: SimulationParameters):
        self.system = system_params
        self.sim = sim_params
        self.time = np.arange(sim_params.t_start, sim_params.t_end, sim_params.dt)
        self.results = {}
        self.fig = None
        self.ax = None
        
    def set_state_equation(self, state_eq: Callable):
        """Define la ecuación de estado del sistema"""
        self.state_equation = state_eq
        
    def simulate(self, initial_conditions: List[float], input_function: Callable = None):
        """Ejecuta la simulación del sistema"""
        if input_function is None:
            input_function = lambda t: 0
            
        def system_wrapper(y, t):
            return self.state_equation(y, t, self.system.params, input_function(t))
        
        # Validar condiciones iniciales
        if len(initial_conditions) != len(self.system.states):
            raise ValueError(f"El número de condiciones iniciales ({len(initial_conditions)}) " +
                           f"debe coincidir con el número de estados ({len(self.system.states)})")
        
        # Ejecutar simulación
        solution = odeint(system_wrapper, initial_conditions, self.time)
        
        # Almacenar resultados
        for i, state in enumerate(self.system.states):
            self.results[state] = solution[:, i]
            
        return self.results
    
    def plot_results(self, variables: List[str] = None, style: str = 'simscape'):
        """Visualiza los resultados de la simulación estilo Simscape"""
        if variables is None:
            variables = list(self.results.keys())
            
        if style == 'simscape':
            # Crear figura con estilo Simscape
            plt.style.use('seaborn-v0_8')
            self.fig, self.ax = plt.subplots(1, 1, figsize=(10, 6))
            self.fig.patch.set_facecolor('white')
            
            # Configurar estilo del gráfico
            self.ax.set_facecolor('white')
            self.ax.grid(True, linestyle='-', alpha=0.15, color='gray')
            
            # Graficar cada variable
            for var in variables:
                color = '#1f77b4' if 'Input' in var else '#d62728'
                label = 'Input_Gear.w' if 'Input' in var else 'Output_Gear.w'
                
                self.ax.plot(self.time, self.results[var], 
                          color=color,
                          linewidth=1.5,
                          label=label)
            
            # Configurar ejes y leyendas
            self.ax.set_xlabel('Time (s)', fontsize=10)
            self.ax.set_ylabel('Angular Velocity (rad/s)', fontsize=10)
            self.ax.legend(loc='upper right', frameon=True)
            
            # Ajustar límites
            self.ax.set_xlim([0, max(self.time)])
            y_max = max([max(self.results[var]) for var in variables])
            self.ax.set_ylim([0, y_max*1.1])
            
            # Estilo Simscape
            self.ax.spines['top'].set_visible(False)
            self.ax.spines['right'].set_visible(False)
            self.ax.tick_params(direction='out')
            
            if len(variables) == 1:
                self.ax = [self.ax]
                
            for i, var in enumerate(variables):
                # Configurar subplot estilo Simscape
                self.ax[i].set_facecolor('white')
                self.ax[i].grid(True, linestyle='-', alpha=0.15, color='gray')
                
                # Configurar límites y formato
                self.ax[i].spines['top'].set_visible(False)
                self.ax[i].spines['right'].set_visible(False)
                self.ax[i].spines['left'].set_color('#666666')
                self.ax[i].spines['bottom'].set_color('#666666')
                
                # Graficar datos estilo Simscape
                self.ax[i].plot(self.time, self.results[var], 
                             color='#1f77b4', linewidth=1.5,
                             label=f'{var}')
                
                # Etiquetas y formato
                self.ax[i].set_xlabel('Time (s)', color='black',
                                   fontsize=9, labelpad=5)
                self.ax[i].set_ylabel(var, color='black',
                                   fontsize=9, labelpad=5)
                self.ax[i].tick_params(colors='#666666', labelsize=8)
                
                # Leyenda y título
                self.ax[i].legend(loc='upper right', frameon=True,
                               fancybox=True, framealpha=0.8,
                               fontsize=8)
                
                # Estadísticas en tooltip
                max_val = np.max(self.results[var])
                min_val = np.min(self.results[var])
                
                # Añadir marcadores de máximo y mínimo
                max_idx = np.argmax(self.results[var])
                min_idx = np.argmin(self.results[var])
                
                self.ax[i].plot(self.time[max_idx], max_val, 'o',
                             color='#2ca02c', markersize=4)
                self.ax[i].plot(self.time[min_idx], min_val, 'o',
                             color='#d62728', markersize=4)
                
                # Información en tooltip (simulado con texto)
                stats = f'{var}\nMax: {max_val:.3f}\nMin: {min_val:.3f}'
                self.ax[i].text(self.time[max_idx], max_val, stats,
                             verticalalignment='bottom',
                             horizontalalignment='right',
                             fontsize=8, color='#666666',
                             bbox=dict(facecolor='white', edgecolor='#cccccc',
                                     alpha=0.9, boxstyle='round,pad=0.5'))
            
            # Ajustar espaciado
            self.fig.tight_layout()
            
        return self.fig, self.ax

class SimulationGUI:
    """Interfaz gráfica para el simulador estilo Simscape"""
    def __init__(self, system_params: SystemParameters):
        self.system_params = system_params
        self.sim_params = SimulationParameters()
        self.setup_gui()
        
    def setup_gui(self):
        """Configura la interfaz gráfica"""
        # Ventana principal
        self.root = tk.Tk()
        self.root.title(f"Simscape Results Explorer: {self.system_params.name}")
        self.root.geometry("1200x800")
        
        # Estilo
        style = ttk.Style()
        style.theme_use('vista')  # Tema más moderno
        style.configure('Toolframe.TFrame', background='#F0F0F0')
        style.configure('Nav.TFrame', background='#E8E8E8')
        style.configure('Content.TFrame', background='white')
        
        # Frame principal
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill='both', expand=True)
        
        # Barra de herramientas superior
        toolbar = ttk.Frame(main_frame, style='Toolframe.TFrame', height=40)
        toolbar.pack(fill='x', padx=0, pady=0)
        
        # Botones de la barra de herramientas
        ttk.Button(toolbar, text="HOME", width=8).pack(side='left', padx=2, pady=2)
        ttk.Button(toolbar, text="DATA", width=8).pack(side='left', padx=2, pady=2)
        ttk.Separator(toolbar, orient='vertical').pack(side='left', padx=5, fill='y', pady=2)
        
        # Controles de tiempo
        time_frame = ttk.Frame(toolbar)
        time_frame.pack(side='left', padx=10)
        ttk.Label(time_frame, text="Start Time:").pack(side='left')
        self.t_start = ttk.Entry(time_frame, width=8)
        self.t_start.insert(0, "0.0")
        self.t_start.pack(side='left', padx=5)
        
        ttk.Label(time_frame, text="Stop Time:").pack(side='left')
        self.t_end = ttk.Entry(time_frame, width=8)
        self.t_end.insert(0, "10.0")
        self.t_end.pack(side='left', padx=5)
        
        # Contenedor principal
        content = ttk.Frame(main_frame, style='Content.TFrame')
        content.pack(fill='both', expand=True, padx=0, pady=0)
        
        # Panel izquierdo (navegación y parámetros)
        left_panel = ttk.Frame(content, style='Nav.TFrame', width=250)
        left_panel.pack(side='left', fill='y', padx=0, pady=0)
        left_panel.pack_propagate(False)
        
        # Árbol de modelo
        ttk.Label(left_panel, text="Model Tree Structure", 
                 font=('Segoe UI', 10, 'bold')).pack(fill='x', padx=5, pady=5)
        
        tree = ttk.Treeview(left_panel, show='tree', height=15)
        tree.pack(fill='x', padx=5, pady=5)
        
        # Añadir elementos al árbol
        root_item = tree.insert("", "end", text=self.system_params.name, open=True)
        params_item = tree.insert(root_item, "end", text="Parameters", open=True)
        
        # Parámetros del sistema como entradas en el árbol
        self.param_entries = {}
        for param, value in self.system_params.params.items():
            param_frame = ttk.Frame(left_panel)
            param_frame.pack(fill='x', padx=5, pady=2)
            
            ttk.Label(param_frame, text=f"{param}:").pack(side='left')
            entry = ttk.Entry(param_frame, width=10)
            entry.insert(0, str(value))
            entry.pack(side='right', padx=5)
            self.param_entries[param] = entry
            
            tree.insert(params_item, "end", text=f"{param}: {value}")
        
        # Panel de simulación
        sim_frame = ttk.LabelFrame(main_frame, text="Control de Simulación")
        sim_frame.pack(fill='x', pady=(0, 10))
        
        # Parámetros de tiempo
        ttk.Label(sim_frame, text="T inicial:").grid(row=0, column=0, padx=5)
        self.t_start = ttk.Entry(sim_frame, width=8)
        self.t_start.insert(0, str(self.sim_params.t_start))
        self.t_start.grid(row=0, column=1, padx=5)
        
        ttk.Label(sim_frame, text="T final:").grid(row=0, column=2, padx=5)
        self.t_end = ttk.Entry(sim_frame, width=8)
        self.t_end.insert(0, str(self.sim_params.t_end))
        self.t_end.grid(row=0, column=3, padx=5)
        
        ttk.Label(sim_frame, text="dt:").grid(row=0, column=4, padx=5)
        self.dt = ttk.Entry(sim_frame, width=8)
        self.dt.insert(0, str(self.sim_params.dt))
        self.dt.grid(row=0, column=5, padx=5)
        
        # Botones
        button_frame = ttk.Frame(sim_frame)
        button_frame.grid(row=1, column=0, columnspan=6, pady=10)
        
        ttk.Button(button_frame, text="Simular",
                  command=self.run_simulation).pack(side='left', padx=5)
        ttk.Button(button_frame, text="Limpiar",
                  command=self.clear_plot).pack(side='left', padx=5)
        
        # Panel derecho (gráficos)
        right_panel = ttk.Frame(content)
        right_panel.pack(side='left', fill='both', expand=True, padx=5, pady=5)
        
        # Barra de herramientas de gráfico
        plot_toolbar = ttk.Frame(right_panel)
        plot_toolbar.pack(fill='x', padx=2, pady=2)
        
        # Botones de control de gráfico
        ttk.Button(plot_toolbar, text="Plot Type ▼", width=10).pack(side='left', padx=2)
        ttk.Button(plot_toolbar, text="Layout ▼", width=10).pack(side='left', padx=2)
        ttk.Checkbutton(plot_toolbar, text="Show Legend").pack(side='left', padx=10)
        ttk.Checkbutton(plot_toolbar, text="Link Time Axes").pack(side='left', padx=2)
        
        # Frame para gráfica
        self.plot_frame = ttk.Frame(right_panel)
        self.plot_frame.pack(fill='both', expand=True)
        
    def run_simulation(self):
        """Ejecuta la simulación con los parámetros actuales"""
        # Actualizar parámetros
        for param, entry in self.param_entries.items():
            self.system_params.params[param] = float(entry.get())
            
        # Crear simulador
        sim_params = SimulationParameters(
            t_start=float(self.t_start.get()),
            t_end=float(self.t_end.get()),
            dt=0.01  # Paso fijo para mejor visualización
        )
        simulator = SystemSimulator(self.system_params, sim_params)
        
        # Definir ecuación de estado para sistema de engranajes
        def gear_state_equation(y, t, params, u):
            """
            y[0] = w1 (velocidad angular engranaje entrada)
            y[1] = w2 (velocidad angular engranaje salida)
            y[2] = theta1 (posición angular engranaje entrada)
            y[3] = theta2 (posición angular engranaje salida)
            """
            # Extraer parámetros
            J1 = params['J1']
            J2 = params['J2']
            N1 = params['N1']
            N2 = params['N2']
            b = params['b']
            tau_in = params['tau_in']
            
            # Relación de transmisión
            gear_ratio = N2/N1
            
            # Variables de estado
            w1 = y[0]  # Velocidad angular entrada
            w2 = y[1]  # Velocidad angular salida
            
            # Calcular derivadas
            dw1 = (tau_in - b*w1)/(J1)  # Aceleración angular entrada
            dw2 = -b*w2/(J2*gear_ratio)  # Aceleración angular salida
            
            return [
                dw1,           # dw1/dt
                dw2,           # dw2/dt
                w1,            # dtheta1/dt = w1
                w2/gear_ratio  # dtheta2/dt = w2/gear_ratio
            ]
        
        simulator.set_state_equation(gear_state_equation)
        
        # Simular con condiciones iniciales
        # [w1_0, w2_0, theta1_0, theta2_0]
        initial_conditions = [0.0, 0.0, 0.0, 0.0]
        simulator.simulate(initial_conditions)
        
        # Actualizar gráfico con solo las velocidades angulares
        fig, ax = simulator.plot_results(variables=["Input_Gear.w", "Output_Gear.w"])
        
        # Mostrar en GUI
        for widget in self.plot_frame.winfo_children():
            widget.destroy()
        
        canvas = FigureCanvasTkAgg(fig, self.plot_frame)
        canvas.draw()
        canvas.get_tk_widget().pack(fill='both', expand=True)
        
    def clear_plot(self):
        """Limpia la gráfica actual"""
        for widget in self.plot_frame.winfo_children():
            widget.destroy()

# Ejemplo de uso
if __name__ == "__main__":
    # Definir sistema de engranajes
    gear_params = GearMechanismParams()
    system_params = SystemParameters(
        name="Gear Mechanism",
        params={
            "J1": gear_params.J1,
            "J2": gear_params.J2,
            "N1": gear_params.N1,
            "N2": gear_params.N2,
            "b": gear_params.b,
            "tau_in": gear_params.tau_in
        },
        states=["Input_Gear.w", "Output_Gear.w", "Input_Gear.theta", "Output_Gear.theta"],
        inputs=["tau_in"],
        outputs=["Input_Gear.w", "Output_Gear.w"]
    )
    
    # Crear y mostrar GUI
    gui = SimulationGUI(system_params)
    gui.root.mainloop()