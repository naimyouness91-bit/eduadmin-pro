import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faShieldAlt,
  faArrowRight,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';
import { useAuthStore } from '../../store';
import ThemeToggle from '../../components/common/ThemeToggle';
import { buildLoginPayload } from '../../utils/authSession';
import { parseApiErrors } from '../../utils/parseApiErrors';
import toast from 'react-hot-toast';

const inputBase =
  'w-full bg-white dark:bg-surface-950/60 border rounded-xl pl-10 pr-4 py-3 ' +
  'text-surface-900 dark:text-white placeholder-surface-400 dark:placeholder-surface-500 ' +
  'focus:outline-none focus:border-primary-500/70 focus:ring-2 focus:ring-primary-500/25 ' +
  'transition-all duration-200 text-sm';

export default function Login() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', remember_me: false, two_factor_code: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [requires2fa, setRequires2fa] = useState(false);
  const [errors, setErrors] = useState({});
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const next = {};
    const email = form.email?.trim();
    if (!email) next.email = t('authPage.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('authPage.emailInvalid');
    if (!form.password) next.password = t('authPage.passwordRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!requires2fa && !validateForm()) {
      toast.error(t('authPage.fixFields'));
      return;
    }

    try {
      const payload = buildLoginPayload(form, requires2fa);
      const result = await login(payload);

      if (result?.requires_2fa) {
        setRequires2fa(true);
        toast.success(result.message || t('authPage.enter2faToast'));
        return;
      }

      const role = result?.user?.role;
      const roleLabel = role ? t(`roles.${role}`) : '';
      toast.success(t('authPage.welcomeBack', { role: roleLabel }));
      navigate(result?.redirect || '/dashboard', { replace: true });
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        toast.error(fieldErrors.code || fieldErrors.email || fieldErrors.password || general || t('authPage.invalidCredentials'));
      } else {
        toast.error(general || t('authPage.loginFailed'));
      }
    }
  };

  return (
    <div
      className="relative min-h-screen min-h-[100dvh] flex items-center justify-center overflow-hidden bg-surface-50 dark:bg-surface-950 px-4 py-10 sm:px-6 transition-colors duration-300"
      aria-label={t('authPage.signInAria')}
    >
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#f1f5f9,#f8fafc)] dark:bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,1),rgba(2,6,23,1))] transition-[background] duration-300"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-primary-500/10 dark:bg-primary-500/20 blur-[120px] animate-sidebar-blob"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-24 w-[480px] h-[480px] rounded-full bg-violet-600/10 dark:bg-violet-600/15 blur-[130px] animate-sidebar-blob-delayed"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/[0.04] dark:bg-indigo-500/[0.07] blur-[100px] animate-sidebar-logo-glow"
        aria-hidden
      />

      <div className="fixed top-4 end-4 sm:top-6 sm:end-6 z-20">
        <ThemeToggle variant="landing" />
      </div>

      <Link
        to="/"
        className="login-back-home group fixed top-4 left-4 sm:top-6 sm:left-6 z-20"
        aria-label={t('authPage.backToHome')}
      >
        <FontAwesomeIcon
          icon={faArrowLeft}
          className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
          aria-hidden
        />
        <span>{t('authPage.backToHome')}</span>
      </Link>

      <div className="relative w-full max-w-[440px] animate-slide-up">
        {/* Glass login card */}
        <div
          className={[
            'relative rounded-3xl border border-surface-200/90 bg-white/85 backdrop-blur-2xl',
            'dark:border-white/[0.08] dark:bg-surface-900/55',
            'shadow-[0_0_0_1px_rgba(15,23,42,0.04)_inset,0_24px_80px_rgba(15,23,42,0.08)]',
            'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_24px_80px_rgba(0,0,0,0.45),0_0_60px_rgba(99,102,241,0.08)]',
            'p-8 sm:p-10 transition-all duration-300',
          ].join(' ')}
        >
          <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-primary-500/5 dark:from-primary-500/10 via-transparent to-transparent opacity-80" aria-hidden />

          <div className="relative text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary shadow-glow mb-5 ring-1 ring-surface-200/80 dark:ring-white/10 animate-sidebar-logo-glow">
              <FontAwesomeIcon icon={faGraduationCap} className="text-white text-xl" aria-hidden />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400/90 mb-2">{t('authPage.brandName')}</p>
            <h1 className="font-display font-bold text-2xl sm:text-[1.75rem] text-surface-900 dark:text-white tracking-tight mb-2">
              {requires2fa ? t('authPage.title2fa') : t('authPage.titleWelcome')}
            </h1>
            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed max-w-xs mx-auto">
              {requires2fa ? t('authPage.subtitle2fa') : t('authPage.subtitleSignIn')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-5" noValidate>
            {!requires2fa ? (
              <>
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    {t('authPage.emailLabel')}
                  </label>
                  <div className="relative group">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 w-4 h-4 pointer-events-none transition-colors group-focus-within:text-primary-400"
                      aria-hidden
                    />
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      autoFocus
                      placeholder={t('authPage.emailPlaceholder')}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'login-email-error' : undefined}
                      className={`${inputBase} ${errors.email ? 'border-danger-500/70 ring-2 ring-danger-500/20' : 'border-surface-300 dark:border-surface-700/80 hover:border-surface-400 dark:hover:border-surface-600'}`}
                    />
                  </div>
                  {errors.email && (
                    <p id="login-email-error" className="text-danger-400 text-xs mt-1.5" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    {t('authPage.passwordLabel')}
                  </label>
                  <div className="relative group">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 w-4 h-4 pointer-events-none transition-colors group-focus-within:text-primary-400"
                      aria-hidden
                    />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      autoComplete="current-password"
                      placeholder={t('authPage.passwordPlaceholder')}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'login-password-error' : undefined}
                      className={`${inputBase} pr-11 ${errors.password ? 'border-danger-500/70 ring-2 ring-danger-500/20' : 'border-surface-300 dark:border-surface-700/80 hover:border-surface-400 dark:hover:border-surface-600'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 transition-colors p-0.5 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      aria-label={showPassword ? t('authPage.hidePassword') : t('authPage.showPassword')}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="w-4 h-4" />
                    </button>
                  </div>
                  {errors.password && (
                    <p id="login-password-error" className="text-danger-400 text-xs mt-1.5" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      name="remember_me"
                      checked={form.remember_me}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-950/80 text-primary-500 focus:ring-primary-500/30 focus:ring-offset-0 transition-colors"
                    />
                    <span className="text-sm text-surface-600 dark:text-surface-400 group-hover:text-surface-800 dark:group-hover:text-surface-300 transition-colors">
                      {t('authPage.rememberMe')}
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200 focus:outline-none focus:underline"
                  >
                    {t('authPage.forgotPassword')}
                  </Link>
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="login-2fa" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  {t('authPage.authenticatorCode')}
                </label>
                <div className="relative group">
                  <FontAwesomeIcon
                    icon={faShieldAlt}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 w-4 h-4 pointer-events-none transition-colors group-focus-within:text-primary-400"
                    aria-hidden
                  />
                  <input
                    id="login-2fa"
                    type="text"
                    name="two_factor_code"
                    value={form.two_factor_code}
                    onChange={handleChange}
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder={t('authPage.codePlaceholder')}
                    aria-invalid={Boolean(errors.code)}
                    aria-describedby={errors.code ? 'login-2fa-error' : undefined}
                    className={`${inputBase} text-center tracking-[0.45em] font-mono text-lg ${errors.code ? 'border-danger-500/70 ring-2 ring-danger-500/20' : 'border-surface-300 dark:border-surface-700/80'}`}
                  />
                </div>
                {errors.code && (
                  <p id="login-2fa-error" className="text-danger-400 text-xs mt-1.5" role="alert">
                    {errors.code}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setRequires2fa(false)}
                  className="text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 mt-2.5 transition-colors focus:outline-none focus:underline"
                >
                  {t('authPage.backToLogin')}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:opacity-95 hover:shadow-[0_0_32px_rgba(99,102,241,0.35)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-glow disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none mt-1"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                  {t('authPage.signingIn')}
                </span>
              ) : (
                <>
                  {t('authPage.signIn')}
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" aria-hidden />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-surface-600 dark:text-surface-500 text-xs sm:text-sm mt-8 leading-relaxed animate-fade-in">
          {t('authPage.accountsManaged')}
          <span className="block sm:inline sm:ml-1">{t('authPage.contactAdmin')}</span>
        </p>

        <p className="text-center text-surface-500 dark:text-surface-600 text-[11px] mt-6">{t('authPage.copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </div>
  );
}
