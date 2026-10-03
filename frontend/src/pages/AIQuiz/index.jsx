import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import AIQuizPage from './AIQuizPage';
import QuizResult from './QuizResult';

function AIQuizHome() {
  const { hasRole } = useAuthStore();
  const isEducationalRole = hasRole('teacher') || hasRole('student');

  if (!isEducationalRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AIQuizPage />;
}

function TeacherGenerateRoute() {
  const { hasRole } = useAuthStore();

  if (!hasRole('teacher')) {
    return <Navigate to="/ai-quiz" replace />;
  }

  return <AIQuizPage />;
}

function QuizDetailRoute() {
  const { hasRole } = useAuthStore();
  const isEducationalRole = hasRole('teacher') || hasRole('student');

  if (!isEducationalRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AIQuizPage />;
}

function QuizResultRoute() {
  const { hasRole } = useAuthStore();
  const isEducationalRole = hasRole('teacher') || hasRole('student');

  if (!isEducationalRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <QuizResult />;
}

export default function AIQuizRoutes() {
  return (
    <Routes>
      <Route index element={<AIQuizHome />} />
      <Route path="generate" element={<TeacherGenerateRoute />} />
      <Route path=":id/result/:attemptId" element={<QuizResultRoute />} />
      <Route path=":id" element={<QuizDetailRoute />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
