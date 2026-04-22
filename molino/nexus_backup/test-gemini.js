const { GoogleGenAI } = require('@google/genai');

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: 'AIzaSyAtPqxt3mGjzwpyEyIgaD37YROlwAKOTaQ' });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Say hello world in 1 word',
    });
    console.log("SUCCESS:", response.text);
  } catch(e) {
    console.error("ERROR:");
    console.error(e);
  }
}
test();
