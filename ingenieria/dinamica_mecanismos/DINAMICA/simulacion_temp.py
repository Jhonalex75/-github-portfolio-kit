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
        """Visualiza los resultados de la simulación"""
        if variables is None:
            variables = list(self.results.keys())
            
        if style == 'simscape':
            # Crear figura con tema oscuro
            plt.style.use('dark_background')
            self.fig, self.ax = plt.subplots(len(variables), 1, figsize=(12, 3*len(variables)))
            self.fig.patch.set_facecolor('#1C1C1C')
            
            if len(variables) == 1:
                self.ax = [self.ax]
                
            for i, var in enumerate(variables):
                # Configurar subplot
                self.ax[i].set_facecolor('#2C2C2C')
                self.ax[i].grid(True, linestyle='--', alpha=0.3, color='gray')
                
                # Graficar datos
                self.ax[i].plot(self.time, self.results[var], 
                             color='#00A6D6', linewidth=2.5)
                self.ax[i].fill_between(self.time, self.results[var], 
                                     alpha=0.1, color='#00A6D6')
                
                # Etiquetas y formato
                self.ax[i].set_xlabel('Tiempo (s)', color='white')
                self.ax[i].set_ylabel(var, color='white')
                self.ax[i].tick_params(colors='white')
                
                # Estadísticas
                stats = f'Max: {np.max(self.results[var]):.3f}\n'
                stats += f'Min: {np.min(self.results[var]):.3f}\n'
                stats += f'Medio: {np.mean(self.results[var]):.3f}'
                
                self.ax[i].text(0.02, 0.98, stats,
                             transform=self.ax[i].transAxes,
                             color='white', fontsize=9,
                             bbox=dict(facecolor='#404040', alpha=0.5),
                             verticalalignment='top')
            
            # Ajustar espaciado
            self.fig.tight_layout()
            
        return self.fig, self.ax

class SimulationGUI:
    """Interfaz gráfica para el simulador"""
    def __init__(self, system_params: SystemParameters):
        self.system_params = system_params
        self.sim_params = SimulationParameters()
        self.setup_gui()
        
    def setup_gui(self):
        """Configura la interfaz gráfica"""
        # Ventana principal
        self.root = tk.Tk()
        self.root.title(f"Simulador - {self.system_params.name}")
        
        # Frame principal
        main_frame = ttk.Frame(self.root)
        main_frame.pack(padx=10, pady=10, fill='both', expand=True)
        
        # Panel de parámetros
        params_frame = ttk.LabelFrame(main_frame, text="Parámetros del Sistema")
        params_frame.pack(fill='x', pady=(0, 10))
        
        # Crear entradas para cada parámetro
        self.param_entries = {}
        for i, (param, value) in enumerate(self.system_params.params.items()):
            ttk.Label(params_frame, text=f"{param}:").grid(row=i, column=0, padx=5, pady=2)
            entry = ttk.Entry(params_frame, width=10)
            entry.insert(0, str(value))
            entry.grid(row=i, column=1, padx=5, pady=2)
            self.param_entries[param] = entry
        
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
        
        # Frame para gráfica
        self.plot_frame = ttk.Frame(main_frame)
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
            dt=float(self.dt.get())
        )
        simulator = SystemSimulator(self.system_params, sim_params)
        
        # Definir ecuación de estado (ejemplo masa-resorte-amortiguador)
        def state_equation(y, t, params, u):
            """
            y[0] = position
            y[1] = velocity
            """
            return [
                y[1],  # dx/dt = v
                (-params['spring']/params['mass'])*y[0] + 
                (-params['damping']/params['mass'])*y[1]  # dv/dt = F/m
            ]
        
        simulator.set_state_equation(state_equation)
        
        # Simular con condiciones iniciales
        simulator.simulate([1.0, 0.0])  # Posición inicial = 1m, velocidad inicial = 0
        
        # Actualizar gráfico
        fig, ax = simulator.plot_results()
        
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
    # Definir sistema masa-resorte-amortiguador
    system_params = SystemParameters(
        name="Sistema Masa-Resorte-Amortiguador",
        params={
            "mass": 1.0,      # kg
            "spring": 10.0,    # N/m
            "damping": 0.5     # Ns/m
        },
        states=["position", "velocity"],
        inputs=["force"],
        outputs=["position"]
    )
    
    # Crear y mostrar GUI
    gui = SimulationGUI(system_params)
    gui.root.mainloop()