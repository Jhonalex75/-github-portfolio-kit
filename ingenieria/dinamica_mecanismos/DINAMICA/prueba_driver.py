import time
import sys
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

def probar_instalacion_driver():
    print("--- INICIANDO PRUEBA DE DRIVER ---")
    try:
        print("1. Configurando opciones de Chrome...")
        chrome_options = Options()
        chrome_options.add_argument('--headless') # Ejecutar sin ventana
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        
        print("2. Instalando o verificando ChromeDriverManager...")
        # Esta es la linea que probablemente falla
        service = Service(ChromeDriverManager().install())
        
        print("3. Driver instalado/verificado correctamente.")
        
        print("4. Intentando iniciar el navegador...")
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        print("5. Navegador iniciado. Visitando Google.com...")
        driver.get("https://www.google.com")
        
        print(f"6. Exito! Titulo de la pagina: {driver.title}")
        
        driver.quit()
        
        print("\n--- PRUEBA COMPLETADA CON EXITO ---")

    except Exception as e:
        # Esto nos dira el error real, sin fallar por acentos
        try:
            # Intenta imprimir el error de forma segura
            error_message = str(e).encode('ascii', 'ignore').decode('ascii')
            print(f"\n--- !!! LA PRUEBA FALLO !!! ---")
            print(f"ERROR: {error_message}")
        except:
            print("\n--- !!! LA PRUEBA FALLO CON UN ERROR NO IMPRIMIBLE ---")

if __name__ == "__main__":
    probar_instalacion_driver()
    print("\nScript de prueba finalizado.")
    # Usamos sys.stdin.read(1) en lugar de input para evitar problemas de codificacion
    print("Presiona ENTER para salir...")
    sys.stdin.read(1)
    