"""
SIMULACIÓN DE IMPACTO DE CARRITO LEGO
Análisis integral: Visualización VPython + FEA simplificado + Exportación
Autor: Análisis de Ingeniería Mecánica
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from matplotlib.animation import FuncAnimation
import json

# ============================================================================
# PARTE 1: PARÁMETROS DEL SISTEMA
# ============================================================================

class LegoCartParameters:
    """Parámetros físicos del carrito LEGO"""
    def __init__(self):
        # Geometría del carrito (metros)
        self.length = 0.10  # 10 cm
        self.width = 0.06   # 6 cm
        self.height = 0.04  # 4 cm
        
        # Propiedades del material ABS (LEGO)
        self.density = 1050  # kg/m³
        self.youngs_modulus = 2.3e9  # Pa (2.3 GPa)
        self.poisson_ratio = 0.35
        self.yield_strength = 40e6  # Pa (40 MPa)
        
        # Cálculo de masa
        self.volume = self.length * self.width * self.height
        self.mass = self.density * self.volume  # kg
        
        # Condiciones iniciales
        self.height_initial = 1.0  # metros
        self.velocity_initial = 0.0  # m/s
        
        # Superficie de impacto (acero)
        self.surface_stiffness = 200e9  # Pa (módulo de Young del acero)
        self.coefficient_restitution = 0.3  # Coeficiente de restitución
        self.friction_coefficient = 0.6
        
        # Gravedad
        self.g = 9.81  # m/s²

# ============================================================================
# PARTE 2: SIMULACIÓN DINÁMICA (VPYTHON STYLE)
# ============================================================================

class DynamicSimulation:
    """Simulación de la caída y rebote del carrito"""
    def __init__(self, params):
        self.params = params
        self.dt = 0.001  # Paso de tiempo (1 ms)
        self.time = []
        self.position = []
        self.velocity = []
        self.acceleration = []
        self.energy_kinetic = []
        self.energy_potential = []
        self.force_impact = []
        
    def simulate(self, duration=2.0):
        """Ejecuta la simulación completa"""
        t = 0
        y = self.params.height_initial
        v = self.params.velocity_initial
        contact = False
        impact_occurred = False
        
        while t < duration:
            # Fase de caída libre
            if y > 0 and not contact:
                a = -self.params.g
                v += a * self.dt
                y += v * self.dt
                f_impact = 0
                
                # Detección de contacto
                if y <= 0:
                    contact = True
                    impact_occurred = True
                    y = 0
                    # Aplicar coeficiente de restitución inmediatamente
                    v = -v * self.params.coefficient_restitution
                    
            # Fase después del rebote
            elif contact and y >= 0:
                if v > 0.01:  # Todavía rebotando
                    a = -self.params.g
                    v += a * self.dt
                    y += v * self.dt
                    f_impact = 0
                    
                    if y <= 0:
                        y = 0
                        v = -v * self.params.coefficient_restitution
                        if abs(v) < 0.05:  # Velocidad muy baja, detener rebotes
                            v = 0
                            contact = False
                else:  # Reposo en el suelo
                    y = 0
                    v = 0
                    a = 0
                    f_impact = self.params.mass * self.params.g  # Solo peso
                    contact = False
            
            # Calcular fuerza de impacto solo en el momento del contacto
            if impact_occurred and abs(y) < 0.001 and abs(v) > 0.1:
                # Estimación de fuerza de impacto usando impulso
                # F = m * Δv / Δt_contact
                delta_v = abs(v) * (1 + self.params.coefficient_restitution)
                contact_time = 0.01  # ~10ms de contacto típico
                f_impact = self.params.mass * delta_v / contact_time
            elif y == 0 and abs(v) < 0.1:
                f_impact = self.params.mass * self.params.g
            else:
                f_impact = 0
                
            # Calcular energías
            ek = 0.5 * self.params.mass * v**2
            ep = self.params.mass * self.params.g * max(y, 0)
            
            # Almacenar datos
            self.time.append(t)
            self.position.append(max(y, 0))
            self.velocity.append(v)
            self.acceleration.append(a)
            self.energy_kinetic.append(ek)
            self.energy_potential.append(ep)
            self.force_impact.append(f_impact)
            
            t += self.dt
            
        return self.get_results()
    
    def calculate_contact_stiffness(self):
        """Calcula la rigidez del contacto basada en teoría de Hertz"""
        # Módulo equivalente
        E1 = self.params.youngs_modulus
        E2 = self.params.surface_stiffness
        nu1 = self.params.poisson_ratio
        nu2 = 0.3  # Acero
        
        E_eff = 1 / ((1 - nu1**2)/E1 + (1 - nu2**2)/E2)
        
        # Radio de contacto equivalente (aproximación)
        R_eff = min(self.params.length, self.params.width) / 4
        
        # Rigidez de contacto (ajustada para escala pequeña)
        # Para objetos pequeños, la rigidez efectiva es menor
        k = (2/3) * E_eff * np.sqrt(R_eff) * 0.1  # Factor de corrección
        return k
    
    def get_results(self):
        """Retorna resultados de la simulación"""
        return {
            'time': np.array(self.time),
            'position': np.array(self.position),
            'velocity': np.array(self.velocity),
            'acceleration': np.array(self.acceleration),
            'kinetic_energy': np.array(self.energy_kinetic),
            'potential_energy': np.array(self.energy_potential),
            'impact_force': np.array(self.force_impact)
        }

# ============================================================================
# PARTE 3: ANÁLISIS POR ELEMENTOS FINITOS SIMPLIFICADO
# ============================================================================

class SimplifiedFEA:
    """Análisis FEA simplificado para estimación de esfuerzos"""
    def __init__(self, params, impact_force):
        self.params = params
        self.impact_force = impact_force
        self.mesh = None
        self.stress_results = None
        
    def create_mesh(self, nx=5, ny=3, nz=2):
        """Crea una malla simplificada del carrito"""
        x = np.linspace(0, self.params.length, nx)
        y = np.linspace(0, self.params.width, ny)
        z = np.linspace(0, self.params.height, nz)
        
        X, Y, Z = np.meshgrid(x, y, z)
        
        self.mesh = {
            'nodes_x': X,
            'nodes_y': Y,
            'nodes_z': Z,
            'num_elements': (nx-1) * (ny-1) * (nz-1)
        }
        
        return self.mesh
    
    def calculate_stress_distribution(self):
        """Calcula distribución de esfuerzos (modelo simplificado)"""
        if self.mesh is None:
            self.create_mesh()
        
        # Área de contacto aproximada
        contact_area = self.params.length * self.params.width
        
        # Presión de contacto
        pressure = self.impact_force / contact_area
        
        # Distribución de esfuerzo (decae con la altura)
        Z = self.mesh['nodes_z']
        stress_von_mises = pressure * np.exp(-Z / self.params.height * 3)
        
        # Factor de seguridad
        safety_factor = self.params.yield_strength / np.max(stress_von_mises)
        
        self.stress_results = {
            'von_mises': stress_von_mises,
            'max_stress': np.max(stress_von_mises),
            'max_pressure': pressure,
            'safety_factor': safety_factor,
            'yield_occurred': np.max(stress_von_mises) > self.params.yield_strength
        }
        
        return self.stress_results
    
    def calculate_deformation(self):
        """Calcula deformación bajo carga de impacto"""
        # Deformación elástica máxima (Ley de Hooke)
        max_stress = self.stress_results['max_stress']
        max_strain = max_stress / self.params.youngs_modulus
        max_deformation = max_strain * self.params.height
        
        return {
            'max_strain': max_strain,
            'max_deformation': max_deformation,
            'deformation_mm': max_deformation * 1000
        }

# ============================================================================
# PARTE 4: EXPORTACIÓN DE DATOS
# ============================================================================

class DataExporter:
    """Exporta datos para análisis en software profesional"""
    
    @staticmethod
    def convert_to_serializable(obj):
        """Convierte objetos numpy a tipos serializables"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        elif isinstance(obj, (np.bool_, bool)):
            return bool(obj)
        elif isinstance(obj, dict):
            return {k: DataExporter.convert_to_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [DataExporter.convert_to_serializable(item) for item in obj]
        else:
            return obj
    
    @staticmethod
    def export_to_json(results, filename='lego_cart_impact.json'):
        """Exporta resultados a JSON"""
        # Convertir todo a tipos serializables
        export_data = DataExporter.convert_to_serializable(results)
        
        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"[OK] Datos exportados a {filename}")
        return filename
    
    @staticmethod
    def export_to_csv(results, filename='lego_cart_impact.csv'):
        """Exporta serie temporal a CSV"""
        import csv
        
        with open(filename, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Time(s)', 'Position(m)', 'Velocity(m/s)', 
                           'Force(N)', 'Energy_Total(J)'])
            
            for i in range(len(results['time'])):
                writer.writerow([
                    results['time'][i],
                    results['position'][i],
                    results['velocity'][i],
                    results['impact_force'][i],
                    results['kinetic_energy'][i] + results['potential_energy'][i]
                ])
        
        print(f"[OK] Serie temporal exportada a {filename}")
        return filename
    
    @staticmethod
    def generate_inventor_instructions():
        """Genera instrucciones para importar a Inventor"""
        instructions = """
================================================================
     GUIA DE IMPORTACION A AUTODESK INVENTOR DYNAMICS          
================================================================

1. CREAR MODELO 3D:
   - Crear pieza de 100mm x 60mm x 40mm (LEGO cart)
   - Material: ABS (densidad=1050 kg/m3, E=2.3 GPa)
   
2. CONFIGURAR SIMULACION DINAMICA:
   - Assembly > Dynamic Simulation
   - Agregar gravedad: 9.81 m/s2 (eje Y negativo)
   - Altura inicial: 1000 mm
   
3. DEFINIR CONTACTO:
   - Surface Contact (carrito-suelo)
   - Coefficient of Restitution: 0.3
   - Friction: 0.6
   
4. ANALISIS DE ESFUERZOS:
   - Stress Analysis > Maximum Principal Stress
   - Verificar von Mises < 40 MPa (yield strength)
   
5. IMPORTAR DATOS DE REFERENCIA:
   - Usar lego_cart_impact.csv para validacion
   - Comparar fuerza de impacto y energias

================================================================
        """
        print(instructions)
        return instructions

# ============================================================================
# PARTE 5: VISUALIZACIÓN Y ANÁLISIS
# ============================================================================

class ResultsVisualizer:
    """Visualiza resultados de la simulación"""
    
    @staticmethod
    def plot_complete_analysis(sim_results, fea_results):
        """Genera gráficos completos del análisis"""
        fig = plt.figure(figsize=(16, 10))
        
        # 1. Posición vs Tiempo
        ax1 = plt.subplot(2, 3, 1)
        ax1.plot(sim_results['time'], sim_results['position']*100, 'b-', linewidth=2)
        ax1.set_xlabel('Tiempo (s)', fontsize=10)
        ax1.set_ylabel('Altura (cm)', fontsize=10)
        ax1.set_title('Posición del Carrito', fontweight='bold')
        ax1.grid(True, alpha=0.3)
        
        # 2. Velocidad vs Tiempo
        ax2 = plt.subplot(2, 3, 2)
        ax2.plot(sim_results['time'], sim_results['velocity'], 'r-', linewidth=2)
        ax2.set_xlabel('Tiempo (s)', fontsize=10)
        ax2.set_ylabel('Velocidad (m/s)', fontsize=10)
        ax2.set_title('Velocidad del Carrito', fontweight='bold')
        ax2.grid(True, alpha=0.3)
        ax2.axhline(y=0, color='k', linestyle='--', alpha=0.3)
        
        # 3. Fuerza de Impacto
        ax3 = plt.subplot(2, 3, 3)
        ax3.plot(sim_results['time'], sim_results['impact_force'], 'g-', linewidth=2)
        ax3.set_xlabel('Tiempo (s)', fontsize=10)
        ax3.set_ylabel('Fuerza (N)', fontsize=10)
        ax3.set_title('Fuerza de Impacto', fontweight='bold')
        ax3.grid(True, alpha=0.3)
        
        # 4. Energías
        ax4 = plt.subplot(2, 3, 4)
        ax4.plot(sim_results['time'], sim_results['kinetic_energy']*1000, 
                label='Cinética', linewidth=2)
        ax4.plot(sim_results['time'], sim_results['potential_energy']*1000, 
                label='Potencial', linewidth=2)
        total = (sim_results['kinetic_energy'] + sim_results['potential_energy'])*1000
        ax4.plot(sim_results['time'], total, 'k--', label='Total', linewidth=2)
        ax4.set_xlabel('Tiempo (s)', fontsize=10)
        ax4.set_ylabel('Energía (mJ)', fontsize=10)
        ax4.set_title('Balance de Energía', fontweight='bold')
        ax4.legend()
        ax4.grid(True, alpha=0.3)
        
        # 5. Distribución de Esfuerzos (corte 2D)
        ax5 = plt.subplot(2, 3, 5)
        if fea_results and 'von_mises' in fea_results:
            stress_slice = fea_results['von_mises'][:, :, 0] / 1e6  # MPa
            im = ax5.imshow(stress_slice, cmap='jet', origin='lower', 
                          extent=[0, 100, 0, 60], aspect='auto')
            ax5.set_xlabel('Longitud (mm)', fontsize=10)
            ax5.set_ylabel('Ancho (mm)', fontsize=10)
            ax5.set_title('Esfuerzo von Mises (MPa)', fontweight='bold')
            plt.colorbar(im, ax=ax5, label='Esfuerzo (MPa)')
        
        # 6. Resumen de resultados
        ax6 = plt.subplot(2, 3, 6)
        ax6.axis('off')
        
        # Calcular valores clave
        v_impact = -np.min(sim_results['velocity'])
        f_max = np.max(sim_results['impact_force'])
        e_initial = sim_results['potential_energy'][0]
        
        summary = f"""
RESUMEN DEL ANÁLISIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPACTO:
• Velocidad: {v_impact:.2f} m/s
• Fuerza máxima: {f_max:.1f} N
• Energía inicial: {e_initial*1000:.2f} mJ

ESFUERZOS (FEA):
• Sigma maximo: {fea_results['max_stress']/1e6:.1f} MPa
• Presion: {fea_results['max_pressure']/1e6:.2f} MPa
• Factor seguridad: {fea_results['safety_factor']:.2f}
• Fluencia? {'SI [!]' if fea_results['yield_occurred'] else 'NO [OK]'}

ESTADO: {'FALLA' if fea_results['yield_occurred'] else 'SEGURO'}
        """
        
        ax6.text(0.1, 0.5, summary, fontsize=11, family='monospace',
                verticalalignment='center')
        
        plt.tight_layout()
        plt.savefig('lego_cart_analysis.png', dpi=150, bbox_inches='tight')
        print("[OK] Graficos guardados en 'lego_cart_analysis.png'")
        plt.show()

# ============================================================================
# PROGRAMA PRINCIPAL
# ============================================================================

def main():
    print("="*70)
    print(" ANALISIS DE IMPACTO - CARRITO LEGO")
    print(" Simulacion + FEA + Exportacion")
    print("="*70)
    
    # Inicializar parametros
    print("\n[1/5] Inicializando parametros...")
    params = LegoCartParameters()
    print(f"  -> Masa del carrito: {params.mass*1000:.2f} g")
    print(f"  -> Velocidad de impacto teorica: {np.sqrt(2*params.g*params.height_initial):.2f} m/s")
    
    # Ejecutar simulacion dinamica
    print("\n[2/5] Ejecutando simulacion dinamica...")
    sim = DynamicSimulation(params)
    results = sim.simulate(duration=2.0)
    print(f"  -> Simulacion completada: {len(results['time'])} pasos")
    print(f"  -> Fuerza de impacto maxima: {np.max(results['impact_force']):.1f} N")
    
    # Analisis FEA
    print("\n[3/5] Analisis por elementos finitos...")
    fea = SimplifiedFEA(params, np.max(results['impact_force']))
    fea.create_mesh(nx=10, ny=6, nz=4)
    stress_results = fea.calculate_stress_distribution()
    deformation = fea.calculate_deformation()
    print(f"  -> Esfuerzo maximo: {stress_results['max_stress']/1e6:.2f} MPa")
    print(f"  -> Deformacion maxima: {deformation['deformation_mm']:.4f} mm")
    print(f"  -> Factor de seguridad: {stress_results['safety_factor']:.2f}")
    
    # Exportar datos
    print("\n[4/5] Exportando datos...")
    exporter = DataExporter()
    exporter.export_to_json({**results, 'fea': stress_results, 'deformation': deformation})
    exporter.export_to_csv(results)
    exporter.generate_inventor_instructions()
    
    # Visualizar resultados
    print("\n[5/5] Generando visualizaciones...")
    visualizer = ResultsVisualizer()
    visualizer.plot_complete_analysis(results, stress_results)
    
    print("\n" + "="*70)
    print(" ANALISIS COMPLETADO")
    print("="*70)
    print("\nArchivos generados:")
    print("  - lego_cart_impact.json - Datos completos")
    print("  - lego_cart_impact.csv - Serie temporal")
    print("  - lego_cart_analysis.png - Graficos de analisis")
    print("\nProximos pasos:")
    print("  1. Revisar graficos generados")
    print("  2. Importar datos a Autodesk Inventor")
    print("  3. Validar con simulacion profesional")

if __name__ == "__main__":
    main()