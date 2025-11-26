from vpython import *  # Importa todas las clases y funciones de la biblioteca VPython para visualización 3D
import math  # Importa el módulo math para operaciones matemáticas como pi, seno, coseno, etc.

## ----------------------------------------
## 1. Constantes y Parámetros Globales
## ----------------------------------------
# Parámetros físicos (ajustados para reflejar un sistema más grande)
HFW_INERTIA_KGM2 = 1.0            # Momento de inercia del volante hidráulico en kg·m² (determina resistencia a cambios de velocidad angular)
MFW_INERTIA_KGM2 = 0.8            # Momento de inercia del volante mecánico en kg·m² (menor que el hidráulico)
ENGINE_RPM_MAX = 2200             # Velocidad máxima del motor en revoluciones por minuto (RPM)
PUMP_DISPLACEMENT_M3_REV = 75e-6  # Desplazamiento volumétrico de la bomba en m³/rev (75 cc por revolución)
MOTOR_DISPLACEMENT_M3_REV = 75e-6 # Desplazamiento volumétrico del motor hidráulico en m³/rev (igual que la bomba en este caso)
ACCUMULATOR_VOLUME_M3 = 0.05      # Volumen máximo del acumulador hidráulico en m³ (50 litros)
PRECHARGE_PRESSURE_PA = 10e5      # Presión de precarga del acumulador en pascales (10 bar)
MAX_PRESSURE_PA = 350e5           # Presión máxima del sistema en pascales (350 bar)
MAX_OMEGA_RAD_S = (ENGINE_RPM_MAX * 2 * math.pi) / 60 # Velocidad angular máxima en radianes/segundo (convertida desde RPM)

# Parámetros de simulación
SIM_DT = 0.05                     # Incremento de tiempo para cada paso de la simulación en segundos
SIM_RATE = 30                     # Tasa de refresco de la simulación en cuadros por segundo (fps)
CHARGE_ACCEL_OMEGA = 5.0          # Factor de aceleración angular durante la carga del volante (rad/s²)
DISCHARGE_ACCEL_OMEGA = -4.0      # Factor de desaceleración angular durante la descarga del volante (rad/s²), negativo porque desacelera
VALVE_SWITCH_TIME = 0.5           # Tiempo necesario para que la válvula cambie completamente de estado (segundos)

## ----------------------------------------
## 2. Clase de Estado del Sistema Mejorada
## ----------------------------------------
class HydraulicFlywheelSystem:
    """Almacena todo el estado y los parámetros de la simulación del sistema HFW."""
    
    def __init__(self):
        # Inicializa los parámetros físicos del sistema desde las constantes globales
        self.hfw_inertia = HFW_INERTIA_KGM2         # Momento de inercia del volante hidráulico
        self.mfw_inertia = MFW_INERTIA_KGM2         # Momento de inercia del volante mecánico
        self.pump_displacement = PUMP_DISPLACEMENT_M3_REV  # Desplazamiento de la bomba
        self.motor_displacement = MOTOR_DISPLACEMENT_M3_REV  # Desplazamiento del motor
        self.max_omega = MAX_OMEGA_RAD_S            # Velocidad angular máxima
        self.max_pressure = MAX_PRESSURE_PA         # Presión máxima permitida
        self.accumulator_volume = ACCUMULATOR_VOLUME_M3  # Volumen del acumulador
        self.precharge_pressure = PRECHARGE_PRESSURE_PA  # Presión de precarga
        
        # Pre-cálculo de energía máxima posible en el volante hidráulico (E = 1/2 * I * ω²)
        self.max_hfw_energy_j = 0.5 * self.hfw_inertia * (self.max_omega ** 2)

        # Llama a reset() para inicializar todas las variables de estado a sus valores iniciales
        self.reset()

    def reset(self):
        """Resetea el sistema a su estado inicial, estableciendo todos los valores a cero o valores por defecto."""
        self.hfw_omega_rad_s = 0.0      # Velocidad angular del volante hidráulico (rad/s), comienza en reposo
        self.mfw_omega_rad_s = 0.0      # Velocidad angular del volante mecánico (rad/s), comienza en reposo
        self.engine_rpm = 0.0           # RPM del motor, comienza apagado
        self.pressure_pa = PRECHARGE_PRESSURE_PA # Presión inicial del sistema igual a la precarga
        self.stored_energy_j = 0.0      # Energía almacenada en el volante hidráulico (Joules), inicialmente cero
        self.accumulator_fluid_vol_m3 = 0.0 # Volumen de fluido en el acumulador, inicialmente vacío
        self.flow_rate_m3s = 0.0        # Tasa de flujo volumétrico actual en m³/s, inicialmente cero
        
        self.time_s = 0.0               # Tiempo de simulación transcurrido (s), comienza en cero
        self.mode = "charging"          # Modo inicial: cargando energía (alternativa: "discharging")
        self.running = False            # La simulación comienza pausada
        self.valve_state = "neutral"    # Estado inicial de la válvula: neutral (ni cargando ni descargando)
        self.valve_transition_timer = 0.0 # Contador para simular transición gradual de la válvula

    def update_state(self, dt):
        """Calcula la física del siguiente paso de tiempo para actualizar el estado del sistema."""
        if not self.running:
            # Si la simulación está pausada, aseguramos que no haya flujo
            self.flow_rate_m3s = 0.0  
            return  # Sale de la función sin actualizar nada más

        # Control de RPM del motor según el modo de operación
        if self.mode == "charging":
            self.engine_rpm = ENGINE_RPM_MAX * 0.8  # En modo carga, motor opera al 80% de su capacidad
        else:
            self.engine_rpm = 0.0  # En modo descarga, el motor está apagado (usamos la energía almacenada)
            
        # Acopla la velocidad del volante mecánico a la del volante hidráulico (simplificación)
        self.mfw_omega_rad_s = self.hfw_omega_rad_s 

        # Determina el estado objetivo de la válvula basado en el modo de operación
        target_valve_state = "neutral"  # Estado por defecto
        if self.mode == "charging":
            target_valve_state = "pump_to_hfw"  # Si estamos cargando, queremos flujo de la bomba al volante
        elif self.mode == "discharging":
            target_valve_state = "hfw_to_motor"  # Si estamos descargando, queremos flujo del volante al motor
        
        # Simula la transición suave de la válvula (no cambia instantáneamente)
        if self.valve_state != target_valve_state:
            self.valve_transition_timer += dt  # Aumenta el temporizador de transición
            if self.valve_transition_timer >= VALVE_SWITCH_TIME:  # Si ha pasado suficiente tiempo
                self.valve_state = target_valve_state  # Cambia al estado objetivo
                self.valve_transition_timer = 0.0  # Reinicia el temporizador
        else:
            self.valve_transition_timer = 0.0  # Si ya estamos en el estado objetivo, mantiene el temporizador en cero

        # Inicializa el flujo a cero en cada ciclo antes de calcular
        self.flow_rate_m3s = 0.0
        
        # Lógica para el modo de carga: bomba -> volante hidráulico
        if self.valve_state == "pump_to_hfw":  
            if self.hfw_omega_rad_s < self.max_omega:  # Si no ha llegado a velocidad máxima
                # Calcula el flujo basado en el desplazamiento de la bomba y las RPM del motor
                self.flow_rate_m3s = self.pump_displacement * (self.engine_rpm / 60)
                # Incrementa la velocidad angular del volante hidráulico (limitada al máximo)
                self.hfw_omega_rad_s = min(self.hfw_omega_rad_s + CHARGE_ACCEL_OMEGA * dt, self.max_omega)
            else:
                # Si el volante está a velocidad máxima, lo mantiene constante y detiene el flujo
                self.hfw_omega_rad_s = self.max_omega
                self.flow_rate_m3s = 0  # No hay más flujo cuando está totalmente cargado

        # Lógica para el modo de descarga: volante hidráulico -> motor hidráulico
        elif self.valve_state == "hfw_to_motor":  
            if self.hfw_omega_rad_s > 0:  # Si el volante aún tiene energía (está girando)
                # El volante actúa como bomba, generando flujo proporcional a su velocidad
                self.flow_rate_m3s = self.motor_displacement * (self.hfw_omega_rad_s / (2 * math.pi))
                # Reduce la velocidad angular (efecto de frenado)
                self.hfw_omega_rad_s = max(self.hfw_omega_rad_s + DISCHARGE_ACCEL_OMEGA * dt, 0.0)
            else:
                # Si el volante está detenido, no hay más flujo ni energía disponible
                self.hfw_omega_rad_s = 0.0
                self.flow_rate_m3s = 0

        # Actualiza el volumen de fluido en el acumulador según el flujo y el modo
        # En carga: el acumulador recibe fluido; en descarga: libera fluido
        self.accumulator_fluid_vol_m3 += (self.flow_rate_m3s if self.mode == "charging" else -self.flow_rate_m3s) * dt
        # Limita el volumen al rango válido [0, capacidad máxima]
        self.accumulator_fluid_vol_m3 = max(0, min(self.accumulator_fluid_vol_m3, self.accumulator_volume))
        
        # Calcula la presión del sistema basada en el volumen de fluido en el acumulador
        if self.accumulator_fluid_vol_m3 > 0:
             # Relación lineal simplificada entre volumen y presión (una aproximación)
             self.pressure_pa = self.precharge_pressure + (self.accumulator_fluid_vol_m3 / self.accumulator_volume) * (self.max_pressure - self.precharge_pressure)
        else:
             # Si no hay fluido, la presión es la mínima (precarga)
             self.pressure_pa = self.precharge_pressure

        # Limita la presión al rango permitido [precarga, máxima]
        self.pressure_pa = max(self.precharge_pressure, min(self.pressure_pa, self.max_pressure))

        # Calcula la energía cinética almacenada en el volante (E = 1/2 * I * ω²)
        self.stored_energy_j = 0.5 * self.hfw_inertia * (self.hfw_omega_rad_s ** 2)
        
        # Incrementa el contador de tiempo de la simulación
        self.time_s += dt

## ----------------------------------------
## 3. Funciones de Configuración de la Escena
## ----------------------------------------

def setup_scene():
    """Configura las propiedades iniciales de la ventana y escena de VPython."""
    scene.title = "Sistema HFW Mejorado - Visión General"  # Título de la ventana
    scene.width = 1200   # Ancho de la ventana en píxeles
    scene.height = 800   # Alto de la ventana en píxeles
    scene.background = vector(0.1, 0.1, 0.15)  # Color de fondo oscuro (RGB)
    scene.caption = "\n\nParámetros del Sistema:"  # Texto debajo de la escena
    scene.forward = vector(-1, -0.5, -1)  # Dirección inicial de la cámara
    scene.camera.pos = vector(0, 5, 15)   # Posición inicial de la cámara
    scene.camera.axis = vector(0, -2, -10)  # Hacia dónde mira la cámara
    
def crear_modelos_3d():
    """Crea y posiciona todos los objetos 3D que componen el sistema en la escena.
    Retorna un diccionario con referencias a los objetos que necesitarán actualizarse.
    """
    # ----------------------------------------
    # Bloque Motor/Transmisión Principal
    # ----------------------------------------
    # Crea el bloque principal del motor (un paralelepípedo gris)
    engine_block = box(pos=vector(-8, -2, 0), size=vector(2.5, 1.5, 2), color=vector(0.5, 0.5, 0.5))
    # Crea la culata del motor (parte superior del motor)
    engine_head = box(pos=vector(-8, -1, 0.5), size=vector(2.5, 0.5, 1), color=vector(0.6, 0.6, 0.6))
    # Añade una etiqueta de texto sobre el motor
    label(pos=engine_block.pos + vector(0, 1.5, 0), text="Motor Principal", height=12, box=False, color=color.white)
    
    # Crea la caja de transmisión (conecta el motor con el sistema hidráulico)
    transmission_case = box(pos=vector(-5.5, -2, 0), size=vector(2, 1.5, 2), color=vector(0.4, 0.4, 0.4))
    label(pos=transmission_case.pos + vector(0, 1.5, 0), text="Transmisión", height=12, box=False, color=color.white)

    # Volante Mecánico (MFW) - Parte de la transmisión que almacena energía mecánicamente
    mfw_body = cylinder(pos=vector(-5, -2.5, -1), axis=vector(0, 0.5, 0), radius=0.8, color=vector(0.2, 0.8, 0.2))
    mfw_shaft = cylinder(pos=vector(-5, -2.25, -1), axis=vector(0, 0.5, 0), radius=0.1, color=vector(0.3, 0.3, 0.3))
    label(pos=mfw_body.pos + vector(0, -1.2, 0), text="Volante Mecánico", height=10, box=False, color=color.white)
    
    # Bomba hidráulica - Convierte energía mecánica en presión hidráulica
    pump_body = cylinder(pos=vector(-4, -0.5, 0.8), axis=vector(0.8, 0, 0), radius=0.5, color=color.blue)
    pump_shaft = cylinder(pos=pump_body.pos + vector(0.8, 0, 0), axis=vector(0.3, 0, 0), radius=0.1, color=vector(0.3, 0.3, 0.3))
    label(pos=pump_body.pos + vector(1.5, 0, 0), text="Bomba/Motor VG", height=10, box=False, color=color.white)

    # ----------------------------------------
    # Bloque Volante Hidráulico (HFW)
    # ----------------------------------------
    # Carcasa del sistema de volante hidráulico
    hfw_housing = box(pos=vector(4, 1, 0), size=vector(3, 2, 2.5), color=vector(0.2, 0.2, 0.3))
    # Disco del volante hidráulico (parte giratoria que almacena energía)
    hfw_disk = cylinder(pos=vector(4, 1, 0), axis=vector(0, 0.5, 0), radius=1.0, color=vector(0.0, 0.7, 0.9))
    # Eje del volante hidráulico
    hfw_shaft = cylinder(pos=vector(4, 1.25, 0), axis=vector(0, 0.7, 0), radius=0.15, color=vector(0.3, 0.3, 0.3))
    label(pos=hfw_housing.pos + vector(0, 2, 0), text="Volante Hidráulico (HFW)", height=12, box=False, color=color.white)

    # ----------------------------------------
    # Acumulador Hidráulico - Almacena fluido bajo presión
    # ----------------------------------------
    accumulator = cylinder(pos=vector(0, 4, -1), axis=vector(2.5, 0, 0), radius=0.6, color=color.red, opacity=0.8)
    label(pos=accumulator.pos + vector(0, 1.0, 0), text="Acumulador Hidráulico", height=10, box=False, color=color.white)

    # ----------------------------------------
    # Tanque de Aceite - Reservorio a baja presión
    # ----------------------------------------
    tank = box(pos=vector(-8, -4, 0), size=vector(2.5, 1.5, 2), color=vector(0.7, 0.7, 0.7))
    label(pos=tank.pos + vector(0, 1.2, 0), text="Tanque\n(Baja Presión)", height=10, box=False, color=color.white)

    # ----------------------------------------
    # Válvula de Control - Dirige el flujo hidráulico a diferentes partes del sistema
    # ----------------------------------------
    valve_body = box(pos=vector(0, 0, 0.5), size=vector(1.5, 0.8, 0.8), color=color.orange)
    label(pos=valve_body.pos + vector(0, 1, 0), text="Válvula de Control", height=10, box=False, color=color.white)
    
    # Indicador de RPM del motor - Muestra gráficamente la velocidad del motor
    rpm_gauge = ring(pos=vector(-10, 5, 0), axis=vector(0, 0, 1), radius=1.5, thickness=0.2, color=color.gray(0.5))
    rpm_needle = arrow(pos=rpm_gauge.pos, axis=vector(0, 1.5, 0), shaftwidth=0.1, color=color.red)
    label(pos=rpm_gauge.pos + vector(0, 0, 0.5), text="Motor RPM", height=12, box=False, color=color.white)

    # ----------------------------------------
    # Tuberías Hidráulicas - Conectan los componentes y muestran el flujo
    # ----------------------------------------
    # Línea de baja presión del tanque a la bomba (succión)
    low_pressure_in = curve(color=vector(0.5, 0.5, 1), radius=0.08,
                            pos=[tank.pos + vector(0, 0.75, 0.5),
                                 tank.pos + vector(0, 0.75, 1.5),
                                 pump_body.pos + vector(-1, 0, 1.5),
                                 pump_body.pos + vector(-1, 0, 0.2)])

    # Línea de alta presión de la bomba a la válvula (presión generada)
    pump_to_valve = curve(color=color.red, radius=0.1,
                          pos=[pump_body.pos + vector(-0.2, 0.2, -0.8),
                               pump_body.pos + vector(-0.2, 1, -0.8),
                               vector(-1, 1, -0.8),
                               valve_body.pos + vector(-0.75, 0.4, 0)])

    # Línea de la válvula al HFW para carga (envía presión al volante)
    valve_to_hfw_charge = curve(color=color.red, radius=0.1,
                                pos=[valve_body.pos + vector(0.75, 0.4, 0),
                                     vector(2, 0.4, 0),
                                     vector(2, 1, 0),
                                     hfw_housing.pos + vector(-1.5, 0.5, 0)])
    
    # Línea del HFW de vuelta a la válvula para descarga (retorna presión para uso)
    hfw_to_valve_discharge = curve(color=color.blue, radius=0.1,
                                   pos=[hfw_housing.pos + vector(-1.5, 1.5, 0),
                                        vector(2, 1.5, 0),
                                        vector(2, 0.4, -0.5),
                                        valve_body.pos + vector(0, 0.4, -0.4)])
    
    # Línea de la válvula al acumulador (almacenamiento de presión)
    valve_to_accumulator = curve(color=vector(0.8, 0.4, 0), radius=0.1,
                                 pos=[valve_body.pos + vector(0, -0.4, 0.4),
                                      vector(0, -1, 0.4),
                                      vector(0, 3.5, 0.4),
                                      accumulator.pos + vector(-1.25, 0, 0)])
    
    # Línea de retorno de baja presión al tanque (retorno del fluido usado)
    return_to_tank = curve(color=vector(0.5, 0.5, 1), radius=0.08,
                           pos=[valve_body.pos + vector(-0.75, -0.4, 0),
                                vector(-2, -0.4, 0),
                                vector(-2, -3, 0),
                                tank.pos + vector(0, -0.75, 0)])

    # Agrupar objetos que rotan juntos para facilitar la animación
    # El grupo HFW incluye el disco y el eje, rotando como una unidad
    hfw_group = compound([hfw_disk, hfw_shaft], origin=hfw_disk.pos)
    # El grupo MFW incluye el cuerpo y eje del volante mecánico
    mfw_group = compound([mfw_body, mfw_shaft], origin=mfw_body.pos)

    # Retorna un diccionario con las referencias a objetos que necesitarán actualizarse
    return {
        "hfw_group": hfw_group,
        "mfw_group": mfw_group,
        "high_pressure_line_pump_to_valve": pump_to_valve,
        "high_pressure_line_valve_to_hfw": valve_to_hfw_charge,
        "low_pressure_line_hfw_to_valve": hfw_to_valve_discharge,
        "valve_to_accumulator_line": valve_to_accumulator,
        "rpm_needle": rpm_needle,
        "valve_body": valve_body
    }

def crear_graficas():
    """Crea las gráficas para mostrar la evolución de variables clave del sistema en tiempo real.
    Retorna un diccionario con las curvas que se actualizarán durante la simulación.
    """
    # Gráfica para mostrar la energía almacenada en el volante hidráulico
    graph_energy = graph(title="Energía Almacenada (HFW) vs Tiempo", 
                         xtitle="Tiempo (s)", ytitle="Energía (kJ)",
                         width=550, height=280, align='right', background=vector(0.2,0.2,0.2), foreground=color.white)
    energy_curve = gcurve(color=color.yellow, width=2)  # Curva para trazar la energía

    # Gráfica para mostrar la velocidad angular del volante hidráulico
    graph_speed = graph(title="Velocidad Angular (HFW) vs Tiempo", 
                        xtitle="Tiempo (s)", ytitle="ω (rad/s)",
                        width=550, height=280, align='right', background=vector(0.2,0.2,0.2), foreground=color.white)
    speed_curve = gcurve(color=color.cyan, width=2)  # Curva para trazar la velocidad angular
    
    # Retorna un diccionario con referencias a las curvas para actualizarlas más tarde
    return {
        "energy_curve": energy_curve,
        "speed_curve": speed_curve
    }

# Variables globales para acceder al estado del sistema y las gráficas desde cualquier función
system_state = None  # Almacenará la instancia del sistema hidráulico
graphs = None  # Almacenará las referencias a las gráficas

def toggle_simulation_cb():
    """Callback para el botón Iniciar/Pausar. Alterna el estado de ejecución de la simulación."""
    global system_state  # Accede a la variable global
    system_state.running = not system_state.running  # Invierte el estado (si está corriendo la pausa, si está pausada la inicia)

def reset_simulation_cb():
    """Callback para el botón Reiniciar. Restablece el sistema a su estado inicial y limpia las gráficas."""
    global system_state, graphs  # Accede a variables globales
    system_state.reset()  # Llama al método reset del sistema
    graphs['energy_curve'].data = []  # Borra todos los puntos de la gráfica de energía
    graphs['speed_curve'].data = []   # Borra todos los puntos de la gráfica de velocidad

def select_mode_cb(menu_obj):
    """Callback para el menú desplegable de modo. Cambia entre los modos de carga y descarga."""
    global system_state  # Accede a la variable global
    system_state.mode = 'charging' if "Carga" in menu_obj.selected else 'discharging'  # Establece el modo según la selección

def crear_controles_ui():
    """Crea los controles interactivos (botones, menús) para manipular la simulación.
    Retorna un diccionario con referencias a elementos que necesitarán actualizarse.
    """
    scene.append_to_caption("\n\n")  # Añade espacio vertical
    # Botón para iniciar/pausar la simulación
    button(text="Iniciar/Pausar Simulación", bind=toggle_simulation_cb)
    scene.append_to_caption("   ")  # Espacio horizontal entre botones
    # Botón para reiniciar la simulación
    button(text="Reiniciar Sistema", bind=reset_simulation_cb)
    scene.append_to_caption("\n\n")  # Más espacio vertical

    # Menú desplegable para seleccionar el modo de operación
    scene.append_to_caption("Modo de Operación: ")
    mode_menu = menu(choices=["Carga (Acumular Energía)", "Descarga (Liberar Energía)"], bind=select_mode_cb)
    mode_menu.selected = "Carga (Acumular Energía)"  # Opción predeterminada

    scene.append_to_caption("\n\n")  # Más espacio vertical
    # Área de texto para mostrar información del sistema
    info_text_display = wtext(text="Simulación en pausa. Seleccione modo y presione 'Iniciar'.", color=color.gray(0.7))
    
    # Retorna referencias a elementos que necesitarán actualizarse
    return {
        "info_text": info_text_display  # El texto informativo se actualizará con el estado del sistema
    }

def format_info_text(system_state):
    """Genera un string formateado con el estado actual del sistema para mostrar en la interfaz.
    Calcula valores derivados como RPM, presión en bar, potencia, y eficiencia.
    """
    # Conversión de rad/s a RPM para el volante hidráulico
    hfw_rpm = (system_state.hfw_omega_rad_s * 60) / (2 * math.pi)
    # Conversión de pascales a bar para presión (más legible)
    pressure_bar = system_state.pressure_pa / 1e5
    # Cálculo de potencia teórica (presión × caudal)
    power_kw = (system_state.pressure_pa * system_state.flow_rate_m3s) / 1000
    # Porcentaje de carga del volante (energía actual / energía máxima)
    efficiency = (system_state.stored_energy_j / system_state.max_hfw_energy_j) * 100 if system_state.max_hfw_energy_j > 0 else 0
    
    # Retorna texto formateado con valores actuales
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
Flujo:            {system_state.flow_rate_m3s * 1000:.2f} L/s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

def actualizar_visuales(system_state, models, graphs, ui_elements):
    """Actualiza todos los elementos visuales de la escena según el estado actual del sistema."""
    
    # 1. Rotación de volantes basada en su velocidad angular actual
    rotation_angle = system_state.hfw_omega_rad_s * SIM_DT  # Ángulo de rotación en este paso
    models['hfw_group'].rotate(angle=rotation_angle, axis=vector(0, 1, 0))  # Rota el volante hidráulico
    models['mfw_group'].rotate(angle=rotation_angle, axis=vector(0, 1, 0))  # Rota el volante mecánico

    # 2. Actualización de colores de las líneas hidráulicas según la presión
    # Calcula un ratio de presión (0 a 1) para determinar el color
    pressure_ratio = (system_state.pressure_pa - system_state.precharge_pressure) / (system_state.max_pressure - system_state.precharge_pressure) if (system_state.max_pressure - system_state.precharge_pressure) > 0 else 0
    
    # Color que varía del azul (baja presión) al rojo (alta presión)
    active_color = vector(pressure_ratio, 0, 1 - pressure_ratio)
    neutral_color = color.gray(0.3)  # Color para líneas inactivas

    # Actualiza colores de las líneas según estado de la válvula (activas/inactivas)
    models['high_pressure_line_pump_to_valve'].color = active_color if system_state.valve_state == "pump_to_hfw" else neutral_color
    models['high_pressure_line_valve_to_hfw'].color = active_color if system_state.valve_state == "pump_to_hfw" else neutral_color
    models['low_pressure_line_hfw_to_valve'].color = active_color if system_state.valve_state == "hfw_to_motor" else neutral_color
    models['valve_to_accumulator_line'].color = active_color  # Siempre activa
    
    # Actualiza color de la válvula según su estado
    if system_state.valve_state == "pump_to_hfw":
        models['valve_body'].color = color.green  # Verde para carga
    elif system_state.valve_state == "hfw_to_motor":
        models['valve_body'].color = color.red    # Rojo para descarga
    else:
        models['valve_body'].color = color.orange  # Naranja para neutral
        
    # 3. Actualiza el indicador de RPM del motor
    rpm_ratio = system_state.engine_rpm / ENGINE_RPM_MAX if ENGINE_RPM_MAX > 0 else 0
    target_angle = -(2 * math.pi) * rpm_ratio  # Convierte el ratio a ángulo
    
    # Posiciona la aguja del indicador según el ángulo calculado
    models['rpm_needle'].axis = vector(math.sin(target_angle) * 1.5, math.cos(target_angle) * 1.5, 0)
    
    # 4. Actualiza las gráficas con nuevos datos
    graphs['energy_curve'].plot(system_state.time_s, system_state.stored_energy_j / 1000)  # Energía en kJ
    graphs['speed_curve'].plot(system_state.time_s, system_state.hfw_omega_rad_s)  # Velocidad angular
    
    # 5. Actualiza el texto informativo
    if system_state.running:
        ui_elements['info_text'].text = format_info_text(system_state)  # Muestra estado detallado
    else:
        ui_elements['info_text'].text = "\nSimulación en pausa."  # Mensaje de pausa

def main():
    """Función principal para inicializar y ejecutar la simulación."""
    global system_state, graphs  # Declara uso de variables globales
    
    # 1. Configura la escena visual (ventana, cámara)
    setup_scene()
    
    # 2. Inicializa el objeto que maneja el estado del sistema
    system_state = HydraulicFlywheelSystem()

    # 3. Crea todos los elementos visuales necesarios
    models = crear_modelos_3d()  # Componentes 3D
    graphs = crear_graficas()    # Gráficas de seguimiento
    ui_elements = crear_controles_ui()  # Controles interactivos

    # 4. Bucle principal de simulación (ejecuta indefinidamente)
    while True:
        rate(SIM_RATE)  # Limita la velocidad de ejecución al valor definido en SIM_RATE
        
        # Actualiza la física del sistema (solo si está en modo "running")
        system_state.update_state(SIM_DT)
        
        # Actualiza todos los elementos visuales según el estado actual
        actualizar_visuales(system_state, models, graphs, ui_elements)

# Punto de entrada cuando se ejecuta el script directamente
if __name__ == "__main__":
    main()  # Llama a la función principal para comenzar la simulación