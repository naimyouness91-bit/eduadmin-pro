export function parseApiErrors(error) {
  const data = error?.response?.data;
  const fieldErrors = {};

  if (data?.errors && typeof data.errors === 'object') {
    Object.entries(data.errors).forEach(([key, messages]) => {
      fieldErrors[key] = Array.isArray(messages) ? messages[0] : String(messages);
    });
  }

  const general =
    data?.message ||
    (Object.keys(fieldErrors).length === 0 ? error?.message : null) ||
    null;

  return { fieldErrors, general };
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 1);
  const masked =
    local.length <= 2
      ? `${visible}***`
      : `${local.slice(0, 2)}${'*'.repeat(Math.min(4, local.length - 2))}`;
  return `${masked}@${domain}`;
}
