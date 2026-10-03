/** Shared auth storage helpers — keep axios and zustand in sync. */

export const AUTH_STORAGE_KEY = 'eduadmin-auth';
export const AUTH_REMEMBER_FLAG = 'eduadmin-remember-me';

function parseStoredState(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

/** Whether the last login opted into persistent storage. */
export function isRememberMeEnabled() {
  return localStorage.getItem(AUTH_REMEMBER_FLAG) === '1';
}

/** Select storage backend for the current session. */
export function getAuthStorage() {
  return isRememberMeEnabled() ? localStorage : sessionStorage;
}

/** Call on login before writing auth state. */
export function setRememberMe(remember) {
  if (remember) {
    localStorage.setItem(AUTH_REMEMBER_FLAG, '1');
    sessionStorage.removeItem(AUTH_REMEMBER_FLAG);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    localStorage.removeItem(AUTH_REMEMBER_FLAG);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.setItem(AUTH_REMEMBER_FLAG, '0');
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function readAuthState() {
  try {
    if (isRememberMeEnabled()) {
      return parseStoredState(localStorage.getItem(AUTH_STORAGE_KEY));
    }
    const sessionState = parseStoredState(sessionStorage.getItem(AUTH_STORAGE_KEY));
    if (sessionState) return sessionState;
    return parseStoredState(localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return readAuthState()?.token ?? null;
}

export function writeAuthState({ user, token, isAuthenticated = true, rememberMe }) {
  if (rememberMe !== undefined) {
    setRememberMe(Boolean(rememberMe));
  }

  const payload = {
    state: {
      user,
      token,
      isAuthenticated: Boolean(isAuthenticated && token),
    },
    version: 0,
  };

  const storage = getAuthStorage();
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));

  if (!isRememberMeEnabled()) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_REMEMBER_FLAG);
  sessionStorage.removeItem(AUTH_REMEMBER_FLAG);
}

/** Zustand persist adapter — respects remember-me storage. */
export const authPersistStorage = {
  getItem: (name) => getAuthStorage().getItem(name),
  setItem: (name, value) => getAuthStorage().setItem(name, value),
  removeItem: (name) => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

/** Role → SPA dashboard route (single dashboard, role-specific content). */
export function getDashboardPath(role) {
  const normalized = String(role || '').toLowerCase().trim();

  switch (normalized) {
    case 'super_admin':
    case 'admin':
      return '/dashboard';
    case 'teacher':
      return '/dashboard';
    case 'student':
      return '/dashboard';
    case 'parent':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

export function getRoleLabel(role) {
  const labels = {
    super_admin: 'Admin',
    admin: 'Admin',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
  };
  return labels[String(role || '').toLowerCase()] || 'User';
}

/** Map API redirect_url with role fallback. */
export function resolveLoginRedirect(redirectUrl, role) {
  if (role) return getDashboardPath(role);

  const map = {
    '/admin/dashboard': '/dashboard',
    '/teacher/dashboard': '/dashboard',
    '/student/dashboard': '/dashboard',
    '/parent/dashboard': '/dashboard',
  };

  if (!redirectUrl) return '/dashboard';
  const mapped = map[redirectUrl];
  if (mapped) return mapped;
  if (typeof redirectUrl === 'string' && redirectUrl.startsWith('/') && !redirectUrl.startsWith('//')) {
    return redirectUrl;
  }
  return '/dashboard';
}

export function buildLoginPayload(form, requires2fa = false) {
  const email = form.email?.trim();
  const password = form.password;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const payload = {
    email,
    password,
    remember_me: Boolean(form.remember_me),
  };

  if (requires2fa) {
    payload.code = form.two_factor_code?.trim() || '';
  }

  return payload;
}
