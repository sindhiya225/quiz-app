'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import api from '@/lib/api';

export default function CreateQuizPage() {
  const router = useRouter();
  const [form, setForm] = useState({ topic: '', num_questions: 10, difficulty: 'medium' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/quizzes/', form);
      // Immediately start an attempt for the new quiz
      const attemptRes = await api.post(`/api/quizzes/${res.data.id}/attempts/`);
      router.push(`/quiz/${res.data.id}/take?attemptId=${attemptRes.data.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to generate quiz. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create a Quiz</h1>
          <p className="text-gray-500 text-sm mt-1">AI will generate questions based on your topic.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <input
                type="text"
                required
                minLength={2}
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Python programming, World War II, Solar System"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Questions: <span className="font-bold text-blue-600">{form.num_questions}</span>
              </label>
              <input
                type="range"
                min={5}
                max={20}
                value={form.num_questions}
                onChange={(e) => setForm({ ...form, num_questions: Number(e.target.value) })}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5</span><span>20</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, difficulty: d })}
                    className={`py-2 text-sm font-medium rounded-lg border capitalize transition-colors ${
                      form.difficulty === d
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 text-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Generating quiz with AI...' : 'Generate Quiz'}
            </button>

            {loading && (
              <p className="text-center text-xs text-gray-400">
                This may take 10–20 seconds...
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
