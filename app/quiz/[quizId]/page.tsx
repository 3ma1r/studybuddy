'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Quiz } from '@/lib/db';
import { AuthGuard } from '@/components/AuthGuard';
import { Navbar } from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function QuizPage() {
  const [user, setUser] = useState<User | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && quizId) {
        loadQuiz();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
      if (!quizDoc.exists()) {
        toast.error('Quiz not found');
        router.push('/dashboard');
        return;
      }
      setQuiz({ id: quizDoc.id, ...quizDoc.data() } as Quiz);
    } catch (error: any) {
      toast.error('Failed to load quiz');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    if (showResults) return;
    setAnswers({ ...answers, [questionIndex]: answerIndex });
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < (quiz?.questions.length || 0)) {
      if (!confirm('You have not answered all questions. Submit anyway?')) {
        return;
      }
    }
    setShowResults(true);
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.answerIndex) {
        correct++;
      }
    });
    return correct;
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar user={user} />
          <div className="text-center py-12">Loading quiz...</div>
        </div>
      </AuthGuard>
    );
  }

  if (!quiz) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50">
          <Navbar user={user} />
          <div className="text-center py-12">Quiz not found</div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.push(`/subjects/${quiz.subjectId}`)}
              className="text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Back to Subject
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
            {showResults && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-lg font-semibold">
                  Score: {calculateScore()} / {quiz.questions.length}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {quiz.questions.map((question, qIndex) => {
              const userAnswer = answers[qIndex];
              const isCorrect = userAnswer === question.answerIndex;
              const showAnswer = showResults;

              return (
                <div key={qIndex} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {qIndex + 1}. {question.q}
                  </h3>
                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => {
                      let bgColor = 'bg-gray-50 hover:bg-gray-100';
                      if (showAnswer) {
                        if (oIndex === question.answerIndex) {
                          bgColor = 'bg-green-100 border-green-500';
                        } else if (oIndex === userAnswer && oIndex !== question.answerIndex) {
                          bgColor = 'bg-red-100 border-red-500';
                        }
                      } else if (userAnswer === oIndex) {
                        bgColor = 'bg-blue-100 border-blue-500';
                      }

                      return (
                        <button
                          key={oIndex}
                          onClick={() => handleAnswer(qIndex, oIndex)}
                          disabled={showAnswer}
                          className={`w-full text-left p-3 rounded border-2 ${bgColor} ${
                            !showAnswer ? 'cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          {String.fromCharCode(65 + oIndex)}. {option}
                          {showAnswer && oIndex === question.answerIndex && (
                            <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                          )}
                          {showAnswer && oIndex === userAnswer && oIndex !== question.answerIndex && (
                            <span className="ml-2 text-red-600 font-semibold">✗ Your Answer</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {showAnswer && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!showResults && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-lg"
              >
                Submit Quiz
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
