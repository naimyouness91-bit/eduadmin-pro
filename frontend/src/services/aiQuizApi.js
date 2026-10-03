import api from './api';

export const aiQuizAPI = {
  options: () => api.get('/ai-quiz/options'),
  listDocuments: (params) => api.get('/ai-quiz/documents', { params }),
  uploadDocument: (formData, onUploadProgress) =>
    api.post('/ai-quiz/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  preview: (data) => api.post('/ai-quiz/preview', data, { timeout: 180000 }),
  generate: (data) => api.post('/ai-quiz/generate', data, { timeout: 120000 }),
  listQuizzes: (params) => api.get('/ai-quiz', { params }),
  getQuiz: (id) => api.get(`/ai-quiz/${id}`),
  listAttempts: (quizId, params) => api.get(`/ai-quiz/${quizId}/attempts`, { params }),
  publish: (id) => api.post(`/ai-quiz/${id}/publish`),
  deleteQuiz: (id) => api.delete(`/ai-quiz/${id}`),
  submit: (id, data) => api.post(`/ai-quiz/${id}/submit`, data),
  getAttempt: (quizId, attemptId) => api.get(`/ai-quiz/${quizId}/attempts/${attemptId}`),
};
