const { GoogleGenAI } = require('@google/genai');

async function testKey(key) {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'reply OK',
    });
    console.log("SUCCESS WITH KEY:", key);
    return true;
  } catch(e) {
    if (e.status !== 400) console.log(key, e.status);
    return false;
  }
}

async function main() {
  const base = "AIzaSyAtPqxt3mGjzwpyEyIgaD37YROlwAKOTaQ";
  console.log("Testing variations of:", base);
  // the ambiguous characters:
  // Ey[I or l]ga
  // YRO[l or I]w
  // AK0TaQ or AKOTaQ
  
  const chars1 = ['I', 'l'];
  const chars2 = ['l', 'I'];
  const chars3 = ['O', '0'];

  for (let c1 of chars1) {
    for (let c2 of chars2) {
      for (let c3 of chars3) {
        let key = base.replace("EyIga", "Ey"+c1+"ga");
        key = key.replace("YROlw", "YR"+c3+c2+"w"); // Wait, replacing O is complex, let's build manually
        
        // Build the string carefully:
        // AIzaSyAtPqxt3mGjzwpyEy(c1)gaD37YR(c3)(c2)wAK(c3)TaQ
        
      }
    }
  }
}
// Actually, let's just use regex to replace specific indices
async function run() {
    const chars1 = ['I', 'l'];
    const chars2 = ['l', 'I'];
    const chars3 = ['O', '0'];
    const chars4 = ['O', '0']; // there are two O's near the end: ROlw and AKO

    for (let c1 of chars1) {
        for (let c2 of chars2) {
            for (let c3 of chars3) {
                for (let c4 of chars4) {
                    let key = `AIzaSyAtPqxt3mGjzwpyEy${c1}gaD37YR${c3}${c2}wAK${c4}TaQ`;
                    if (await testKey(key)) return;
                }
            }
        }
    }
}
run();
