export function getPasswordStrength(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const met = Object.values(requirements).filter(Boolean).length;
  const score = met === 3 ? 4 : met;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const label = password.length === 0 ? '' : labels[score] || 'Weak';

  return { requirements, score, label };
}
