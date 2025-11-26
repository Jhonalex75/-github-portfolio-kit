import uno

def HolaMundoPython(*args):
    doc = XSCRIPTCONTEXT.getDocument()
    sheet = doc.CurrentController.ActiveSheet
    cell = sheet.getCellRangeByName("A1")
    cell.String = "Hola Jhon, este botón usa Python en Calc"
