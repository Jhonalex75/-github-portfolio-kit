'use server';

import { chatContentModeration } from '@/ai/flows/chat-content-moderation';

export async function moderarMensajeAction(mensajeText: string) {
  try {
    // Aquí es donde ocurre la "magia". El frontend llama a esta función 
    // y esta función le pasa el mensaje a Genkit/Gemini.
    console.log("Servidor: Analizando mensaje con Genkit...");
    const resultado = await chatContentModeration({ message: mensajeText });
    
    // Genkit devuelve estrictamente { isAppropriate: boolean, reason: string }
    return resultado;
  } catch (error) {
    console.error("Error al conectar con la IA:", error);
    return { 
      isAppropriate: false, 
      reason: "Hubo un error de conexión con la Inteligencia Artificial." 
    };
  }
}
