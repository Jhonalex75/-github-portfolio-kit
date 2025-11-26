# ===================================================================
# EJEMPLO DIDÁCTICO DE TKINTER: SALUDO INTERACTIVO
# ===================================================================

# --- PASO 0: Importar la librería Tkinter ---
# La importamos con el alias 'tk' para que sea más corto y fácil de escribir.
import tkinter as tk
from tkinter import ttk # ttk nos da acceso a widgets con un estilo más moderno

# --- PASO 1: Crear la ventana principal ---
# 'root' es el nombre convencional para la ventana principal, pero podría ser cualquiera.
root = tk.Tk()
# Le ponemos un título a la ventana, que aparecerá en la barra superior.
root.title("Mi Primera App GUI")
# Opcional: Definimos un tamaño inicial para la ventana (ancho x alto).
root.geometry("400x200")


# --- PASO 2: Definir la función que se ejecutará al presionar el botón ---
# Esta función es la "lógica" de nuestra aplicación.
def saludar():
    # 1. Obtenemos el texto que el usuario escribió en el campo de entrada (Entry).
    #    El método .get() nos devuelve su contenido como una cadena de texto.
    nombre = campo_nombre.get()
    
    # 2. Si el nombre no está vacío, creamos un saludo personalizado.
    if nombre:
        saludo = f"¡Hola, {nombre}!"
    else:
        saludo = "¡Hola, Mundo!"
        
    # 3. Actualizamos el texto de nuestra etiqueta de resultado.
    #    El método .config(text=...) nos permite cambiar las propiedades de un widget.
    etiqueta_resultado.config(text=saludo)


# --- PASO 3: Crear los widgets (los "muebles") ---

# Creamos una etiqueta (Label) que sirve como instrucción para el usuario.
# El primer argumento siempre es el "padre" del widget, en este caso, la ventana 'root'.
etiqueta_instruccion = ttk.Label(root, text="Por favor, escribe tu nombre:")

# Creamos un campo de entrada (Entry) para que el usuario pueda escribir.
campo_nombre = ttk.Entry(root, width=30)

# Creamos un botón (Button).
# 'text' es el texto que muestra el botón.
# 'command' es la función que se ejecutará cuando el usuario haga clic.
# ¡Ojo! Se pasa el nombre de la función SIN paréntesis: command=saludar
boton_saludar = ttk.Button(root, text="Saludar", command=saludar)

# Creamos otra etiqueta que usaremos para mostrar el resultado.
# Inicialmente estará vacía.
etiqueta_resultado = ttk.Label(root, text="", font=("Helvetica", 14))


# --- PASO 4: Colocar los widgets en la ventana usando el gestor .grid() ---
# .grid() organiza todo en una tabla invisible.
# 'row' es la fila, 'column' es la columna.
# 'padx' y 'pady' añaden un pequeño espacio horizontal y vertical para que no se vea todo apretado.

# Colocamos la etiqueta de instrucción en la primera fila (0), primera columna (0).
etiqueta_instruccion.grid(row=0, column=0, padx=10, pady=10)

# Colocamos el campo de entrada en la misma fila (0), pero en la segunda columna (1).
campo_nombre.grid(row=0, column=1, padx=10, pady=10)

# Colocamos el botón en la segunda fila (1), abarcando dos columnas ('columnspan=2') para que quede centrado.
boton_saludar.grid(row=1, column=0, columnspan=2, pady=10)

# Colocamos la etiqueta de resultado en la tercera fila (2), también centrada.
etiqueta_resultado.grid(row=2, column=0, columnspan=2, pady=20)


# --- PASO 5: Iniciar el bucle de eventos ---
# Esta línea es FUNDAMENTAL. Mantiene la ventana abierta y a la espera de acciones del usuario.
# Debe ser siempre la última línea de tu script de Tkinter.
root.mainloop()