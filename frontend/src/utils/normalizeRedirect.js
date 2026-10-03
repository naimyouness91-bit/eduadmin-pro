import { resolveLoginRedirect } from './authSession';

/** @deprecated use resolveLoginRedirect from authSession */
export function normalizeRedirect(url, role) {
  return resolveLoginRedirect(url, role);
}
