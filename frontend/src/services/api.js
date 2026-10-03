import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AUTH_STORAGE_KEY,
  clearAuthState,
  getStoredToken,
  writeAuthState,
} from '../utils/authSession';
import { LANG_STORAGE_KEY } from '../i18n';
import { API_TIMEOUT_MS } from '../utils/withTimeout';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8888/api',
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
});

export function setAuthHeader(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

function syncAuthHeaderFromStorage() {
  setAuthHeader(getStoredToken());
}

syncAuthHeaderFromStorage();

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const lang = localStorage.getItem(LANG_STORAGE_KEY) || localStorage.getItem('i18nextLng') || 'en';
    config.headers['Accept-Language'] = lang.split('-')[0];
  } catch {
    /* ignore */
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      clearAuthState();
      setAuthHeader(null);

      try {
        const { useAuthStore } = await import('../store');
        useAuthStore.getState().clearSession();
      } catch {
        /* store unavailable */
      }

      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error('Access denied');
      return Promise.reject(error);
    }

    if (status === 422) {
      return Promise.reject(error);
    }

    if (status >= 500) {
      toast.error('Server error');
      return Promise.reject(error);
    }

    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
      toast.error(isTimeout ? 'Request timed out — check that the API server is running' : 'Network error — check your connection');
      return Promise.reject(error);
    }

    const message = error.response?.data?.message;
    if (message && status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateProfile: (data) => {
    if (data instanceof FormData) {
      if (!data.has('_method')) {
        data.append('_method', 'PUT');
      }
      return api.post('/auth/profile', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put('/auth/profile', data);
  },
  changePassword: (data) => api.put('/auth/change-password', data),
  enable2fa: () => api.post('/auth/2fa/enable'),
  confirm2fa: (data) => api.post('/auth/2fa/confirm', data),
  disable2fa: (data) => api.post('/auth/2fa/disable', data),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const studentsAPI = {
  list: (params) => api.get('/students', { params }),
  stats: () => api.get('/students-stats'),
  create: (data) =>
    api.post('/students', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  get: (id) => api.get(`/students/${id}`),
  update: (id, data) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/students/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.put(`/students/${id}`, data);
  },
  delete: (id) => api.delete(`/students/${id}`),
  grades: (id, params) => api.get(`/students/${id}/grades`, { params }),
  attendance: (id, params) => api.get(`/students/${id}/attendance`, { params }),
};

export const teachersAPI = {
  list: (params) => api.get('/teachers', { params }),
  create: (data) => api.post('/teachers', data),
  get: (id) => api.get(`/teachers/${id}`),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  courses: (id, params) => api.get(`/teachers/${id}/courses`, { params }),
};

export const parentsAPI = {
  list: (params) => api.get('/parents', { params }),
  create: (data) => api.post('/parents', data),
  get: (id) => api.get(`/parents/${id}`),
  update: (id, data) => api.put(`/parents/${id}`, data),
  delete: (id) => api.delete(`/parents/${id}`),
  linkStudents: (id, data) => api.post(`/parents/${id}/link-students`, data),
};

export const coursesAPI = {
  list: (params) => api.get('/courses', { params }),
  create: (data) => api.post('/courses', data),
  get: (id) => api.get(`/courses/${id}`),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (id, data) => api.post(`/courses/${id}/enroll`, data),
  unenroll: (id, data) => api.post(`/courses/${id}/unenroll`, data),
  students: (id, params) => api.get(`/courses/${id}/students`, { params }),
};

export const gradesAPI = {
  list: (params) => api.get('/grades', { params }),
  stats: (params) => api.get('/grades-stats', { params }),
  create: (data) => api.post('/grades', data),
  update: (id, data) => api.put(`/grades/${id}`, data),
  delete: (id) => api.delete(`/grades/${id}`),
  bulk: (data) => api.post('/grades/bulk', data),
  courseReport: (courseId, params) =>
    api.get(`/courses/${courseId}/grade-report`, { params }),
};

export const attendanceAPI = {
  list: (params) => api.get('/attendance', { params }),
  mark: (data) => api.post('/attendance/mark', data),
  bulk: (data) => api.post('/attendance/bulk', data),
  generateQr: (data) => api.post('/attendance/qr/generate', data),
  scanQr: (data) => api.post('/attendance/qr/scan', data),
  report: (params) => api.get('/attendance/report', { params }),
};

export const messagesAPI = {
  conversations: () => api.get('/messages/conversations'),
  messages: (userId, params) => api.get(`/messages/${userId}`, { params }),
  send: (data) => api.post('/messages', data),
  unreadCount: () => api.get('/messages/unread-count'),
};

export const schedulesAPI = {
  list: (params) => api.get('/schedules', { params }),
  create: (data) => api.post('/schedules', data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
};

export const timetablesAPI = {
  meta: () => api.get('/timetables/meta'),
  mine: () => api.get('/timetables/mine'),
  list: (params) => api.get('/timetables', { params }),
  overview: () => api.get('/timetables-overview'),
  classSections: () => api.get('/class-sections'),
  createClassSection: (data) => api.post('/class-sections', data),
  sectionCourses: (sectionId) => api.get(`/class-sections/${sectionId}/courses`),
  get: (id) => api.get(`/timetables/${id}`),
  create: (data) => api.post('/timetables', data),
  autoGenerate: (data) => api.post('/timetables/auto-generate', data),
  update: (id, data) => api.put(`/timetables/${id}`, data),
  delete: (id) => api.delete(`/timetables/${id}`),
  duplicate: (id, data) => api.post(`/timetables/${id}/duplicate`, data),
  publish: (id) => api.post(`/timetables/${id}/publish`),
  conflicts: (id) => api.get(`/timetables/${id}/conflicts`),
  upsertEntry: (id, data) => api.post(`/timetables/${id}/entries`, data),
  moveEntry: (entryId, data) => api.put(`/timetable-entries/${entryId}/move`, data),
  deleteEntry: (entryId) => api.delete(`/timetable-entries/${entryId}`),
  exportPdf: async (id, label = 'timetable') => {
    const { data, headers } = await api.get(`/timetables/${id}/export`, {
      params: { format: 'pdf' },
      responseType: 'blob',
    });
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emploi-du-temps-${label}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    return headers;
  },
  printHtml: async (id) => {
    const { data } = await api.get(`/timetables/${id}/export`, {
      params: { format: 'html' },
      responseType: 'text',
    });
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) throw new Error('POPUP_BLOCKED');
    win.document.write(data);
    win.document.close();
    win.focus();
    win.print();
  },
  upcomingSessions: () => api.get('/timetable-entries/upcoming'),
  availableSlots: (entryId) => api.get(`/timetable-entries/${entryId}/available-slots`),
  submitRescheduleRequest: (entryId, data) =>
    api.post(`/timetable-entries/${entryId}/reschedule-requests`, data),
  myRescheduleRequests: () => api.get('/timetable-reschedule-requests/mine'),
  cancelRescheduleRequest: (id) => api.delete(`/timetable-reschedule-requests/${id}`),
  listRescheduleRequests: (params) => api.get('/timetable-reschedule-requests', { params }),
  approveRescheduleRequest: (id, data) =>
    api.post(`/timetable-reschedule-requests/${id}/approve`, data ?? {}),
  rejectRescheduleRequest: (id, data) =>
    api.post(`/timetable-reschedule-requests/${id}/reject`, data ?? {}),
};

export const announcementsAPI = {
  list: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

function downloadBlobResponse({ data, headers }, fallbackName) {
  const disposition = headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackName;
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const backupsAPI = {
  list: (params) => api.get('/backups', { params }),
  create: (data) => api.post('/backups', data),
  download: async (id, fallbackName = 'backup.zip') => {
    const res = await api.get(`/backups/${id}/download`, { responseType: 'blob' });
    downloadBlobResponse(res, fallbackName);
  },
  restore: (id) => api.post(`/backups/${id}/restore`, { confirm: true }),
  restoreUpload: (file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('confirm', '1');
    return api.post('/backups/restore-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/backups/${id}`),
};

export const securityAPI = {
  overview: () => api.get('/security/overview'),
  loginHistory: (params) => api.get('/security/login-history', { params }),
  failedAttempts: (params) => api.get('/security/failed-attempts', { params }),
  lastLogins: (params) => api.get('/security/last-logins', { params }),
  sessions: (params) => api.get('/security/sessions', { params }),
  revokeSession: (tokenId) => api.delete(`/security/sessions/${tokenId}`),
  devices: (params) => api.get('/security/devices', { params }),
  activity: (params) => api.get('/security/activity', { params }),
};

export const importExportAPI = {
  types: () => api.get('/import-export/types'),
  recentJobs: () => api.get('/import-export/jobs'),
  jobStatus: (id) => api.get(`/import-export/jobs/${id}`),
  import: (type, file, config = {}) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/import-export/import/${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config,
    });
  },
  downloadTemplate: async (type) => {
    const res = await api.get(`/import-export/templates/${type}`, { responseType: 'blob' });
    downloadBlobResponse(res, `${type}_import_template.xlsx`);
  },
  export: async (type) => {
    const res = await api.get(`/import-export/export/${type}`, { responseType: 'blob' });
    downloadBlobResponse(res, `${type}_export.xlsx`);
  },
};

export const aiExamPrepAPI = {
  suggestedPrompts: () => api.get('/ai-exam-prep/suggested-prompts'),
  weakSubjects: () => api.get('/ai-exam-prep/weak-subjects'),
  conversations: (params) => api.get('/ai-exam-prep/conversations', { params }),
  createConversation: (data) => api.post('/ai-exam-prep/conversations', data),
  getConversation: (id) => api.get(`/ai-exam-prep/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/ai-exam-prep/conversations/${id}`),
  sendMessage: (conversationId, data) =>
    api.post(`/ai-exam-prep/conversations/${conversationId}/messages`, data),
};

export const meetingsAPI = {
  list: (params) => api.get('/meetings', { params }),
  calendar: (params) => api.get('/meetings/calendar', { params }),
  get: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  join: (id) => api.post(`/meetings/${id}/join`),
  leave: (id) => api.post(`/meetings/${id}/leave`),
  participants: (id) => api.get(`/meetings/${id}/participants`),
  invite: (id, data) => api.post(`/meetings/${id}/invite`, data),
  attendance: (id) => api.get(`/meetings/${id}/attendance`),
  messages: (id, params) => api.get(`/meetings/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/meetings/${id}/messages`, data),
  raiseHand: (id, data) => api.post(`/meetings/${id}/raise-hand`, data),
  resources: (id) => api.get(`/meetings/${id}/resources`),
  uploadResource: (id, formData) =>
    api.post(`/meetings/${id}/resources`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadResource: async (meetingId, resourceId, fallbackName = 'file') => {
    const res = await api.get(`/meetings/${meetingId}/resources/${resourceId}/download`, {
      responseType: 'blob',
    });
    downloadBlobResponse(res, fallbackName);
  },
};

export const groupsAPI = {
  presets: () => api.get('/groups/presets'),
  teacherPresets: () => api.get('/groups/teacher-presets'),
  list: (params) => api.get('/groups', { params }),
  get: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  refreshAudience: (id) => api.post(`/groups/${id}/refresh-audience`),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
  members: (id) => api.get(`/groups/${id}/members`),
  eligibleStudents: (id) => api.get(`/groups/${id}/eligible-students`),
  addMembers: (id, data) => api.post(`/groups/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  messages: (id, params) => api.get(`/groups/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/groups/${id}/messages`, data),
  createDiscussion: (id, data) => api.post(`/groups/${id}/discussions`, data),
  postAnnouncement: (id, data) => api.post(`/groups/${id}/announcements`, data),
  scheduleMeeting: (id, data) => api.post(`/groups/${id}/meetings`, data),
  scheduleSession: (id, data) => api.post(`/groups/${id}/sessions`, data),
  shareAssignment: (id, data) => api.post(`/groups/${id}/assignments`, data),
  files: (id, params) => api.get(`/groups/${id}/files`, { params }),
  uploadFile: (id, formData) =>
    api.post(`/groups/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  downloadFile: async (groupId, messageId, fallbackName = 'file') => {
    const res = await api.get(`/groups/${groupId}/files/${messageId}/download`, {
      responseType: 'blob',
    });
    downloadBlobResponse(res, fallbackName);
  },
};

export { aiQuizAPI } from './aiQuizApi';

export const aiStudyAPI = {
  suggestedPrompts: () => api.get('/ai/suggested-prompts'),
  conversations: (params) => api.get('/ai/conversations', { params }),
  getConversation: (id) => api.get(`/ai/conversations/${id}`),
  chat: (data) => api.post('/ai/chat', data),
  summary: (data) => api.post('/ai/summary', data),
  quiz: (data) => api.post('/ai/quiz', data),
  studyPlan: (data) => api.post('/ai/study-plan', data),
};

export const assignmentsAPI = {
  list: (params) => api.get('/assignments', { params }),
  get: (id) => api.get(`/assignments/${id}`),
  create: (data, config = {}) =>
    api.post('/assignments', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config,
    }),
  update: (id, data, config = {}) =>
    api.post(`/assignments/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config,
    }),
  delete: (id) => api.delete(`/assignments/${id}`),
  submissions: (assignmentId, params) =>
    api.get(`/assignments/${assignmentId}/submissions`, { params }),
  submit: (assignmentId, data, config = {}) =>
    api.post(`/assignments/${assignmentId}/submissions`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config,
    }),
  reviewSubmission: (id, data) => api.put(`/submissions/${id}/review`, data),
  downloadAttachment: async (assignmentId, fallbackName = 'attachment') => {
    const { data, headers } = await api.get(`/assignments/${assignmentId}/attachment`, {
      responseType: 'blob',
    });
    const disposition = headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || fallbackName;
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
  downloadSubmissionFile: async (submissionId, fallbackName = 'submission') => {
    const { data, headers } = await api.get(`/submissions/${submissionId}/file`, {
      responseType: 'blob',
    });
    const disposition = headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || fallbackName;
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};

export const analyticsAPI = {
  overview: (params) => api.get('/analytics/overview', { params }),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (settings) => api.put('/settings', settings),
};

export const searchAPI = {
  query: (q, options = {}) => {
    const { signal, limit, ...rest } = options;
    return api.get('/search', {
      params: { q, ...(limit != null ? { limit } : {}), ...rest },
      signal,
    });
  },
};

export const activityLogsAPI = {
  list: (params) => api.get('/activity-logs', { params }),
};

export const eventsAPI = {
  list: (params) => api.get('/events', { params }),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
};

export const notificationsAPI = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const parentAPI = {
  children: () => api.get('/parent/children'),
  child: (id) => api.get(`/parent/children/${id}`),
  childGrades: (id, params) => api.get(`/parent/children/${id}/grades`, { params }),
  childGradeStats: (id, params) => api.get(`/parent/children/${id}/grades/stats`, { params }),
  childAttendance: (id, params) => api.get(`/parent/children/${id}/attendance`, { params }),
  childAssignments: (id, params) => api.get(`/parent/children/${id}/assignments`, { params }),
  childSchedule: (id) => api.get(`/parent/children/${id}/schedule`),
};

export const reportsAPI = {
  getBulletinStatus: (studentId) => api.get(`/students/${studentId}/bulletin/status`),

  getBulletinPreview: (studentId) => api.get(`/students/${studentId}/bulletin/preview`),

  getBulletinStatusesBatch: (studentIds) =>
    api.get('/bulletins/status', {
      params: { student_ids: studentIds },
      paramsSerializer: {
        indexes: null,
      },
    }),

  generateBulletin: (studentId) => api.post(`/students/${studentId}/bulletin/generate`),

  publishBulletin: (studentId) => api.post(`/students/${studentId}/bulletin/publish`),

  fetchBulletinHtml: async (studentId) => {
    const { data } = await api.get(`/students/${studentId}/bulletin`, {
      params: { format: 'html' },
      responseType: 'text',
    });
    return data;
  },

  downloadBulletin: async (studentId, studentCode, { inline = false } = {}) => {
    const { data, headers } = await api.get(`/students/${studentId}/bulletin`, {
      params: { format: 'pdf', disposition: inline ? 'inline' : 'attachment' },
      responseType: 'blob',
    });
    const blob = new Blob([data], { type: 'application/pdf' });
    const disposition = headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `bulletin-${studentCode || studentId}.pdf`;

    if (inline) {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      return filename;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);

    return filename;
  },
};

function toFormData(data) {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, value);
    }
  });
  return form;
}

export default api;
