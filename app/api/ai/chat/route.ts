import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import {
  getLatestNotesAdmin,
  getOrCreateChatAdmin,
  addChatMessageAdmin,
  getChatMessagesAdmin,
} from '@/lib/dbAdmin';
import { verifyIdToken } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is configured
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      return NextResponse.json({ 
        error: 'Firebase Admin not configured. Please set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local' 
      }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const uid = await verifyIdToken(token);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized. Token verification failed.' }, { status: 401 });
    }

    const body = await request.json();
    const { subjectId, message } = body;

    if (!subjectId || !message) {
      return NextResponse.json({ error: 'Missing subjectId or message' }, { status: 400 });
    }

    // Get or create chat
    const chatId = await getOrCreateChatAdmin(subjectId, uid);

    // Add user message
    await addChatMessageAdmin(chatId, 'user', message);

    // Get context from notes and previous messages
    const notes = await getLatestNotesAdmin(subjectId, uid, 5);
    const previousMessages = await getChatMessagesAdmin(chatId, 10);

    // Build context
    const notesContext = notes
      .map((note: any) => `Title: ${note.title}\nContent: ${note.content}`)
      .join('\n\n');

    const conversationHistory = previousMessages
      .slice(-10)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `You are a helpful study tutor. Your role is to help the student understand their course material better. 
Be clear, concise, and encouraging. Ask follow-up questions when appropriate to deepen understanding.

Relevant Notes:
${notesContext || 'No notes available yet.'}

Previous Conversation:
${conversationHistory || 'No previous conversation.'}

Respond as a helpful tutor. Keep responses clear and educational.`;

    // Call OpenAI
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantMessage = completion.choices[0].message.content || 'Sorry, I could not generate a response.';

    // Save assistant message
    await addChatMessageAdmin(chatId, 'assistant', assistantMessage);

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('Chat API error:', error);
    const errorMessage = error?.message || error?.toString() || 'Internal server error';
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}
