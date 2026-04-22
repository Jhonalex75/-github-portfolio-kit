const { GoogleGenAI } = require('@google/genai');

async function testModel(modelName) {
  try {
    const ai = new GoogleGenAI({ apiKey: 'AIzaSyAtPqxt3mGjzwpyEylgaD37YROIwAKOTaQ' });
    const response = await ai.models.generateContent({
        model: modelName,
        contents: 'Say OK',
    });
    console.log("SUCCESS WITH:", modelName, response.text);
  } catch(e) {
    console.log("FAILED WITH:", modelName, e.status, e.message);
  }
}

async function run() {
    await testModel('gemini-1.5-flash');
    await testModel('gemini-2.0-flash');
}
run();
