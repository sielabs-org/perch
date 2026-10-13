import type { Quiz, QuizSummary } from './types';

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  listQuizzes: () => request<QuizSummary[]>('/quizzes'),
  getQuiz: (id: string) => request<Quiz>(`/quizzes/${id}`),
  createQuiz: (body: Partial<Quiz>) =>
    request<Quiz>('/quizzes', { method: 'POST', body: JSON.stringify(body) }),
  updateQuiz: (id: string, body: Partial<Quiz>) =>
    request<Quiz>(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  duplicateQuiz: (id: string) =>
    request<Quiz>(`/quizzes/${id}/duplicate`, { method: 'POST' }),
  deleteQuiz: (id: string) => request<void>(`/quizzes/${id}`, { method: 'DELETE' }),
  lookupSession: (code: string) =>
    request<{ code: string; title: string; emoji: string; phase: string; playerCount: number }>(
      `/sessions/${code}`,
    ),
};
