import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import { getLatestNotesAdmin, createQuizAdmin, QuizQuestion } from '@/lib/dbAdmin';
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
    const { subjectId } = body;

    if (!subjectId) {
      return NextResponse.json({ error: 'Missing subjectId' }, { status: 400 });
    }

    // Get all notes for context
    const notes = await getLatestNotesAdmin(subjectId, uid, 20);
    
    if (notes.length === 0) {
      return NextResponse.json({ error: 'No notes found. Please create some notes first.' }, { status: 400 });
    }

    // Combine notes content
    const notesContext = notes
      .map((note: any) => `Title: ${note.title}\nContent: ${note.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a quiz generator. Generate exactly 10 multiple-choice questions based on the provided study notes.

Each question should have:
- A clear question (q)
- Exactly 4 answer options (options array)
- The correct answer index (answerIndex: 0-3)
- A brief explanation (explanation)

Format your response as a valid JSON array of questions. Each question should follow this structure:
{
  "q": "Question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answerIndex": 0,
  "explanation": "Brief explanation of why this is correct"
}

Return ONLY the JSON array, no other text.`;

    // Call OpenAI
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a quiz based on these notes:\n\n${notesContext}` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const responseText = completion.choices[0].message.content || '[]';
    
    // Parse JSON response
    let questions: QuizQuestion[];
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      questions = JSON.parse(jsonText);
      
      // Validate structure
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format');
      }
      
      // Validate each question
      questions = questions.slice(0, 10); // Limit to 10
      questions.forEach((q, idx) => {
        if (!q.q || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex > 3 ||
            !q.explanation) {
          throw new Error(`Invalid question format at index ${idx}`);
        }
      });
    } catch (parseError) {
      console.error('Quiz parsing error:', parseError, responseText);
      return NextResponse.json({ 
        error: 'Failed to generate valid quiz. Please try again.' 
      }, { status: 500 });
    }

    // Create quiz in database
    const quizId = await createQuizAdmin(
      uid,
      subjectId,
      `Quiz - ${new Date().toLocaleDateString()}`,
      questions
    );

    return NextResponse.json({ quizId, questions });
  } catch (error: any) {
    console.error('Quiz API error:', error);
    const errorMessage = error?.message || error?.toString() || 'Internal server error';
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}
