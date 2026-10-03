import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';
import { getStoredToken } from './utils/authSession';
import { setAuthHeader } from './services/api';
import { useAuthHydrated } from './hooks/useAuthHydrated';
import { AUTH_BOOTSTRAP_TIMEOUT_MS } from './utils/withTimeout';
import ColorThemeSync from './components/common/ColorThemeSync';
import ThemeModeSync from './components/common/ThemeModeSync';
import { MotionProvider } from './motion';

// ─── Layouts ──────────────────────────────────────────────────
import DashboardLayout from './components/common/DashboardLayout';
import AuthLayout from './components/common/AuthLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';

// ─── Public Pages ─────────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/landing/LandingPage'));

// ─── Auth Pages (lazy) ──
const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

// ─── Lazy-loaded Pages ────────────────────────────────────────
const Dashboard       = lazy(() => import('./pages/dashboard/Dashboard'));
const Students        = lazy(() => import('./pages/students/Students'));
const StudentDetail   = lazy(() => import('./pages/students/StudentDetail'));
const Teachers        = lazy(() => import('./pages/teachers/Teachers'));
const TeacherDetail   = lazy(() => import('./pages/teachers/TeacherDetail'));
const ParentsRoutes   = lazy(() => import('./pages/parents'));
const Courses         = lazy(() => import('./pages/courses/Courses'));
const CourseDetail    = lazy(() => import('./pages/courses/CourseDetail'));
const Attendance      = lazy(() => import('./pages/attendance/Attendance'));
const Grades          = lazy(() => import('./pages/grades/Grades'));
const Messages        = lazy(() => import('./pages/messages/Messages'));
const Schedule        = lazy(() => import('./pages/schedule/Schedule'));
const Analytics       = lazy(() => import('./pages/analytics/Analytics'));
const Announcements   = lazy(() => import('./pages/announcements/Announcements'));
const Assignments     = lazy(() => import('./pages/assignments/Assignments'));
const ExamPrepCenter  = lazy(() => import('./pages/exam-prep/ExamPrepCenter'));
const AIStudyAssistant = lazy(() => import('./pages/AIStudyAssistant'));
const Settings        = lazy(() => import('./pages/settings/Settings'));
const Profile         = lazy(() => import('./pages/settings/Profile'));
const EventsCalendar  = lazy(() => import('./pages/events/EventsCalendar'));
const ActivityLog     = lazy(() => import('./pages/admin/ActivityLog'));
const ImportExport    = lazy(() => import('./pages/admin/ImportExport'));
const SecurityCenter  = lazy(() => import('./pages/admin/SecurityCenter'));
const BackupRestore   = lazy(() => import('./pages/admin/BackupRestore'));
const GroupsRoutes    = lazy(() => import('./pages/Groups/index'));
const MeetingsRoutes  = lazy(() => import('./pages/Meetings/index'));
const AIQuizRoutes    = lazy(() => import('./pages/AIQuiz/index'));
const BulletinsPage   = lazy(() => import('./pages/bulletins/BulletinsPage'));

const LoadingSpinner = ({ fullScreen = false } = {}) => (
  <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen bg-surface-950' : 'h-full min-h-64'}`}>
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-primary-200 dark:border-primary-900" />
      <div className="absolute inset-0 rounded-full border-4 border-t-primary-500 animate-spin" />
    </div>
  </div>
);

function HomeRoute() {
  const hydrated = useAuthHydrated();
  const { isAuthenticated, token, user } = useAuthStore();

  if (!hydrated) {
    return <LoadingSpinner fullScreen />;
  }

  if (isAuthenticated && token && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <LandingPage />
    </Suspense>
  );
}

export default function App() {
  const hydrated = useAuthHydrated();

  useEffect(() => {
    if (!hydrated) return undefined;

    const token = getStoredToken();
    if (!token) {
      useAuthStore.getState().markAuthBootstrapped();
      return undefined;
    }

    setAuthHeader(token);

    let cancelled = false;
    const failSafe = window.setTimeout(() => {
      if (!cancelled) {
        useAuthStore.getState().markAuthBootstrapped();
      }
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    useAuthStore
      .getState()
      .fetchMe()
      .catch(() => {
        /* 401 handled by axios interceptor; network/timeout — keep session from storage */
      })
      .finally(() => {
        if (!cancelled) {
          window.clearTimeout(failSafe);
          useAuthStore.getState().markAuthBootstrapped();
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(failSafe);
    };
  }, [hydrated]);

  return (
    <MotionProvider>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ThemeModeSync />
      <ColorThemeSync />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'toast-premium',
          style: {
            background: 'var(--toast-bg, #1e293b)',
            color: 'var(--toast-color, #f1f5f9)',
            borderRadius: '12px',
            border: '1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        {/* Public Home / Landing */}
        <Route path="/" element={<HomeRoute />} />

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login"           element={<Suspense fallback={<LoadingSpinner />}><Login /></Suspense>} />
          <Route path="/register"        element={<Navigate to="/login" replace />} />
          <Route path="/signup"          element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<Suspense fallback={<LoadingSpinner />}><ForgotPassword /></Suspense>} />
          <Route path="/reset-password"  element={<Suspense fallback={<LoadingSpinner />}><ResetPassword /></Suspense>} />
        </Route>

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Suspense fallback={<LoadingSpinner />}><Dashboard /></Suspense>} />

            {/* Students & Teachers — admin only */}
            <Route element={<AdminRoute />}>
              <Route path="/students"        element={<Suspense fallback={<LoadingSpinner />}><Students /></Suspense>} />
              <Route path="/students/:id"    element={<Suspense fallback={<LoadingSpinner />}><StudentDetail /></Suspense>} />
              <Route path="/teachers"        element={<Suspense fallback={<LoadingSpinner />}><Teachers /></Suspense>} />
              <Route path="/teachers/:id"    element={<Suspense fallback={<LoadingSpinner />}><TeacherDetail /></Suspense>} />
              <Route path="/parents/*"       element={<Suspense fallback={<LoadingSpinner />}><ParentsRoutes /></Suspense>} />
            </Route>

            {/* Courses */}
            <Route path="/courses"         element={<Suspense fallback={<LoadingSpinner />}><Courses /></Suspense>} />
            <Route path="/courses/:id"     element={<Suspense fallback={<LoadingSpinner />}><CourseDetail /></Suspense>} />

            {/* Other Modules */}
            <Route path="/attendance"      element={<Suspense fallback={<LoadingSpinner />}><Attendance /></Suspense>} />
            <Route path="/grades"          element={<Suspense fallback={<LoadingSpinner />}><Grades /></Suspense>} />
            <Route path="/bulletins"       element={<Suspense fallback={<LoadingSpinner />}><BulletinsPage /></Suspense>} />
            <Route path="/messages"        element={<Suspense fallback={<LoadingSpinner />}><Messages /></Suspense>} />
            <Route path="/schedule"        element={<Suspense fallback={<LoadingSpinner />}><Schedule /></Suspense>} />
            <Route path="/announcements"   element={<Suspense fallback={<LoadingSpinner />}><Announcements /></Suspense>} />
            <Route path="/assignments"    element={<Suspense fallback={<LoadingSpinner />}><Assignments /></Suspense>} />
            <Route path="/groups/*"       element={<Suspense fallback={<LoadingSpinner />}><GroupsRoutes /></Suspense>} />
            <Route path="/meetings/*"     element={<Suspense fallback={<LoadingSpinner />}><MeetingsRoutes /></Suspense>} />
            <Route path="/exam-prep"      element={<Suspense fallback={<LoadingSpinner />}><ExamPrepCenter /></Suspense>} />
            <Route path="/ai-study"      element={<Suspense fallback={<LoadingSpinner />}><AIStudyAssistant /></Suspense>} />
            <Route path="/ai-quiz/*"     element={<Suspense fallback={<LoadingSpinner />}><AIQuizRoutes /></Suspense>} />
            <Route path="/profile"         element={<Suspense fallback={<LoadingSpinner />}><Profile /></Suspense>} />
            <Route path="/events"         element={<Suspense fallback={<LoadingSpinner />}><EventsCalendar /></Suspense>} />

            <Route element={<AdminRoute />}>
              <Route path="/analytics"    element={<Suspense fallback={<LoadingSpinner />}><Analytics /></Suspense>} />
              <Route path="/settings"     element={<Suspense fallback={<LoadingSpinner />}><Settings /></Suspense>} />
              <Route path="/activity-log" element={<Suspense fallback={<LoadingSpinner />}><ActivityLog /></Suspense>} />
              <Route path="/import-export" element={<Suspense fallback={<LoadingSpinner />}><ImportExport /></Suspense>} />
              <Route path="/security" element={<Suspense fallback={<LoadingSpinner />}><SecurityCenter /></Suspense>} />
              <Route path="/backups" element={<Suspense fallback={<LoadingSpinner />}><BackupRestore /></Suspense>} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </MotionProvider>
  );
}