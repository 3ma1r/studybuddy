'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebaseClient';
import toast from 'react-hot-toast';

interface GenerateQuizButtonProps {
  subjectId: string;
  userId: string;
}

export function GenerateQuizButton({ subjectId, userId }: GenerateQuizButtonProps) {
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  const handleGenerateQuiz = async () => {
    if (!userId) {
      toast.error('Please log in to generate quizzes');
      return;
    }

    setGenerating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectId }),
      });

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server error: API returned invalid response. Check server logs.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      toast.success('Quiz generated successfully!');
      router.push(`/quiz/${data.quizId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerateQuiz}
      disabled={generating}
      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
    >
      {generating ? 'Generating...' : 'Generate Quiz from Notes'}
    </button>
  );
}
