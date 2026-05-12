import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    const snapshot = await db.collection('policies').get();
    const policies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    const context = policies.map(p => `Policy: ${p.title}\nContent: ${p.content}`).join('\n\n');

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const prompt = `
          You are "Absattar" (عبستار), a highly intelligent and friendly AI assistant for the GeoAttendance system.

          MISSION:
          Your goal is to help students, faculty, and admins with university policies, attendance rules, and system usage.
          
          GREETING RULES (VERY IMPORTANT):
          - Respond to greetings (e.g., "سلام", "هاي", "صباح الخير", "يا عبستار") in a warm, varied, and natural way. 
          - DO NOT use the same fixed greeting every time. Use Egyptian Arabic slang naturally (e.g., "أهلاً بيك يسطا، نورتني!", "يا هلا بيك، معاك عبستار، أؤمرني؟").
          - If they greet you AND ask a question, greet them first then answer the question.

          REASONING & POLICIES:
          - Use the "POLICIES CONTEXT" below to answer questions.
          - Be smart: If the question is slightly different but clearly related to a policy (like "حضور" relating to "Attendance Policy"), connect the dots and explain it clearly.
          - If the user asks something covered in the policies, provide a detailed and helpful summary of that policy.
          
          FALLBACK RULES:
          - If the user asks something completely unrelated to the university or attendance (e.g., "how to cook", "tell me a story"), or if the policies absolutely do not cover the topic, use this specific fallback:
            "عذراً، أنا معنديش معلومات كافية عن سؤالك ده حالياً. يفضل ترجع لإدارة الكلية أو الدكتور بتاعك عشان يفيدك أكتر."

          LANGUAGE:
          - Always respond in the language the user used.
          - If Arabic, use friendly, intelligent Egyptian Arabic (عامية مصرية بيضاء).

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
        console.error('[Gemini API Error]', geminiError.message || geminiError);
        // If Gemini fails, we will proceed to the manual fallback below
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
    const queryWords = lowerQuery.split(/\s+/);

    for (const policy of policies) {
      const keywords = (Array.isArray(policy.keywords) ? policy.keywords : []).map((k: any) => String(k).toLowerCase());
      const title = String(policy.title || "").toLowerCase();
      let matchScore = 0;

      // 1. Title match (High priority)
      if (lowerQuery.includes(title) || title.includes(lowerQuery)) matchScore += 10;
      
      // 2. Word matches in title
      queryWords.forEach(word => {
        if (word.length > 2 && title.includes(word)) matchScore += 5;
      });

      // 3. Keyword matches
      keywords.forEach((k: string) => { 
        if (lowerQuery.includes(k)) matchScore += 3;
        queryWords.forEach(word => {
          if (word.length > 2 && k.includes(word)) matchScore += 2;
        });
      });

      if (matchScore > maxMatches) { 
        maxMatches = matchScore; 
        bestMatch = policy; 
      }
    }

    return res.json({
      success: true,
      data: {
        response: (bestMatch && maxMatches >= 2) ? bestMatch.content : "عذراً، أنا معنديش معلومات كافية عن سؤالك ده حالياً. يفضل ترجع لإدارة الكلية أو الدكتور بتاعك عشان يفيدك أكتر."
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
