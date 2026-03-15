'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { QuizAttempt } from '@/types';

interface Props {
  params: { id: string };
}

export default function ResultsPage({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const quizId = params.id;

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!attemptId) { router.replace('/dashboard'); return; }
    api.get(`/api/attempts/${attemptId}/`)
      .then((res) => setAttempt(res.data))
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false));
  }, [attemptId, router]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      Loading results...
    </div>
  );

  if (error || !attempt) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-500">
      {error || 'Results not found.'}
    </div>
  );

  const pct = attempt.score_percentage;
  const scoreColor = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-500';
  const scoreLabel = pct >= 70 ? 'Great job!' : pct >= 40 ? 'Good effort!' : 'Keep practicing!';

  const sortedAnswers = [...(attempt.answers || [])].sort(
    (a, b) => a.question_order - b.question_order
  );

  const retakeQuiz = async () => {
    try {
      const res = await api.post(`/api/quizzes/${quizId}/attempts/`);
      router.push(`/quiz/${quizId}/take?attemptId=${res.data.id}`);
    } catch {
      setError('Could not start a new attempt.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="font-semibold text-gray-900 truncate">{attempt.quiz_title}</h1>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline shrink-0 ml-4">
            Dashboard
          </Link>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Score card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Your Score</p>
          <p className={`text-5xl font-bold mb-2 ${scoreColor}`}>{pct}%</p>
          <p className="text-sm text-gray-500">
            {attempt.score} correct out of {attempt.total_questions} questions
          </p>
          <p className={`text-sm font-medium mt-3 ${scoreColor}`}>{scoreLabel}</p>

          <div className="flex gap-3 mt-6 justify-center">
            <button
              onClick={retakeQuiz}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Retake Quiz
            </button>
            <Link
              href="/quiz/create"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              New Quiz
            </Link>
          </div>
        </div>

        {/* Answer review */}
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Review Answers
        </h2>
        <div className="space-y-3">
          {sortedAnswers.map((answer) => {
            const isExpanded = expandedId === answer.question_id;
            return (
              <div
                key={answer.question_id}
                className={`bg-white rounded-xl border p-4 ${
                  answer.is_correct ? 'border-green-200' : 'border-red-200'
                }`}
              >
                {/* Question row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : answer.question_id)}
                  className="w-full text-left flex items-start gap-3"
                >
                  <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    answer.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {answer.is_correct ? '✓' : '✗'}
                  </span>
                  <span className="text-sm text-gray-800 flex-1 leading-relaxed text-left">
                    {answer.question_text}
                  </span>
                  <span className="text-gray-400 text-xs shrink-0 mt-0.5">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 space-y-2 pl-8">
                    {answer.question_options.map((opt, idx) => {
                      const isCorrect = idx === answer.correct_option_index;
                      const isChosen = idx === answer.selected_option_index;
                      let cls = 'border-gray-100 text-gray-500';
                      if (isCorrect) cls = 'border-green-300 bg-green-50 text-green-800 font-medium';
                      else if (isChosen && !isCorrect) cls = 'border-red-300 bg-red-50 text-red-700 line-through';

                      return (
                        <div key={idx} className={`text-sm px-3 py-2 rounded-lg border ${cls}`}>
                          <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                          {opt}
                          {isCorrect && <span className="ml-2 text-green-600 text-xs">✓ Correct</span>}
                          {isChosen && !isCorrect && <span className="ml-2 text-red-500 text-xs">Your answer</span>}
                        </div>
                      );
                    })}
                    {answer.explanation && (
                      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                        <span className="font-semibold">Explanation: </span>{answer.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
