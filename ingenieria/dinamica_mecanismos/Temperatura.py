# ===================================================================
# EJEMPLO DIDÁCTICO 2 DE TKINTER: CONVERTIDOR DE TEMPERATURA
# ===================================================================

import tkinter as tk
from tkinter import ttk, messagebox

# --- PASO 1: Crear la ventana principal ---
root = tk.Tk()
root.title("Convertidor de Temperatura")
root.geometry("450x250")
# Hacemos que la ventana no se pueda redimensionar para mantener el diseño simple.
root.resizable(False, False)


# --- PASO 2: Crear variables de control de Tkinter ---
# Estas variables especiales se "enlazan" a los widgets.
# Cuando la variable cambia, el widget se actualiza solo, y viceversa.

# Variable para almacenar la opción seleccionada en los Radiobutton (1 para Celsius, 2 para Fahrenheit).
# Usamos IntVar porque los valores serán números enteros.
opcion_seleccionada = tk.IntVar(value=1)

# Variable para almacenar el texto que se mostrará en la etiqueta de resultado.
# Usamos StringVar porque contendrá texto.
texto_resultado = tk.StringVar(value="Resultado:")


# --- PASO 3: Definir la función de conversión ---
def convertir_temperatura():
    """
    Toma el valor del campo de entrada, revisa la opción seleccionada
    y realiza la conversión de temperatura.
    """
    try:
        # Obtenemos el valor del campo de entrada y lo convertimos a un número flotante.
        valor_temp = float(campo_temperatura.get())
        
        # Verificamos qué opción está seleccionada (1 o 2).
        opcion = opcion_seleccionada.get()

        if opcion == 1: # Convertir de Celsius a Fahrenheit
            # Fórmula: F = (C * 9/5) + 32
            resultado = (valor_temp * 9/5) + 32
            # Actualizamos la variable de texto. El widget 'etiqueta_resultado' se actualizará automáticamente.
            texto_resultado.set(f"{valor_temp:.2f} °C  =  {resultado:.2f} °F")
        
        elif opcion == 2: # Convertir de Fahrenheit a Celsius
            # Fórmula: C = (F - 32) * 5/9
            resultado = (valor_temp - 32) * 5/9
            texto_resultado.set(f"{valor_temp:.2f} °F  =  {resultado:.2f} °C")

    except ValueError:
        # Si el usuario ingresa texto que no es un número, float() dará un error.
        # Capturamos ese error y mostramos una ventana emergente de advertencia.
        messagebox.showerror("Error de entrada", "Por favor, ingresa solo números.")
        texto_resultado.set("Resultado:") # Reiniciamos el texto del resultado.


# --- PASO 4: Crear los widgets ---

# Usaremos un Frame para agrupar la entrada y la etiqueta, para mejor organización.
frame_entrada = ttk.Frame(root)

# Etiqueta y campo de entrada para la temperatura.
etiqueta_temp = ttk.Label(frame_entrada, text="Temperatura a convertir:")
campo_temperatura = ttk.Entry(frame_entrada, width=15)

# Usaremos otro Frame para agrupar los radio buttons.
frame_opciones = ttk.Frame(root)
etiqueta_opciones = ttk.Label(frame_opciones, text="Convertir de:")

# Creamos los dos Radiobutton.
# - 'variable' los enlaza a nuestra variable de control 'opcion_seleccionada'.
# - 'value' es el valor que esa variable tomará si se selecciona este botón.
radio_celsius = ttk.Radiobutton(frame_opciones, text="Celsius a Fahrenheit", variable=opcion_seleccionada, value=1)
radio_fahrenheit = ttk.Radiobutton(frame_opciones, text="Fahrenheit a Celsius", variable=opcion_seleccionada, value=2)

# Botón para ejecutar la conversión.
boton_convertir = ttk.Button(root, text="Convertir", command=convertir_temperatura)

# Etiqueta para mostrar el resultado.
# La enlazamos a nuestra variable 'texto_resultado' con 'textvariable'.
etiqueta_resultado = ttk.Label(root, textvariable=texto_resultado, font=("Helvetica", 16, "bold"))


# --- PASO 5: Colocar los widgets en la ventana ---
# Usaremos una mezcla de .pack() para un diseño vertical simple.
# 'pady' añade un espacio vertical para que no se vea amontonado.

# Colocamos el frame de la entrada.
frame_entrada.pack(pady=10)
# Colocamos los widgets DENTRO del frame_entrada. Usamos .pack() con 'side' para ponerlos uno al lado del otro.
etiqueta_temp.pack(side="left", padx=5)
campo_temperatura.pack(side="left", padx=5)

# Colocamos el frame de las opciones.
frame_opciones.pack(pady=5)
# Colocamos los widgets DENTRO del frame_opciones.
etiqueta_opciones.pack(pady=5)
radio_celsius.pack(anchor="w") # anchor="w" (west) alinea el texto a la izquierda.
radio_fahrenheit.pack(anchor="w")

# Colocamos el botón y la etiqueta de resultado.
boton_convertir.pack(pady=10)
etiqueta_resultado.pack(pady=20)


# --- PASO 6: Iniciar el bucle de eventos ---
root.mainloop()