/**
 * Reject when a promise does not settle within `ms`.
 */
export function withTimeout(promise, ms, message = 'Request timed out') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

/** Dev: XAMPP MySQL cold starts can exceed 20s; production stays strict. */
export const API_TIMEOUT_MS = import.meta.env.DEV ? 45000 : 20000;
export const AUTH_BOOTSTRAP_TIMEOUT_MS = import.meta.env.DEV ? 35000 : 12000;
export const HYDRATION_TIMEOUT_MS = 3000;
