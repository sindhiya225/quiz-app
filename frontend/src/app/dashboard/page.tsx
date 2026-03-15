'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '@/components/ui/Navbar';
import api from '@/lib/api';
import { Quiz, QuizAttempt } from '@/types';

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[difficulty] || 'bg-gray-100 text-gray-600'}`}>
      {difficulty}
    </span>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'history'>('quizzes');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/api/quizzes/'),
      api.get('/api/attempts/'),
    ]).then(([qRes, aRes]) => {
      setQuizzes(qRes.data);
      setHistory(aRes.data);
    }).catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
      </div>
    );
  }

  const startQuiz = async (quizId: number) => {
    try {
      const res = await api.post(`/api/quizzes/${quizId}/attempts/`);
      router.push(`/quiz/${quizId}/take?attemptId=${res.data.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/quiz/create"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Quiz
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{quizzes.length}</div>
            <div className="text-sm text-gray-500 mt-1">Quizzes Created</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{history.length}</div>
            <div className="text-sm text-gray-500 mt-1">Attempts Completed</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
            <div className="text-2xl font-bold text-gray-900">
              {history.length > 0
                ? Math.round(history.reduce((sum, a) => sum + a.score_percentage, 0) / history.length)
                : '--'}%
            </div>
            <div className="text-sm text-gray-500 mt-1">Avg Score</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          {(['quizzes', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'quizzes' ? 'My Quizzes' : 'History'}
            </button>
          ))}
        </div>

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          quizzes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-4">No quizzes yet.</p>
              <Link href="/quiz/create" className="text-blue-600 hover:underline text-sm">
                Create your first quiz →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight pr-2">{quiz.title}</h3>
                    <DifficultyBadge difficulty={quiz.difficulty} />
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    {quiz.num_questions} questions · {quiz.attempt_count} attempt{quiz.attempt_count !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => startQuiz(quiz.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
                  >
                    Take Quiz
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          history.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No completed attempts yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((attempt) => (
                <Link
                  key={attempt.id}
                  href={`/quiz/${attempt.quiz}/results?attemptId=${attempt.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{attempt.quiz_title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {attempt.quiz_difficulty} · {new Date(attempt.completed_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${
                      attempt.score_percentage >= 70 ? 'text-green-600' : 
                      attempt.score_percentage >= 40 ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {attempt.score_percentage}%
                    </span>
                    <p className="text-xs text-gray-400">{attempt.score}/{attempt.total_questions}</p>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
