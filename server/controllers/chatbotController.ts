import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// In-memory rate limiter map: IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const DAILY_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export const askChatbot = async (req: Request, res: Response) => {
  try {
    // 1. Enforce Rate Limit (Per User if authenticated, else Per IP)
    const currentUser = (req as any).currentUser;
    const limitKey = currentUser?.uid || req.ip || req.socket.remoteAddress || 'unknown';
    
    const now = Date.now();
    const record = rateLimitMap.get(limitKey);
    
    if (record) {
      if (now > record.resetTime) {
        // Reset after 24 hours
        rateLimitMap.set(limitKey, { count: 1, resetTime: now + WINDOW_MS });
      } else if (record.count >= DAILY_LIMIT) {
        return res.status(429).json({ 
          success: false, 
          message: 'لقد استنفدت الحد اليومي (5 رسائل). يرجى المحاولة غداً.',
          error: 'Daily limit exceeded' 
        });
      } else {
        record.count++;
      }
    } else {
      rateLimitMap.set(limitKey, { count: 1, resetTime: now + WINDOW_MS });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    const snapshot = await db.collection('policies').get();
    const policies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    const context = policies.map(p => `Policy: ${p.title}\nContent: ${p.content}`).join('\n\n');

    if (process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
          You are "Absattar" (عبستار), a friendly and helpful AI assistant for the GeoAttendance system.

          RULES:
          1. GREETINGS: If the user greets you (e.g., "hi", "سلام", "صباح الخير"), respond warmly as Absattar FIRST, then proceed to answer their question if they asked one.
          2. SCOPE: You answer questions about university policies, attendance rules, grading, or the GeoAttendance system.
          3. MATCHING: If the question is related to the provided policies or university life in general, answer it using the context provided.
          4. FALLBACK: If the user asks something outside of your scope, or if you don't have enough information in the policies to answer, you MUST say:
             - Arabic: "عذراً، أنا معنديش معلومات كافية عن سؤالك ده حالياً. يفضل ترجع لإدارة الكلية أو الدكتور بتاعك عشان يفيدك أكتر."
             - English: "I'm sorry, I don't have enough information about your question right now. It's best to check with the college administration or your professor for more details."
          5. TONE: Be natural and student-friendly.
          
          LANGUAGE RULES:
          6. Respond in the SAME language as the user.
          7. If Arabic, use friendly Egyptian Arabic (عامية مصرية بيضاء).

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
        if (geminiError.status !== 404) {
           return res.status(500).json({ success: false, error: geminiError.message });
        }
      }
    }

    const lowerQuery = query.toLowerCase();
    const greetings = ['hi', 'hello', 'hey', 'سلام', 'هلا', 'صباح الخير', 'مرحبا'];
    
    if (greetings.some(g => lowerQuery.includes(g))) {
      return res.json({
        success: true,
        data: {
          response: "أهلاً بك! أنا عبستار (Absattar)، مساعدك الذكي في نظام GeoAttendance. كيف يمكنني مساعدتك اليوم؟ تقدر تسألني عن أي حاجة تخص الكلية أو نظام الحضور."
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
        response: bestMatch ? bestMatch.content : "عذراً، أنا معنديش معلومات كافية عن سؤالك ده حالياً. يفضل ترجع لإدارة الكلية أو الدكتور بتاعك عشان يفيدك أكتر."
      },
      message: "Fallback response"
    });

  } catch (error: any) {
    console.error('[Chatbot Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

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

export const getPolicies = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('policies').orderBy('updatedAt', 'desc').get();
    const policies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: policies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePolicy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection('policies').doc(id).delete();
    res.json({ success: true, message: 'Policy deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
