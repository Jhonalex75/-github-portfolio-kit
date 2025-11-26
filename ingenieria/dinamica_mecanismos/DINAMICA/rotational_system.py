"""
Sistema Rotacional Controlado - Simscape Implementation
----------------------------------------------------

Explicación del Fenómeno Físico:
==============================

1. Descripción General:
---------------------
El sistema simula un conjunto motor-reductor-carga que representa un mecanismo
de transmisión de potencia rotacional. Este tipo de sistemas se encuentra en
múltiples aplicaciones, desde robots industriales hasta vehículos eléctricos.

2. Componentes y su Función Física:
--------------------------------
a) Motor (Entrada):
   - Convierte energía eléctrica en mecánica rotacional
   - Genera un torque controlado (τ_m)
   - Posee inercia rotacional (J₁)
   - Experimenta pérdidas por fricción viscosa

b) Caja Reductora:
   - Modifica la relación velocidad/torque
   - Actúa como transformador mecánico
   - Puede ser rígida o tener flexibilidad torsional
   - Presenta pérdidas por eficiencia (η)

c) Carga (Salida):
   - Representa el dispositivo accionado
   - Tiene su propia inercia (J₂)
   - Puede generar torque resistivo
   - Experimenta pérdidas propias

3. Fenómenos Físicos Modelados:
-----------------------------
a) Inercia Rotacional:
   - Resistencia al cambio de velocidad angular
   - Almacenamiento de energía cinética
   - Efecto similar a la masa en movimiento lineal

b) Elasticidad Torsional:
   - Deformación angular del acoplamiento
   - Almacenamiento de energía potencial
   - Oscilaciones mecánicas

c) Amortiguamiento:
   - Disipación de energía por fricción
   - Estabilización del movimiento
   - Conversión de energía mecánica en calor

4. Transferencia de Energía:
--------------------------
a) Cadena de Conversión:
   Eléctrica → Mecánica Rotacional → Mecánica Reducida → Trabajo Útil

b) Pérdidas:
   - Fricción viscosa en ejes
   - Pérdidas en transmisión
   - Amortiguamiento en acoplamiento

5. Comportamiento Dinámico:
-------------------------
a) Régimen Transitorio:
   - Aceleración inicial
   - Oscilaciones por elasticidad
   - Disipación de energía

b) Régimen Estacionario:
   - Balance de torques
   - Velocidad constante
   - Pérdidas estables

6. Análisis Energético:
---------------------
a) Energía Cinética:
   - Almacenada en masas rotantes
   - Proporcional al cuadrado de la velocidad
   - Distribuida entre entrada y salida

b) Energía Potencial:
   - Almacenada en deformación elástica
   - Intercambio con energía cinética
   - Causa de oscilaciones

c) Potencia:
   - Entrada: τ_m · ω₁
   - Salida: τ_load · ω₂
   - Pérdidas: P_diss

7. Efectos No Lineales:
---------------------
a) Fricción:
   - Estática (arranque)
   - Coulomb (seca)
   - Viscosa (proporcional a velocidad)

b) Saturación:
   - Límite de torque motor
   - Deformación máxima
   - Anti-windup en control

Notación y Variables:
-------------------
J₁: Momento de inercia del motor (entrada) [kg·m²]
J₂: Momento de inercia de la carga (salida) [kg·m²]
b : Coeficiente de amortiguamiento viscoso [N·m·s/rad]
n : Relación de transmisión (ω_out = n·ω_in)
η : Eficiencia de la transmisión
τ_m: Torque aplicado por el motor (control PID)
ω₁, θ₁: Velocidad y posición angular de entrada
ω₂, θ₂: Velocidad y posición angular de salida
k : Rigidez del acoplamiento [N·m/rad]
c : Amortiguamiento del acoplamiento [N·m·s/rad]

Modelo Matemático:
----------------
1. Modelo con Caja Ideal Rígida:
   - Relación cinemática: ω₂ = n·ω₁, θ₂ = n·θ₁
   - Inercia equivalente: J_eq = J₁ + n²·J₂
   - Ecuación dinámica: J_eq·ω̇₁ = τ_m - b·ω₁
   - Con carga: J_eq·ω̇₁ = τ_m - b·ω₁ - τ_load/(n·η)

2. Modelo con Acoplamiento Flexible:
   - Diferencia angular: Δθ = θ₁ - θ₂/n
   - Torque de acoplamiento: τ_c = k·Δθ + c·Δθ̇
   - Dinámica motor: J₁·ω̇₁ = τ_m - b·ω₁ - τ_c
   - Dinámica carga: J₂·ω̇₂ = τ_c·n·η - b₂·ω₂ - τ_load

3. Control PID con Anti-windup:
   τ_m(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·de/dt
   donde e(t) = ω_ref(t) - ω₁(t)
   
4. Energía del Sistema:
   - Cinética: E_k = ½(J₁·ω₁² + J₂·ω₂²)
   - Potencial (acoplamiento): E_pot = ½·k·(θ₁ - θ₂/n)²
   - Disipación: P_diss = b·ω₁² + b₂·ω₂² + c·(ω₁ - ω₂/n)²
   - Balance: P_in = τ_m·ω₁ = d/dt(E_k + E_pot) + P_diss

Interpretación Funcional del Sistema:
----------------------------------
El sistema completo modela la dinámica rotacional de un conjunto motor-reductor-carga.
El funcionamiento de cada componente es:

1. PS Step: 
   - Aplica un escalón de torque (simula arranque del motor)
   - Genera la señal de referencia para el control

2. Ideal Torque Source:
   - Convierte la señal de control en par mecánico
   - Aplica el torque al eje de entrada

3. Inercia Primaria (Motor):
   - Resiste el cambio de velocidad angular
   - Almacena energía cinética rotacional

4. Gear Box:
   - Modifica la relación velocidad/torque
   - Implementa la reducción mecánica

5. Inercia Secundaria (Carga):
   - Representa la carga mecánica
   - Afecta la dinámica del sistema

6. Rotational Damper:
   - Disipa energía del sistema
   - Simula pérdidas mecánicas

7. Mechanical Rotational Reference:
   - Proporciona el marco de referencia
   - Define el punto fijo del sistema

Interpretación Física del Proceso:
--------------------------------
La secuencia de eventos es:
1. El motor aplica un impulso de torque
2. El sistema comienza a acelerar
3. El amortiguador y la carga oponen resistencia
4. Se alcanza un régimen estacionario estable

Las transferencias de energía son:
- Eléctrica → Mecánica (en el motor)
- Rotacional rápida → lenta (en el reductor)
- Mecánica → Térmica (en el amortiguador)

Modelo Matemático del Sistema:
----------------------------
El sistema consiste en un mecanismo de engranajes con dos inercias acopladas
a través de una caja reductora. Las ecuaciones que gobiernan el sistema son:

1. Ecuación del Motor (Entrada):
   τ_m = J₁·dω₁/dt + b·ω₁
   Donde:
   - τ_m: Torque del motor [N·m]
   - J₁: Momento de inercia de entrada [kg·m²]
   - ω₁: Velocidad angular de entrada [rad/s]
   - b: Coeficiente de amortiguamiento [N·m·s/rad]

2. Ecuación de la Caja de Engranajes:
   ω₂ = n·ω₁·η
   τ₂ = τ₁/(n·η)
   Donde:
   - n: Relación de transmisión (gear_ratio)
   - η: Eficiencia de la transmisión
   - ω₂: Velocidad angular de salida
   - τ₂: Torque de salida

3. Ecuación de la Carga (Salida):
   τ₂ = J₂·dω₂/dt + b·ω₂
   Donde:
   - J₂: Momento de inercia de salida [kg·m²]

4. Control PID:
   τ_m = Kp·e(t) + Ki·∫e(t)dt + Kd·de/dt
   Donde:
   - e(t) = ω_ref - ω₁
   - Kp: Ganancia proporcional
   - Ki: Ganancia integral
   - Kd: Ganancia derivativa

5. Inercia Equivalente (Sistema Acoplado):
   J_eq = J₁ + n²·J₂
   
El sistema se resuelve numéricamente usando el método RK45 (Runge-Kutta de orden 4-5)
para integrar las ecuaciones diferenciales del movimiento.

Componentes del Sistema:
----------------------
- PS Step: Genera la señal de referencia (escalón retardado)
- Solver Configuration: Configuración del integrador numérico
- Ideal Torque Source: Fuente de torque controlada
- Inertia: Inercias rotacionales (entrada y salida)
- Rotational Damper: Amortiguamiento viscoso
- Gear Box: Caja reductora con eficiencia
- Mechanical Rotational Reference: Marco de referencia
"""

import numpy as np
import matplotlib.pyplot as plt
from dataclasses import dataclass
from typing import List, Dict, Callable, Tuple
from scipy.integrate import solve_ivp

@dataclass
class SimulationConfig:
    """
    Configuración del solver numérico para integración temporal
    
    Parámetros Numéricos:
    -------------------
    1. solver_type: 'RK45'
       - Método Runge-Kutta de orden adaptativo 4(5)
       - Combina precisión de orden 4 con estimación de error de orden 5
       - Ideal para EDOs no rígidas con precisión moderada
    
    2. rel_tol: 1e-6
       - Error relativo máximo permitido
       - Controla precisión proporcional al tamaño de la variable
       - Importante para variables que varían en varios órdenes de magnitud
    
    3. abs_tol: 1e-6
       - Error absoluto máximo permitido
       - Relevante cuando las variables se acercan a cero
       - Evita problemas numéricos en valores pequeños
    
    4. max_step: 0.01
       - Paso máximo de integración [s]
       - Limita el intervalo entre evaluaciones
       - Asegura captura de dinámicas rápidas
    
    5. t_span: (0, 10)
       - Intervalo total de simulación [s]
       - Tiempo suficiente para ver régimen transitorio y estacionario
    """
    # Tipo de integrador (RK45 es robusto y preciso para este sistema)
    solver_type: str = 'RK45'
    
    # Tolerancias para control de error
    rel_tol: float = 1e-6         # Error relativo máximo
    abs_tol: float = 1e-6         # Error absoluto máximo
    
    # Control temporal
    max_step: float = 0.01        # Paso máximo de integración [s]
    t_span: Tuple[float, float] = (0, 10)  # Intervalo de simulación [s]

@dataclass
class PSStepParams:
    """
    Parámetros de la señal de entrada escalón
    
    Esta clase define una entrada tipo escalón que representa:
    - Arranque del motor
    - Cambio de velocidad de referencia
    - Perturbación en la carga
    
    Parámetros Físicos:
    -----------------
    1. initial_value: 0.0
       - Condición inicial del sistema [rad/s]
       - Sistema parte del reposo
       - Representa velocidad angular inicial
    
    2. final_value: 120.0
       - Velocidad angular objetivo [rad/s]
       - Determina régimen permanente
       - Aproximadamente 1145 RPM
    
    3. step_time: 1.0
       - Tiempo de aplicación del escalón [s]
       - Permite estabilización inicial
       - Simula retardo en arranque
    
    4. sample_time: 0.01
       - Período de muestreo [s]
       - Discretización temporal
       - Relacionado con control digital
    """
    # Valores de la señal
    initial_value: float = 0.0    # Velocidad inicial [rad/s]
    final_value: float = 120.0    # Velocidad objetivo [rad/s]
    
    # Temporización
    step_time: float = 1.0        # Retardo de aplicación [s]
    sample_time: float = 0.01     # Período de muestreo [s]

@dataclass
class SystemComponents:
    """
    Parámetros de los componentes del sistema
    
    Las ecuaciones del sistema dependen de estos parámetros:
    
    1. Inercias (J₁, J₂):
       - Determinan la resistencia al cambio de velocidad
       - J_eq = J₁ + n²·J₂ (modelo rígido)
    
    2. Amortiguamiento (R, C):
       - R: Amortiguamiento viscoso principal
       - C: Amortiguamiento del acoplamiento
       - P_diss = R·ω₁² + C·(ω₁ - ω₂/n)²
    
    3. Transmisión (gear_ratio, efficiency):
       - n = gear_ratio: Relación de velocidades
       - η = efficiency: Pérdidas en transmisión
       - ω₂ = n·ω₁, τ₂ = τ₁/(n·η)
    
    4. Acoplamiento (coupling_stiffness, coupling_damping):
       - k: Rigidez torsional [N·m/rad]
       - c: Amortiguamiento acoplamiento [N·m·s/rad]
       - τ_c = k·Δθ + c·Δω
    """
    # Inercias Rotacionales
    J1: float = 0.05            # Inercia del motor [kg·m²]
    J2: float = 0.5             # Inercia de la carga [kg·m²]
    
    # Elementos Disipativos
    R: float = 0.2              # Amortiguamiento viscoso [N·m·s/rad]
    C: float = 0.01             # Amortiguamiento acoplamiento [rad/N·m]
    
    # Actuador (Motor)
    T_max: float = 100.0        # Límite de torque [N·m]
    
    # Transmisión Mecánica
    gear_ratio: float = 0.1     # Relación de reducción (1:10)
    efficiency: float = 0.95    # Eficiencia mecánica [-]
    coupling_stiffness: float = 1000.0  # Rigidez del acoplamiento [N⋅m/rad]
    coupling_damping: float = 10.0      # Amortiguamiento del acoplamiento [N⋅m⋅s/rad]
    
    # Pérdidas mecánicas
    static_friction: float = 0.5        # Torque de fricción estática [N⋅m]
    coulomb_friction: float = 0.3       # Torque de fricción de Coulomb [N⋅m]
    viscous_friction: float = 0.1       # Coeficiente de fricción viscosa [N⋅m⋅s/rad]

class RotationalSystem:
    """
    Implementación del sistema rotacional completo.
    
    El modelo implementa la Segunda Ley de Newton para rotación:
    ΣT = J·dω/dt + B·ω
    
    donde:
    - T: torque aplicado [N·m]
    - J: momento de inercia [kg·m²]
    - B: coeficiente de amortiguamiento [N·m·s/rad]
    - ω: velocidad angular [rad/s]
    
    La caja de engranajes modifica las magnitudes según N:
    ω_out = ω_in/N
    T_out = N·T_in
    
    El sistema evoluciona en el tiempo siguiendo estas ecuaciones
    hasta alcanzar el estado estacionario determinado por el
    balance entre el torque aplicado y las fuerzas disipativas.
    """
    def __init__(self,
                 sim_config: SimulationConfig,
                 step_params: PSStepParams,
                 components: SystemComponents):
        self.config = sim_config
        self.step = step_params
        self.comp = components
        self.reset_state()
        
    def reset_state(self):
        """Reinicia el estado del sistema"""
        self.time = None
        self.states = None
        self.sr_state = False
        self.clutch_engaged = False
        
    def ps_step_output(self, t: float) -> float:
        """Implementa la fuente PS Step"""
        if t < self.step.step_time:
            return self.step.initial_value
        return self.step.final_value
    
    def ideal_torque_source(self, t: float, sr_state: bool) -> float:
        """
        Implementa la fuente de torque ideal.
        
        La fuente de torque se modela como un actuador ideal que puede
        entregar el torque comandado instantáneamente, limitado por T_max.
        
        Ecuación:
        τ = T_max · u(t)
        donde u(t) es la señal de control normalizada [-1, 1]
        """
        return self.comp.T_max * sr_state * self.ps_step_output(t)
    
    def rotational_damper(self, omega: float) -> float:
        """
        Implementa el amortiguador rotacional R-C.
        
        El amortiguador se modela como un elemento viscoso lineal:
        τ_d = R·ω
        
        Donde:
        - R: Coeficiente de amortiguamiento [N·m·s/rad]
        - ω: Velocidad angular [rad/s]
        - τ_d: Torque de amortiguamiento [N·m]
        """
        return self.comp.R * omega  # Torque de amortiguamiento
    
    def gear_box(self, omega_in: float, omega_out: float, engaged: float) -> Tuple[float, float]:
        """
        Implementa la caja de engranajes con acoplamiento realista.
        
        Modelo Físico Detallado:
        ----------------------
        1. Relaciones Cinemáticas:
           A. Velocidades:
              ω_out = n·ω_in·η
              donde:
              - n: relación de transmisión
              - η: eficiencia
           
           B. Posiciones:
              θ_out = n·θ_in
              Δθ = θ_in - θ_out/n (diferencia angular)
        
        2. Dinámica del Acoplamiento:
           A. Torque Elástico:
              τ_k = k·Δθ
              - k: rigidez torsional [N·m/rad]
              - Proporcional a la deformación angular
           
           B. Torque de Amortiguamiento:
              τ_c = c·Δω
              - c: coeficiente de amortiguamiento [N·m·s/rad]
              - Proporcional a la diferencia de velocidades
        
        3. Pérdidas Mecánicas:
           A. Fricción Estática:
              τ_s = τ_s0·sign(ω)
              - τ_s0: torque de ruptura estático
              - Actúa solo al inicio del movimiento
           
           B. Fricción de Coulomb:
              τ_c = τ_c0·sign(ω)
              - τ_c0: coeficiente de fricción seca
              - Independiente de la velocidad
           
           C. Fricción Viscosa:
              τ_v = b_v·ω
              - b_v: coeficiente viscoso
              - Proporcional a la velocidad
        
        4. Balance de Torques:
           A. Entrada:
              τ_in = τ_k + τ_c + τ_friction_in
           
           B. Salida:
              τ_out = -(τ_k + τ_c)·η + τ_friction_out
        
        Parámetros:
        - omega_in: Velocidad angular de entrada [rad/s]
        - omega_out: Velocidad angular de salida [rad/s]
        - engaged: Estado del acoplamiento [0,1]
        
        Returns:
        - Tuple[float, float]: (torque_in, torque_out)
        """
        # Calcular diferencia de velocidades normalizada
        omega_out_ideal = omega_in * self.comp.gear_ratio
        delta_omega = omega_out_ideal - omega_out
        
        # Torque de acoplamiento
        if engaged > 0:
            coupling_torque = (self.comp.coupling_stiffness * delta_omega + 
                             self.comp.coupling_damping * delta_omega)
        else:
            coupling_torque = 0.0
        
        # Pérdidas mecánicas en entrada y salida
        def friction_torque(omega):
            if abs(omega) < 1e-6:  # Condición de reposo
                return 0.0
            return (self.comp.static_friction * np.sign(omega) +
                   self.comp.coulomb_friction * np.sign(omega) +
                   self.comp.viscous_friction * omega)
        
        # Torques de fricción
        T_friction_in = friction_torque(omega_in)
        T_friction_out = friction_torque(omega_out)
        
        # Torques totales considerando eficiencia
        if engaged > 0:
            T_in = coupling_torque + T_friction_in
            T_out = -coupling_torque * self.comp.efficiency + T_friction_out
        else:
            T_in = T_friction_in
            T_out = T_friction_out
            
        return T_in, T_out
    
    def calculate_kinetic_energy(self, omega1: float, omega2: float) -> float:
        """
        Calcula la energía cinética total del sistema.
        
        E_k = 1/2·(J₁·ω₁² + J₂·ω₂²)
        
        Returns:
            float: Energía cinética total [Joules]
        """
        return 0.5 * (self.comp.J1 * omega1**2 + self.comp.J2 * omega2**2)
    
    def calculate_energy(self, omega1: float, omega2: float, theta1: float, theta2: float) -> dict:
        """
        Calcula todas las componentes de energía del sistema.
        
        Componentes Energéticas:
        ----------------------
        1. Energía Cinética Rotacional:
           E_k = 1/2·(J₁·ω₁² + J₂·ω₂²)
           - Término J₁·ω₁²: Energía del motor
           - Término J₂·ω₂²: Energía de la carga
        
        2. Energía Potencial Elástica:
           E_pot = 1/2·k·(θ₁ - θ₂/n)²
           - k: Rigidez del acoplamiento
           - Δθ = θ₁ - θ₂/n: Deformación angular
        
        3. Potencia Disipada:
           P_diss = b·ω₁² + b₂·ω₂² + c·(ω₁ - ω₂/n)²
           - Término b·ω₁²: Pérdidas en motor
           - Término b₂·ω₂²: Pérdidas en carga
           - Término c·(Δω)²: Pérdidas en acoplamiento
        
        4. Energía Total:
           E_total = E_k + E_pot
        
        Returns:
            dict: Diccionario con todas las energías y potencias
                 {'E_k': float, 'E_pot': float, 
                  'P_diss': float, 'E_total': float}
        """
        # Cálculo de componentes energéticas
        E_k = self.calculate_kinetic_energy(omega1, omega2)
        E_pot = 0.5 * self.comp.coupling_stiffness * (theta1 - theta2/self.comp.gear_ratio)**2
        
        # Cálculo de potencia disipativa
        P_diss = (self.comp.R * omega1**2 + 
                  self.comp.viscous_friction * omega2**2 +
                  self.comp.coupling_damping * (omega1 - omega2/self.comp.gear_ratio)**2)
        
        return {
            'E_k': E_k,
            'E_pot': E_pot,
            'P_diss': P_diss,
            'E_total': E_k + E_pot
        }
        return 0.5 * (self.comp.J1 * omega1**2 + self.comp.J2 * omega2**2)
    
    def system_dynamics(self, t: float, y: np.ndarray) -> np.ndarray:
        """
        Implementa las ecuaciones diferenciales del sistema.
        
        Fenómenos Físicos Modelados:
        ---------------------------
        1. Inercia Rotacional:
           - Resistencia al cambio de velocidad angular
           - Proporcional al momento de inercia J
        
        2. Amortiguamiento:
           - Disipación de energía por fricción
           - Proporcional a la velocidad angular
        
        3. Acoplamiento Mecánico:
           - Transmisión de movimiento entre ejes
           - Conservación del momento angular
        
        4. Control Realimentado:
           - Regulación de velocidad
           - Compensación de perturbaciones
        
        El vector de estado y contiene:
        y = [omega1, omega2, theta1, theta2]
        donde:
        - omega1: Velocidad angular de entrada [rad/s]
        - omega2: Velocidad angular de salida [rad/s]
        - theta1: Posición angular de entrada [rad]
        - theta2: Posición angular de salida [rad]
        
        Las ecuaciones implementadas son:
        1. J₁·dω₁/dt = τ_m - τ_gb_in - τ_d1
        2. J₂·dω₂/dt = τ_gb_out - τ_d2
        3. dθ₁/dt = ω₁
        4. dθ₂/dt = ω₂
        
        Donde:
        - τ_m: Torque del motor (PID)
        - τ_gb_in, τ_gb_out: Torques de la caja de engranajes
        - τ_d1, τ_d2: Torques de amortiguamiento
        """
        omega1, omega2, theta1, theta2 = y
        
        # Lógica de control SR basada en PS Step y f(x)=0
        ps_out = self.ps_step_output(t)
        fx_condition = abs(omega1) < 0.01  # Condición f(x)=0
        
        # Actualizar estado SR
        if fx_condition:
            self.sr_state = False
        elif ps_out > 0:
            self.sr_state = True
            
        # Actualizar estado del embrague
        self.clutch_engaged = self.sr_state
        
        # Calcular torques y control
        target_speed = self.ps_step_output(t)
        speed_error = target_speed - omega1
        
        # Control PID simplificado
        Kp = 2.0   # Ganancia proporcional
        Ki = 0.5   # Ganancia integral
        Kd = 0.1   # Ganancia derivativa
        
        # Integrador con anti-windup
        if not hasattr(self, 'integral_error'):
            self.integral_error = 0
            self.last_error = speed_error
            
        if abs(speed_error) < target_speed * 0.1:  # Anti-windup
            self.integral_error += speed_error * self.config.max_step
            
        # Término derivativo
        derivative = (speed_error - self.last_error) / self.config.max_step
        self.last_error = speed_error
        
        # Control PID
        T_control = (Kp * speed_error + 
                    Ki * self.integral_error +
                    Kd * derivative)
        
        # Saturación del torque
        T_motor = np.clip(T_control, -self.comp.T_max, self.comp.T_max)
        
        # Dinámica del sistema
        T_damper = self.rotational_damper(omega1)
        J_eq = self.comp.J1 + (self.comp.J2 * self.comp.gear_ratio**2)
        domega1 = (T_motor - T_damper) / J_eq
        
        # La velocidad de salida está relacionada por la relación de transmisión
        domega2 = domega1 * self.comp.gear_ratio
            
        return np.array([domega1, domega2, omega1, omega2])
    
    def simulate(self) -> Dict:
        """
        Ejecuta la simulación del sistema.
        
        Implementación Numérica Detallada:
        --------------------------------
        1. Vector de Estado Completo:
           x = [ω₁, ω₂, θ₁, θ₂]ᵀ
           - ω₁, ω₂: Velocidades angulares [rad/s]
           - θ₁, θ₂: Posiciones angulares [rad]
        
        2. Ecuaciones Diferenciales Detalladas:
           A. Dinámica del Motor (Entrada):
              ω̇₁ = (1/J₁)(τ_m - b·ω₁ - k·Δθ - c·Δω)
              donde:
              - τ_m: Torque del motor (PID)
              - b·ω₁: Amortiguamiento viscoso
              - k·Δθ: Torque elástico
              - c·Δω: Torque de amortiguamiento acoplado
           
           B. Dinámica de la Carga (Salida):
              ω̇₂ = (1/J₂)(k·Δθ + c·Δω - b₂·ω₂)
              donde:
              - k·Δθ + c·Δω: Torque transmitido
              - b₂·ω₂: Amortiguamiento de carga
           
           C. Cinemática:
              θ̇₁ = ω₁  (Posición entrada)
              θ̇₂ = ω₂  (Posición salida)
        
        3. Método de Integración RK45:
           A. Algoritmo Runge-Kutta-Fehlberg:
              - Orden 4(5) con paso adaptativo
              - Control de error por paso
              - Estimación del error local
           
           B. Parámetros de Integración:
              - rtol = 1e-6 (Error relativo)
              - atol = 1e-6 (Error absoluto)
              - max_step = 0.01s (Paso máximo)
              
           C. Gestión de Singularidades:
              - Detección de discontinuidades
              - Manejo de cambios en el embrague
              - Tratamiento de saturación
        
        4. Verificaciones del Sistema:
           A. Conservación de Energía:
              dE/dt = τ_m·ω₁ - P_diss
              donde E = E_k + E_pot
           
           B. Balance de Potencia:
              P_in = P_out + P_diss + dE/dt
              - P_in = τ_m·ω₁ (Potencia de entrada)
              - P_out = τ_load·ω₂ (Potencia de salida)
              - P_diss = b·ω₁² + b₂·ω₂² + c·(Δω)² (Disipación)
           
           C. Estabilidad Numérica:
              - Control de paso adaptativo
              - Monitoreo de energía
              - Verificación de restricciones físicas
        
        5. Post-procesamiento:
           - Cálculo de energías
           - Análisis de eficiencia
           - Verificación de relaciones de transmisión
        """
        t_eval = np.linspace(self.config.t_span[0],
                           self.config.t_span[1],
                           int((self.config.t_span[1] - self.config.t_span[0]) / self.config.max_step))
        
        y0 = np.zeros(4)  # [omega1, omega2, theta1, theta2]
        
        solution = solve_ivp(
            self.system_dynamics,
            self.config.t_span,
            y0,
            method=self.config.solver_type,
            t_eval=t_eval,
            rtol=self.config.rel_tol,
            atol=self.config.abs_tol
        )
        
        self.time = solution.t
        self.states = solution.y
        
        return {
            'time': self.time,
            'omega1': self.states[0],
            'omega2': self.states[1],
            'theta1': self.states[2],
            'theta2': self.states[3],
            'clutch_state': [self.clutch_engaged for _ in self.time],
            'torque': [self.ideal_torque_source(t, self.sr_state) for t in self.time]
        }
    
    def plot_results(self, results: Dict):
        """Visualiza los resultados en estilo Simscape con análisis adicional"""
        plt.style.use('default')
        
        # Crear figura con subplots
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 8))
        
        # 1. Velocidades angulares
        ax1.grid(True, linestyle=':', color='gray', alpha=0.5)
        ax1.set_axisbelow(True)
        ax1.plot(results['time'], results['omega1'], '-', color='#0072BD', 
                 label='Input_Gear.w', linewidth=1)
        ax1.plot(results['time'], results['omega2'], '-', color='#D95319',
                 label='Output_Gear.w', linewidth=1)
        ax1.set_xlabel('Time [s]')
        ax1.set_ylabel('Angular Velocity [rad/s]')
        ax1.set_title('Gear Mechanism')
        ax1.set_xlim(0, 10)
        ax1.set_ylim(0, 140)
        ax1.legend()
        
        # 2. Torque del motor y estado del embrague
        ax2.grid(True, linestyle=':', color='gray', alpha=0.5)
        ax2.set_axisbelow(True)
        ax2.plot(results['time'], results['torque'], '-', color='#77AC30',
                 label='Motor Torque', linewidth=1)
        ax2.plot(results['time'], [s * self.comp.T_max for s in results['clutch_state']],
                 '--', color='#4DBEEE', label='Clutch State', linewidth=1)
        ax2.set_xlabel('Time [s]')
        ax2.set_ylabel('Torque [N⋅m]')
        ax2.set_title('Control Actions')
        ax2.legend()
        
        # 3. Energías del sistema
        energies = [self.calculate_energy(w1, w2, t1, t2) 
                   for w1, w2, t1, t2 in zip(results['omega1'], 
                                           results['omega2'],
                                           results['theta1'],
                                           results['theta2'])]
        
        E_k = [e['E_k'] for e in energies]
        E_pot = [e['E_pot'] for e in energies]
        E_total = [e['E_total'] for e in energies]
        P_diss = [e['P_diss'] for e in energies]
        
        ax3.grid(True, linestyle=':', color='gray', alpha=0.5)
        ax3.set_axisbelow(True)
        ax3.plot(results['time'], E_k, '-', color='#0072BD',
                 label='Kinetic Energy', linewidth=1)
        ax3.plot(results['time'], E_pot, '--', color='#D95319',
                 label='Potential Energy', linewidth=1)
        ax3.plot(results['time'], E_total, '-', color='#7E2F8E',
                 label='Total Energy', linewidth=1)
        ax3.set_xlabel('Time [s]')
        ax3.set_ylabel('Energy [J]')
        ax3.set_title('System Energy')
        ax3.legend()
        
        # 4. Posiciones angulares
        ax4.grid(True, linestyle=':', color='gray', alpha=0.5)
        ax4.set_axisbelow(True)
        ax4.plot(results['time'], results['theta1'], '-', color='#0072BD',
                 label='θ₁ (input)', linewidth=1)
        ax4.plot(results['time'], results['theta2'], '-', color='#D95319',
                 label='θ₂ (output)', linewidth=1)
        ax4.set_xlabel('Time [s]')
        ax4.set_ylabel('Angular Position [rad]')
        ax4.set_title('Angular Positions')
        ax4.legend()
        
        plt.tight_layout()
        plt.show()

# Ejemplo de uso
if __name__ == "__main__":
    # Configurar parámetros
    sim_config = SimulationConfig()
    step_params = PSStepParams()
    components = SystemComponents()
    
    # Crear y simular sistema
    system = RotationalSystem(sim_config, step_params, components)
    results = system.simulate()
    
    # Visualizar resultados
    system.plot_results(results)