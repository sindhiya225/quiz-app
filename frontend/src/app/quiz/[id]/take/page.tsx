'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Quiz, Question } from '@/types';

interface Props {
  params: { id: string };
}

export default function TakeQuizPage({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const quizId = params.id;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionId -> selectedIndex
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) { router.replace('/dashboard'); return; }
    api.get(`/api/quizzes/${quizId}/`)
      .then((res) => setQuiz(res.data))
      .catch(() => setError('Failed to load quiz.'))
      .finally(() => setLoading(false));
  }, [quizId, attemptId, router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading quiz...</div>
  );

  if (error || !quiz) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">{error || 'Quiz not found.'}</div>
  );

  const questions: Question[] = quiz.questions || [];
  const current = questions[currentIndex];
  const totalQuestions = questions.length;
  const answered = answers[current?.id];
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const selectAnswer = (optionIndex: number) => {
    if (answers[current.id] !== undefined) return; // lock after first selection
    setAnswers((prev) => ({ ...prev, [current.id]: optionIndex }));
    // Submit answer to backend immediately
    api.post(`/api/attempts/${attemptId}/answers/`, {
      question_id: current.id,
      selected_option_index: optionIndex,
    }).catch(console.error);
  };

  const goNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/attempts/${attemptId}/complete/`);
      router.push(`/quiz/${quizId}/results?attemptId=${attemptId}`);
    } catch {
      setError('Failed to submit quiz.');
      setSubmitting(false);
    }
  };

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 truncate">{quiz.title}</span>
            <span className="text-sm text-gray-500 ml-4 shrink-0">
              {currentIndex + 1} / {totalQuestions}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {/* Question */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <p className="text-sm text-gray-400 mb-2">Question {currentIndex + 1}</p>
          <p className="text-gray-900 font-medium text-base leading-relaxed">{current.text}</p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {current.options.map((option, idx) => {
            const isSelected = answered === idx;
            return (
              <button
                key={idx}
                onClick={() => selectAnswer(idx)}
                disabled={answered !== undefined}
                className={`w-full text-left p-4 rounded-xl border text-sm transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                    : answered !== undefined
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-700 cursor-pointer'
                }`}
              >
                <span className="inline-block w-6 h-6 rounded-full border border-current text-xs font-bold text-center leading-5 mr-3 shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                {option}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {!isLastQuestion ? (
            <button
              onClick={goNext}
              disabled={answered === undefined}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!allAnswered || submitting}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {submitting ? 'Submitting...' : 'Finish Quiz'}
            </button>
          )}
        </div>

        {/* Question dots navigation */}
        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                i === currentIndex
                  ? 'bg-blue-600 text-white'
                  : answers[q.id] !== undefined
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
