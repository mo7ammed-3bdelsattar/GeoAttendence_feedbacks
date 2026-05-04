import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

/**
 * Chatbot Controller
 * Handles student queries based on uploaded policy documents using Gemini.
 */
export const askChatbot = async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    const snapshot = await db.collection('policies').get();
    const policies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    // Prepare context from policies
    const context = policies.map(p => `Policy: ${p.title}\nContent: ${p.content}`).join('\n\n');

    if (process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
          You are "Absattar" (عبستار), a friendly and helpful AI assistant for the GeoAttendance system.

          RULES:
          1. Start by being polite and helpful. If the user says "hi" or greets you, respond warmly as Absattar.
          2. Use the provided POLICIES to answer specific questions about university rules, attendance, or grading.
          3. If a question is about university regulations and is NOT covered in the policies, politely say in the appropriate language:
             - Arabic: "آسف، معنديش معلومات عن السياسة دي دلوقتي. تواصل مع الإدارة وهيساعدوك إن شاء الله!"
             - English: "I'm sorry, I don't have information on this specific policy yet. Please contact the administration for help."
          4. Do NOT make up rules that are not in the policies.
          5. You can answer general questions about yourself (e.g., "who are you?") by saying you are the GeoAttendance assistant named Absattar.
          
          LANGUAGE DETECTION & RESPONSE RULES:
          6. AUTOMATICALLY detect the language of the user's message:
             - If the user writes in Arabic → respond in Egyptian Arabic (العامية المصرية البيضاء), friendly and natural, like you're talking to a university student.
             - If the user writes in English → respond in English, friendly and natural.
          7. NEVER mix languages in the same response unless the user themselves mixed them.
          8. Egyptian Arabic tone tips: use words like "يسطا، يعني، طب، خليني أوضحلك، إن شاء الله، تمام؟" to sound natural — but keep it clean and professional.

          POLICIES CONTEXT:
          ${context}

          USER QUESTION: 
          ${query}

          ABSATTAR'S RESPONSE:
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return res.json({
          success: true,
          data: {
            response: responseText,
            isAi: true
          },
          message: "Gemini response generated"
        });
      } catch (geminiError: any) {
        console.error('[Gemini API Error]', geminiError.message);
        // If 404, we continue to fallback logic below
        if (geminiError.status !== 404) {
           return res.status(500).json({ success: false, error: geminiError.message });
        }
      }
    }

    // --- FALLBACK (Basic Matching) ---
    const lowerQuery = query.toLowerCase();
    const greetings = ['hi', 'hello', 'hey', 'سلام', 'هلا', 'صباح الخير', 'مرحبا'];
    
    if (greetings.some(g => lowerQuery.includes(g))) {
      return res.json({
        success: true,
        data: {
          response: "أهلاً بك! أنا عبستار (Absattar)، مساعدك الذكي في نظام GeoAttendance. كيف يمكنني مساعدتك اليوم؟"
        },
        message: "Fallback greeting"
      });
    }

    let bestMatch = null;
    let maxMatches = 0;

    for (const policy of policies) {
      const keywords = policy.keywords || [];
      const title = policy.title || "";
      let matchCount = 0;
      if (lowerQuery.includes(title.toLowerCase())) matchCount += 5;
      keywords.forEach((k: string) => { if (lowerQuery.includes(k.toLowerCase())) matchCount += 2; });
      if (matchCount > maxMatches) { 
        maxMatches = matchCount; 
        bestMatch = policy; 
      }
    }

    return res.json({
      success: true,
      data: {
        response: bestMatch ? bestMatch.content : "I'm sorry, I don't have information on this specific policy yet. Please contact the administration for help."
      },
      message: "Fallback response"
    });

  } catch (error: any) {
    console.error('[Chatbot Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin: Upload or update policy document
 */
export const upsertPolicy = async (req: Request, res: Response) => {
  try {
    const { id, title, content, keywords } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const policyData = {
      title,
      content,
      keywords: Array.isArray(keywords) ? keywords : (keywords ? String(keywords).split(',').map(k => k.trim()) : []),
      updatedAt: new Date().toISOString()
    };

    if (id) {
      await db.collection('policies').doc(id).set(policyData, { merge: true });
      return res.json({ success: true, data: { id, ...policyData }, message: 'Policy updated' });
    } else {
      const docRef = await db.collection('policies').add({
        ...policyData,
        createdAt: new Date().toISOString()
      });
      return res.status(201).json({ success: true, data: { id: docRef.id, ...policyData }, message: 'Policy created' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin: Get all policies
 */
export const getPolicies = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('policies').orderBy('updatedAt', 'desc').get();
    const policies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: policies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Admin: Delete policy
 */
export const deletePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('policies').doc(id).delete();
    res.json({ success: true, message: 'Policy deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
