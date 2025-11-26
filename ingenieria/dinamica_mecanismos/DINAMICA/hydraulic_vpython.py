from vpython import *
import math

## ----------------------------------------
## 1. Constantes y Parámetros Globales
## ----------------------------------------
# Parámetros físicos (ajustados para reflejar un sistema más grande)
HFW_INERTIA_KGM2 = 1.0            # kg·m² (mayor inercia para HFW)
MFW_INERTIA_KGM2 = 0.8            # kg·m² (inercia para Volante Mecánico)
ENGINE_RPM_MAX = 2200             # RPM
PUMP_DISPLACEMENT_M3_REV = 75e-6  # m³/rev (75 cc/rev)
MOTOR_DISPLACEMENT_M3_REV = 75e-6 # m³/rev
ACCUMULATOR_VOLUME_M3 = 0.05      # 50 Litros
PRECHARGE_PRESSURE_PA = 10e5      # 10 bar
MAX_PRESSURE_PA = 350e5           # Pa (350 bar)
MAX_OMEGA_RAD_S = (ENGINE_RPM_MAX * 2 * math.pi) / 60 # rad/s (relacionado con el motor)

# Parámetros de simulación
SIM_DT = 0.05                     # Timestep (s)
SIM_RATE = 30                     # Tasa de refresco (fps)
CHARGE_ACCEL_OMEGA = 5.0          # Factor de aceleración angular para carga
DISCHARGE_ACCEL_OMEGA = -4.0      # Factor de desaceleración angular para descarga
VALVE_SWITCH_TIME = 0.5           # Tiempo para que la válvula cambie de estado

## ----------------------------------------
## 2. Clase de Estado del Sistema Mejorada
## ----------------------------------------
class HydraulicFlywheelSystem:
    """Almacena todo el estado y los parámetros de la simulación del sistema HFW."""
    
    def __init__(self):
        # Parámetros físicos
        self.hfw_inertia = HFW_INERTIA_KGM2
        self.mfw_inertia = MFW_INERTIA_KGM2
        self.pump_displacement = PUMP_DISPLACEMENT_M3_REV
        self.motor_displacement = MOTOR_DISPLACEMENT_M3_REV
        self.max_omega = MAX_OMEGA_RAD_S
        self.max_pressure = MAX_PRESSURE_PA
        self.accumulator_volume = ACCUMULATOR_VOLUME_M3
        self.precharge_pressure = PRECHARGE_PRESSURE_PA
        
        # Pre-cálculo de energía máxima
        self.max_hfw_energy_j = 0.5 * self.hfw_inertia * (self.max_omega ** 2)

        # Estado inicial
        self.reset()

    def reset(self):
        """Resetea el sistema a su estado inicial."""
        self.hfw_omega_rad_s = 0.0      # Velocidad angular HFW (rad/s)
        self.mfw_omega_rad_s = 0.0      # Velocidad angular Volante Mecánico (rad/s)
        self.engine_rpm = 0.0           # RPM del motor
        self.pressure_pa = PRECHARGE_PRESSURE_PA # Presión del sistema (Pa)
        self.stored_energy_j = 0.0      # Energía almacenada en HFW (Joules)
        self.accumulator_fluid_vol_m3 = 0.0 # Volumen de fluido en el acumulador
        
        self.time_s = 0.0               # Tiempo de simulación (s)
        self.mode = "charging"          # 'charging' o 'discharging'
        self.running = False            # Estado de la simulación
        self.valve_state = "neutral"    # 'pump_to_hfw', 'hfw_to_motor', 'neutral'
        self.valve_transition_timer = 0.0 # Temporizador para transiciones de válvula

    def update_state(self, dt):
        """Calcula la física del siguiente paso de tiempo para un sistema más complejo."""
        if not self.running:
            return

        # Simulación simplificada del motor y volante mecánico
        self.engine_rpm = self.max_omega * 60 / (2 * math.pi) # Asumimos relación directa con HFW
        self.mfw_omega_rad_s = self.hfw_omega_rad_s # Asumimos que están acoplados mecánicamente

        # Lógica de la válvula y control de flujo
        target_valve_state = "neutral"
        if self.mode == "charging":
            target_valve_state = "pump_to_hfw"
        elif self.mode == "discharging":
            target_valve_state = "hfw_to_motor"
        
        # Simular transición suave de la válvula
        if self.valve_state != target_valve_state:
            self.valve_transition_timer += dt
            if self.valve_transition_timer >= VALVE_SWITCH_TIME:
                self.valve_state = target_valve_state
                self.valve_transition_timer = 0.0
        else:
            self.valve_transition_timer = 0.0 # Reset si ya está en el estado objetivo

        # 1. Lógica de carga/descarga y presión
        flow_rate_m3s = 0.0
        if self.valve_state == "pump_to_hfw": # Carga
            if self.hfw_omega_rad_s < self.max_omega:
                flow_rate_m3s = self.pump_displacement * (self.engine_rpm / 60) # Flujo de la bomba
                self.hfw_omega_rad_s = min(self.hfw_omega_rad_s + CHARGE_ACCEL_OMEGA * dt, self.max_omega)
            else:
                self.hfw_omega_rad_s = self.max_omega
                flow_rate_m3s = 0 # No hay flujo si está lleno

        elif self.valve_state == "hfw_to_motor": # Descarga
            if self.hfw_omega_rad_s > 0:
                # Flujo generado por HFW (actuando como bomba)
                flow_rate_m3s = self.motor_displacement * (self.hfw_omega_rad_s / (2 * math.pi)) 
                self.hfw_omega_rad_s = max(self.hfw_omega_rad_s + DISCHARGE_ACCEL_OMEGA * dt, 0.0)
            else:
                self.hfw_omega_rad_s = 0.0
                flow_rate_m3s = 0 # No hay flujo si está vacío

        # Acumulador: amortigua la presión y almacena fluido
        # Modelo simplificado: P*V^k = const (gas ideal para compresion)
        # Esto es muy simplificado, solo para visualización
        self.accumulator_fluid_vol_m3 += (flow_rate_m3s if self.mode == "charging" else -flow_rate_m3s) * dt
        self.accumulator_fluid_vol_m3 = max(0, min(self.accumulator_fluid_vol_m3, self.accumulator_volume))
        
        # Simulación de presión (muy simplificado, basado en el volumen de fluido)
        if self.accumulator_fluid_vol_m3 > 0:
             self.pressure_pa = self.precharge_pressure + (self.accumulator_fluid_vol_m3 / self.accumulator_volume) * (self.max_pressure - self.precharge_pressure)
        else:
             self.pressure_pa = self.precharge_pressure # Mínimo

        self.pressure_pa = max(self.precharge_pressure, min(self.pressure_pa, self.max_pressure))

        # 2. Cálculos de energía
        self.stored_energy_j = 0.5 * self.hfw_inertia * (self.hfw_omega_rad_s ** 2)
        
        # 3. Avanzar el tiempo
        self.time_s += dt

## ----------------------------------------
## 3. Funciones de Configuración de la Escena
## ----------------------------------------

def setup_scene():
    """Configura las propiedades de la ventana de VPython."""
    scene.title = "Sistema HFW Mejorado - Visión General"
    scene.width = 1200
    scene.height = 800
    scene.background = vector(0.1, 0.1, 0.15) # Fondo oscuro para contraste
    scene.caption = "\n\nParámetros del Sistema:"
    scene.forward = vector(-1, -0.5, -1) # Vista isométrica inicial
    scene.camera.pos = vector(0, 5, 15)
    scene.camera.axis = vector(0, -2, -10)
    
def crear_modelos_3d():
    """Crea y posiciona todos los objetos 3D en la escena.
    Retorna un diccionario con los objetos que necesitan ser actualizados/rotados.
    """
    # ----------------------------------------
    # Bloque Motor/Transmisión Principal
    # ----------------------------------------
    engine_block = box(pos=vector(-8, -2, 0), size=vector(2.5, 1.5, 2), color=vector(0.5, 0.5, 0.5))
    engine_head = box(pos=vector(-8, -1, 0.5), size=vector(2.5, 0.5, 1), color=vector(0.6, 0.6, 0.6))
    label(pos=engine_block.pos + vector(0, 1.5, 0), text="Motor Principal", height=12, box=False, color=color.white)
    
    transmission_case = box(pos=vector(-5.5, -2, 0), size=vector(2, 1.5, 2), color=vector(0.4, 0.4, 0.4))
    label(pos=transmission_case.pos + vector(0, 1.5, 0), text="Transmisión", height=12, box=False, color=color.white)

    # Volante Mecánico (MFW) - Ahora parte de la transmisión
    mfw_body = cylinder(pos=vector(-5, -2.5, -1), axis=vector(0, 0.5, 0), radius=0.8, color=vector(0.2, 0.8, 0.2))
    mfw_shaft = cylinder(pos=vector(-5, -2.25, -1), axis=vector(0, 0.5, 0), radius=0.1, color=vector(0.3, 0.3, 0.3))
    label(pos=mfw_body.pos + vector(0, -1.2, 0), text="Volante Mecánico", height=10, box=False, color=color.white)
    
    # Bomba hidráulica (acoplada al motor/transmisión)
    pump_body = cylinder(pos=vector(-4, -0.5, 0.8), axis=vector(0.8, 0, 0), radius=0.5, color=color.blue)
    pump_shaft = cylinder(pos=pump_body.pos + vector(0.8, 0, 0), axis=vector(0.3, 0, 0), radius=0.1, color=vector(0.3, 0.3, 0.3))
    label(pos=pump_body.pos + vector(1.5, 0, 0), text="Bomba/Motor VG", height=10, box=False, color=color.white)

    # ----------------------------------------
    # Bloque Volante Hidráulico (HFW)
    # ----------------------------------------
    hfw_housing = box(pos=vector(4, 1, 0), size=vector(3, 2, 2.5), color=vector(0.2, 0.2, 0.3))
    hfw_disk = cylinder(pos=vector(4, 1, 0), axis=vector(0, 0.5, 0), radius=1.0, color=vector(0.0, 0.7, 0.9))
    hfw_shaft = cylinder(pos=vector(4, 1.25, 0), axis=vector(0, 0.7, 0), radius=0.15, color=vector(0.3, 0.3, 0.3))
    label(pos=hfw_housing.pos + vector(0, 2, 0), text="Volante Hidráulico (HFW)", height=12, box=False, color=color.white)

    # ----------------------------------------
    # Acumulador Hidráulico
    # ----------------------------------------
    
    # ***** LÍNEA CORREGIDA *****
    accumulator = cylinder(pos=vector(0, 4, -1), axis=vector(2.5, 0, 0), radius=0.6, color=color.red, opacity=0.8) # El rojo es para el aceite presurizado
    
    label(pos=accumulator.pos + vector(0, 1.0, 0), text="Acumulador Hidráulico", height=10, box=False, color=color.white)

    # ----------------------------------------
    # Tanque de Aceite
    # ----------------------------------------
    tank = box(pos=vector(-8, -4, 0), size=vector(2.5, 1.5, 2), color=vector(0.7, 0.7, 0.7))
    label(pos=tank.pos + vector(0, 1.2, 0), text="Tanque\n(Baja Presión)", height=10, box=False, color=color.white)

    # ----------------------------------------
    # Válvula de Control (simplificada)
    # ----------------------------------------
    valve_body = box(pos=vector(0, 0, 0.5), size=vector(1.5, 0.8, 0.8), color=color.orange)
    label(pos=valve_body.pos + vector(0, 1, 0), text="Válvula de Control", height=10, box=False, color=color.white)
    
    # Indicador de RPM del motor
    rpm_gauge = ring(pos=vector(-10, 5, 0), axis=vector(0, 0, 1), radius=1.5, thickness=0.2, color=color.gray(0.5))
    rpm_needle = arrow(pos=rpm_gauge.pos, axis=vector(0, 1.5, 0), shaftwidth=0.1, color=color.red)
    label(pos=rpm_gauge.pos + vector(0, 0, 0.5), text="Motor RPM", height=12, box=False, color=color.white)


    # ----------------------------------------
    # Tuberías Hidráulicas (mayor detalle)
    # ----------------------------------------
    # Línea de baja presión del tanque a la bomba
    low_pressure_in = curve(color=vector(0.5, 0.5, 1), radius=0.08,
                            pos=[tank.pos + vector(0, 0.75, 0.5),
                                 tank.pos + vector(0, 0.75, 1.5),
                                 pump_body.pos + vector(-1, 0, 1.5),
                                 pump_body.pos + vector(-1, 0, 0.2)])

    # Línea de alta presión de la bomba a la válvula
    pump_to_valve = curve(color=color.red, radius=0.1,
                          pos=[pump_body.pos + vector(-0.2, 0.2, -0.8), # Salida de bomba
                               pump_body.pos + vector(-0.2, 1, -0.8),
                               vector(-1, 1, -0.8),
                               valve_body.pos + vector(-0.75, 0.4, 0)]) # Entrada de válvula

    # Línea de la válvula al HFW (carga)
    valve_to_hfw_charge = curve(color=color.red, radius=0.1,
                                pos=[valve_body.pos + vector(0.75, 0.4, 0), # Salida de válvula
                                     vector(2, 0.4, 0),
                                     vector(2, 1, 0),
                                     hfw_housing.pos + vector(-1.5, 0.5, 0)]) # Entrada HFW
    
    # Línea del HFW de vuelta a la válvula (descarga)
    hfw_to_valve_discharge = curve(color=color.blue, radius=0.1,
                                   pos=[hfw_housing.pos + vector(-1.5, 1.5, 0), # Salida HFW
                                        vector(2, 1.5, 0),
                                        vector(2, 0.4, -0.5),
                                        valve_body.pos + vector(0, 0.4, -0.4)]) # Entrada de válvula
    
    # Línea de la válvula al acumulador
    valve_to_accumulator = curve(color=vector(0.8, 0.4, 0), radius=0.1,
                                 pos=[valve_body.pos + vector(0, -0.4, 0.4), # Salida de válvula
                                      vector(0, -1, 0.4),
                                      vector(0, 3.5, 0.4),
                                      accumulator.pos + vector(-1.25, 0, 0)]) # Entrada de acumulador
    
    # Línea de retorno de baja presión al tanque
    return_to_tank = curve(color=vector(0.5, 0.5, 1), radius=0.08,
                           pos=[valve_body.pos + vector(-0.75, -0.4, 0), # Salida de válvula (retorno)
                                vector(-2, -0.4, 0),
                                vector(-2, -3, 0),
                                tank.pos + vector(0, -0.75, 0)]) # Entrada al tanque

    # Agrupar objetos que rotan juntos
    hfw_group = compound([hfw_disk, hfw_shaft], origin=hfw_disk.pos)
    mfw_group = compound([mfw_body, mfw_shaft], origin=mfw_body.pos)

    return {
        "hfw_group": hfw_group,
        "mfw_group": mfw_group,
        "high_pressure_line_pump_to_valve": pump_to_valve,
        "high_pressure_line_valve_to_hfw": valve_to_hfw_charge,
        "low_pressure_line_hfw_to_valve": hfw_to_valve_discharge,
        "valve_to_accumulator_line": valve_to_accumulator,
        "rpm_needle": rpm_needle,
        "valve_body": valve_body # Para cambiar color
    }

def crear_graficas():
    """Crea las gráficas de VPython.
    Retorna un diccionario con las curvas que necesitan ser actualizadas.
    """
    graph_energy = graph(title="Energía Almacenada (HFW) vs Tiempo", 
                         xtitle="Tiempo (s)", ytitle="Energía (kJ)",
                         width=550, height=280, align='right', background=vector(0.2,0.2,0.2), foreground=color.white)
    energy_curve = gcurve(color=color.yellow, width=2)

    graph_speed = graph(title="Velocidad Angular (HFW) vs Tiempo", 
                        xtitle="Tiempo (s)", ytitle="ω (rad/s)",
                        width=550, height=280, align='right', background=vector(0.2,0.2,0.2), foreground=color.white)
    speed_curve = gcurve(color=color.cyan, width=2)
    
    return {
        "energy_curve": energy_curve,
        "speed_curve": speed_curve
    }

def crear_controles_ui(callbacks):
    """Crea los botones, menús y texto de información."""
    scene.append_to_caption("\n\n")
    button(text="Iniciar/Pausar Simulación", bind=callbacks['toggle'])
    scene.append_to_caption("   ")
    button(text="Reiniciar Sistema", bind=callbacks['reset'])
    scene.append_to_caption("\n\n")

    scene.append_to_caption("Modo de Operación: ")
    mode_menu = menu(choices=["Carga (Acumular Energía)", "Descarga (Liberar Energía)"], bind=callbacks['mode'])
    mode_menu.selected = "Carga (Acumular Energía)" # Establecer valor inicial

    scene.append_to_caption("\n\n")
    
    # ***** LÍNEA CORREGIDA *****
    info_text_display = wtext(text="Simulación en pausa. Seleccione modo y presione 'Iniciar'.", color=color.gray(0.7))
    
    return {
        "info_text": info_text_display
    }

## ----------------------------------------
## 4. Funciones de Callback y Actualización
## ----------------------------------------

# --- Callbacks de UI (Modifican el estado) ---

def toggle_simulation_cb(system_state):
    """Callback para el botón Iniciar/Pausar."""
    system_state.running = not system_state.running

def reset_simulation_cb(system_state, graphs):
    """Callback para el botón Reiniciar."""
    system_state.reset()
    graphs['energy_curve'].data = []
    graphs['speed_curve'].data = []

def select_mode_cb(menu_obj, system_state):
    """Callback para el menú desplegable de modo."""
    system_state.mode = 'charging' if "Carga" in menu_obj.selected else 'discharging'

# --- Funciones de Actualización (Leen el estado) ---

def format_info_text(system_state):
    """Genera el string de estado formateado."""
    hfw_rpm = (system_state.hfw_omega_rad_s * 60) / (2 * math.pi)
    pressure_bar = system_state.pressure_pa / 1e5
    power_kw = (system_state.pressure_pa * system_state.flow_rate_m3s) / 1000 # Potencia teórica
    efficiency = (system_state.stored_energy_j / system_state.max_hfw_energy_j) * 100 if system_state.max_hfw_energy_j > 0 else 0
    
    return f"""
Estado del Sistema:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Modo:             {system_state.mode.upper()}
Motor RPM:        {system_state.engine_rpm:.0f}
HFW Velocidad:    {system_state.hfw_omega_rad_s:.1f} rad/s ({hfw_rpm:.0f} RPM)
Presión Sist:     {pressure_bar:.1f} bar
Vol Acumulador:   {system_state.accumulator_fluid_vol_m3 * 1000:.1f} L
Energía HFW:      {system_state.stored_energy_j / 1000:.2f} kJ
Carga HFW:        {efficiency:.1f}%
Válvula:          {system_state.valve_state.replace('_', ' ').title()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

def actualizar_visuales(system_state, models, graphs, ui_elements):
    """Actualiza los elementos visuales (3D, gráficos, texto) según el estado."""
    
    # 1. Rotación de volantes
    rotation_angle = system_state.hfw_omega_rad_s * SIM_DT
    models['hfw_group'].rotate(angle=rotation_angle, axis=vector(0, 1, 0))
    models['mfw_group'].rotate(angle=rotation_angle, axis=vector(0, 1, 0))

    # 2. Color de líneas hidráulicas (simulando presión)
    pressure_ratio = (system_state.pressure_pa - system_state.precharge_pressure) / (system_state.max_pressure - system_state.precharge_pressure) if (system_state.max_pressure - system_state.precharge_pressure) > 0 else 0
    
    active_color = vector(pressure_ratio, 0, 1 - pressure_ratio) # Rojo para alta presión, azul para baja
    neutral_color = color.gray(0.3)

    models['high_pressure_line_pump_to_valve'].color = active_color if system_state.valve_state == "pump_to_hfw" else neutral_color
    models['high_pressure_line_valve_to_hfw'].color = active_color if system_state.valve_state == "pump_to_hfw" else neutral_color
    models['low_pressure_line_hfw_to_valve'].color = active_color if system_state.valve_state == "hfw_to_motor" else neutral_color
    models['valve_to_accumulator_line'].color = active_color # Acumulador siempre activo con presión
    
    # Color de la válvula
    if system_state.valve_state == "pump_to_hfw":
        models['valve_body'].color = color.green # Verde cuando carga
    elif system_state.valve_state == "hfw_to_motor":
        models['valve_body'].color = color.red # Rojo cuando descarga
    else:
        models['valve_body'].color = color.orange # Naranja en neutral
        
    # 3. Indicador de RPM
    # Mapear RPM a un ángulo de 0 a -2*pi (para girar en sentido horario)
    rpm_ratio = system_state.engine_rpm / ENGINE_RPM_MAX
    target_angle = -(2 * math.pi) * rpm_ratio
    
    # Rotar la aguja desde el vector inicial (0, 1.5, 0)
    models['rpm_needle'].axis = vector(math.sin(target_angle) * 1.5, math.cos(target_angle) * 1.5, 0)
    
    # 4. Gráficas
    graphs['energy_curve'].plot(system_state.time_s, system_state.stored_energy_j / 1000) # en kJ
    graphs['speed_curve'].plot(system_state.time_s, system_state.hfw_omega_rad_s)
    
    # 5. Texto de información
    if system_state.running:
        ui_elements['info_text'].text = format_info_text(system_state)
    else:
        ui_elements['info_text'].text = "\nSimulación en pausa."

## ----------------------------------------
## 5. Función Principal y Ejecución
## ----------------------------------------

def main():
    """Función principal para inicializar y correr la simulación."""
    
    # 1. Configurar la escena
    setup_scene()
    
    # 2. Inicializar el estado del sistema
    system_state = HydraulicFlywheelSystem()

    # 3. Crear elementos visuales
    models = crear_modelos_3d()
    graphs = crear_graficas()
    
    # 4. Configurar callbacks de UI
    callbacks = {
        'toggle': lambda: toggle_simulation_cb(system_state),
        'reset': lambda: reset_simulation_cb(system_state, graphs),
        'mode': lambda m: select_mode_cb(m, system_state)
    }
    ui_elements = crear_controles_ui(callbacks)

    # 5. Bucle principal de simulación
    while True:
        rate(SIM_RATE)
        
        # Actualizar la física (solo si está corriendo)
        system_state.update_state(SIM_DT)
        
        # Actualizar los visuales (siempre, para mostrar texto "pausado")
        actualizar_visuales(system_state, models, graphs, ui_elements)

# Punto de entrada estándar de Python
if __name__ == "__main__":
    main()