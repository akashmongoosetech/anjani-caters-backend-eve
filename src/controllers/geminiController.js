import { GoogleGenAI } from '@google/genai';
import { logAiMessage } from '../services/databaseService.js';

let aiClient = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `You are the official AI Culinary Concierge and Banquet Planner for "Eveng Catering", a premium award-winning event and wedding catering company based in Mumbai, India.

Your personality is warm, elegant, professional, highly hospitable, and deeply knowledgeable about traditional and modern Indian gourmet cuisines, wedding menu structures, royal banquets, and event planning.

Key Information about Eveng Catering:
- Specialties: Grand luxury Indian wedding catering, corporate galas, high-end sangeets, and intimate celebrations.
- Menu Options: Extensive and customizable multi-cuisine menus. Category options include welcome drinks, mocktails, gourmet soups, tandoor starters, a lively chaat counter, interactive live food counters, artisanal Indian breads, paneer curries, traditional vegetable curries, dal varieties, basmati rice, regional culinary specials (Punjabi, Gujarati, Rajasthani, Maharashtrian), Chinese/fusion specials, and decadent sweets/desserts.
- Signature Dishes:
  * "Deconstructed Dahi Puri Bomb" (modern street food fusion)
  * "Tandoori Avocado & Paneer Tikka" (hickory wood smoked)
  * "Saffron Awadhi Dum Biryani" (aromatic basmati layered with proteins, infused with Kashmiri saffron and pure ghee, cooked in clay pots)
  * "Classic Dal Makhani" (slow-cooked black lentils simmered for 36 hours with white butter)
  * "Royal Rajasthani Laal Maas" (smoked lamb delicacy with Mathania chilies)
  * "Shahi Tukda Brioche Pudding" (caramelized brioche soaked in cardamom rabdi with 24k silver leaf)
  * "Rose & Pistachio Baklava Sandesh" (fusion sweet layering Bengali Sandesh with crispy honeyed baklava sheets)
  * "Smoked Kokum & Chilli Margarita" (tangy non-alcoholic signature mocktail with cedar wood smoke)
- Dietary Accommodations: Full customization for Jain, pure vegetarian, vegan, gluten-free, nut-free, and other specific allergy/dietary requirements.
- Services Offered: Complete banqueting logistics, thematic food table presentation (bento-grid styling, traditional silver-service), silver service staff, custom interactive mocktail mixologists, and bespoke menus.
- Location: Headquartered in Mumbai, but available for luxury destination weddings and events across India (e.g., Udaipur, Goa, Jaipur) and internationally.

Behavioral Guidelines:
- Keep your answers beautifully composed, concise (under 150-200 words), and rich in description.
- Use elegant vocabulary suited for a luxury brand (words like "curated", "gourmet", "traditional heritage", "impeccable", "bespoke", "culinary masterclass").
- When asked about pricing, remind clients that pricing depends on menu selections, guest count, and service themes, and invite them to click "Request Customized Quote" or use the WhatsApp widget for personalized consultations.
- Encourage them to browse our gourmet menu categories in the Menu page to select dishes they love.
- Always remain exceptionally polite, welcoming, and helpful.
- **IMPORTANT**: If the customer expresses booking intent, wants a quote, wants to place an order, or mentions an event details (e.g., "I want to book", "book a wedding", "need catering for 200 guests"), politely acknowledge their request and mention that you will open an instant, customized inquiry form right here in the chat to collect their exact details so the master chefs and event coordinators can prepare a precise quotation.`;

export async function postGeminiChat(req, res) {
  try {
    const { messages, sessionId, clientName } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request. 'messages' array is required." });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (keyError) {
      const offlineResponse = 'Hello! I am the Eveng Catering Concierge. It looks like the GEMINI_API_KEY is not configured yet. Please configure it in your Settings > Secrets panel so I can provide smart, AI-driven recommendations. In the meantime, feel free to use our floating WhatsApp widget or click \'Book Event\' to talk to our team!';

      if (sessionId) {
        const lastUserMsg = messages[messages.length - 1];
        if (lastUserMsg) await logAiMessage(sessionId, { role: 'user', content: lastUserMsg.content }, clientName);
        await logAiMessage(sessionId, { role: 'model', content: offlineResponse }, clientName);
      }

      return res.status(200).json({ response: offlineResponse, warning: 'GEMINI_API_KEY_MISSING' });
    }

    const contents = messages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    });

    const text = response.text || 'I apologize, but I am unable to generate a response at this moment. How else can I assist you with your catering plans?';

    if (sessionId) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg) await logAiMessage(sessionId, { role: 'user', content: lastUserMsg.content }, clientName);
      await logAiMessage(sessionId, { role: 'model', content: text }, clientName);
    }

    return res.json({ response: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error in Gemini API' });
  }
}

export async function postGenerateDescription(req, res) {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (keyError) {
      return res.status(200).json({ description: 'Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables.', warning: 'GEMINI_API_KEY_MISSING' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `Generate an elegant event description for a catering service based on the following: ${prompt}. Keep it professional, inviting, and under 100 words.` }] }],
      config: { temperature: 0.7 }
    });

    return res.json({ description: response.text || '' });
  } catch (error) {
    console.error('Gemini generate description error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function postSuggestMenu(req, res) {
  try {
    const { eventType, guests, cuisine, dietary } = req.body;
    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required.' });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (keyError) {
      return res.status(200).json({ suggestions: 'Gemini API key not configured. Please set GEMINI_API_KEY.', warning: 'GEMINI_API_KEY_MISSING' });
    }

    const prompt = `Suggest a catering menu for a ${eventType} with ${guests || 'N/A'} guests. Preferred cuisine: ${cuisine || 'Multi-cuisine'}. Dietary restrictions: ${dietary || 'None'}. List 5-7 dish recommendations with brief descriptions. Keep it under 150 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.7 }
    });

    return res.json({ suggestions: response.text || '' });
  } catch (error) {
    console.error('Gemini suggest menu error:', error);
    return res.status(500).json({ error: error.message });
  }
}
