from vpython import *

# --- 1. Configuración de la Escena ---
scene.width = 1024
scene.height = 768
scene.title = "Simulación de Caída de Carrito Lego (Estilo VPython)"
scene.caption = "Arrastra con el botón derecho para rotar, rueda del mouse para zoom."

# --- 2. Parámetros Físicos (basados en tu script) ---
h0 = 1.0       # Altura inicial (m)
g = 9.81       # Aceleración gravitacional (m/s^2)
e = 0.3        # Coeficiente de restitución (rebote)
dt = 0.001     # Paso de tiempo (más pequeño para mejor detección de colisión)

# --- 3. Dimensiones del Carrito (basadas en tu script) ---
L = 0.10  # largo (eje x)
H = 0.04  # alto (eje y)
W = 0.06  # ancho (eje z)

# --- 4. Creación de Objetos ---

# El suelo (Superficie de Acero)
# Nota: La posición es el CENTRO del objeto.
# Lo hacemos delgado y lo ponemos en y=0
suelo_dims = vector(0.5, 0.01, 0.5)
suelo = box(pos=vector(0, -suelo_dims.y/2, 0),
            size=suelo_dims,
            color=color.gray(0.7),
            texture=textures.metal) # Textura metálica

# El carrito Lego
# Su posición inicial es h0 + la mitad de su altura (para que la BASE esté en h0)
y_inicial = h0 + H/2
carrito = box(pos=vector(0, y_inicial, 0),
              size=vector(L, H, W),
              color=color.red,
              make_trail=True, # Dejará una estela
              trail_type='points',
              trail_radius=0.005)

# Añadir ruedas (visual) - Opcional pero mejora el aspecto
radio_rueda = 0.015
ancho_rueda = 0.01
# Posiciones relativas al centro del carrito
pos_ruedas = [
    vector( L/2.5, -H/2 + radio_rueda,  W/2),
    vector( L/2.5, -H/2 + radio_rueda, -W/2),
    vector(-L/2.5, -H/2 + radio_rueda,  W/2),
    vector(-L/2.5, -H/2 + radio_rueda, -W/2)
]
ruedas = []
for pos in pos_ruedas:
    # 'compound' agrupa objetos para que se muevan juntos
    rueda = cylinder(pos=pos, axis=vector(0, 0, ancho_rueda), 
                     radius=radio_rueda, color=color.black)
    ruedas.append(rueda)

# Agrupamos el chasis y las ruedas en un solo objeto
carrito_completo = compound([carrito] + ruedas)
carrito_completo.pos.y = y_inicial # Re-establecer posición del grupo

# --- 5. Variables de Simulación ---
carrito_completo.v = vector(0, 0, 0)      # Velocidad inicial
carrito_completo.a = vector(0, -g, 0)     # Aceleración (gravedad)
t = 0

# --- 6. Etiquetas de Información (Opcional) ---
label_info = label(pos=scene.camera.pos + vector(0, 0.3, -1), 
                   text=f"Tiempo: {t:.2f} s\nAltura: {carrito_completo.pos.y - H/2:.2f} m\nVelocidad: {carrito_completo.v.y:.2f} m/s",
                   box=True, line=False, opacity=0)


# --- 7. Bucle de Simulación ---
print("Simulación en VPython iniciada...")
while t < 10:  # Simular por 10 segundos
    
    rate(1/dt) # Controla la velocidad de la simulación
    
    # Actualizar física (método de Euler)
    carrito_completo.v = carrito_completo.v + carrito_completo.a * dt
    carrito_completo.pos = carrito_completo.pos + carrito_completo.v * dt
    
    # Detección de colisión
    # Comprobar si la parte inferior del carrito (pos.y - H/2) ha golpeado
    # la parte superior del suelo (suelo.pos.y + suelo_dims.y/2)
    if carrito_completo.pos.y - H/2 < suelo.pos.y + suelo_dims.y/2:
        
        # 1. Corregir posición para evitar que se hunda
        carrito_completo.pos.y = suelo.pos.y + suelo_dims.y/2 + H/2
        
        # 2. Invertir y atenuar la velocidad (rebote)
        carrito_completo.v.y = -carrito_completo.v.y * e
        
        # Efecto visual de "impacto"
        suelo.color = color.yellow
        carrito_completo.color = color.yellow # (Solo afecta al 'compound' si se re-define)
        scene.waitfor('rate') # Pequeña pausa
        suelo.color = color.gray(0.7)
        carrito_completo.color = color.red

    # Actualizar etiquetas
    altura_base = carrito_completo.pos.y - H/2
    label_info.text = f"Tiempo: {t:.2f} s\nAltura: {altura_base:.2f} m\nVelocidad: {carrito_completo.v.y:.2f} m/s"
    label_info.pos = scene.camera.pos + vector(0, 0.3, -1) # Mantener frente a la cámara
    
    t = t + dt

print("Simulación VPython completada.")