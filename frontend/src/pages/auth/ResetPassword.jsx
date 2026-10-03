import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap, faLock, faEye, faEyeSlash,
  faShieldAlt, faArrowLeft, faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const [form, setForm] = useState({
    token:                searchParams.get('token') || '',
    email:                searchParams.get('email') || '',
    password:             '',
    password_confirmation:'',
  });
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [errors, setErrors]     = useState({});

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: [t('authPage.passwordsMismatch')] });
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(form);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else toast.error(data?.message || t('authPage.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (hasError) =>
    `w-full bg-surface-800 border ${hasError ? 'border-danger-500' : 'border-surface-700'} rounded-xl py-3 text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors text-sm`;

  /* Password strength */
  const strength = (() => {
    const p = form.password;
    let score = 0;
    if (p.length >= 8)          score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();

  const strengthLabels = ['', t('authPage.strengthWeak'), t('authPage.strengthFair'), t('authPage.strengthGood'), t('authPage.strengthStrong')];
  const strengthColors = ['', 'bg-danger-500', 'bg-warning-500', 'bg-info-500', 'bg-success-500'];

  const requirements = [
    { key: 'reqMinLength', met: form.password.length >= 8 },
    { key: 'reqUppercase', met: /[A-Z]/.test(form.password) },
    { key: 'reqNumber', met: /[0-9]/.test(form.password) },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <FontAwesomeIcon icon={faGraduationCap} className="text-white text-lg" />
          </div>
          <span className="font-display font-bold text-white text-xl">{t('authPage.brandName')}</span>
        </div>

        {done ? (
          /* ── Success ── */
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-success-500/15 flex items-center justify-center mx-auto mb-6">
              <FontAwesomeIcon icon={faCheckCircle} className="text-success-400 w-9 h-9" />
            </div>
            <h2 className="font-display font-bold text-2xl text-white mb-3">{t('authPage.resetDoneTitle')}</h2>
            <p className="text-surface-400 mb-4">{t('authPage.resetDoneMessage')}</p>
            <p className="text-sm text-surface-500">{t('authPage.redirectingLogin')}</p>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary-500/15 flex items-center justify-center mx-auto mb-6">
              <FontAwesomeIcon icon={faShieldAlt} className="text-primary-400 w-6 h-6" />
            </div>

            <h1 className="font-display font-bold text-3xl text-white mb-1.5 text-center">{t('authPage.setNewPassword')}</h1>
            <p className="text-surface-400 text-center mb-8">
              {t('authPage.chooseStrongPassword')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email (pre-filled, read-only display) */}
              {form.email && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-800 border border-surface-700">
                  <span className="text-xs text-surface-400">{t('authPage.resettingFor')}</span>
                  <span className="text-sm text-white font-medium truncate">{form.email}</span>
                </div>
              )}

              {/* New password */}
              <div>
                <div className="relative">
                  <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 w-4 h-4" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder={t('authPage.newPassword')}
                    className={`${inputCls(errors.password)} pl-10 pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                    aria-label={showPwd ? t('authPage.hidePassword') : t('authPage.showPassword')}
                  >
                    <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} className="w-4 h-4" />
                  </button>
                </div>

                {/* Strength meter */}
                {form.password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= strength ? strengthColors[strength] : 'bg-surface-700'}`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strengthColors[strength].replace('bg-','text-')}`}>
                      {strengthLabels[strength]}
                    </p>
                  </div>
                )}

                {errors.password && <p className="text-danger-400 text-xs mt-1">{errors.password[0]}</p>}
              </div>

              {/* Confirm password */}
              <div>
                <div className="relative">
                  <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 w-4 h-4" />
                  <input
                    type="password"
                    name="password_confirmation"
                    value={form.password_confirmation}
                    onChange={handleChange}
                    required
                    placeholder={t('authPage.confirmNewPassword')}
                    className={`${inputCls(errors.password_confirmation)} pl-10 pr-4`}
                  />
                </div>
                {errors.password_confirmation && (
                  <p className="text-danger-400 text-xs mt-1">{errors.password_confirmation[0]}</p>
                )}
              </div>

              {/* Requirements */}
              <ul className="space-y-1 text-xs text-surface-500">
                {requirements.map(req => (
                  <li key={req.key} className={`flex items-center gap-1.5 transition-colors ${req.met ? 'text-success-400' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${req.met ? 'bg-success-400' : 'bg-surface-600'}`} />
                    {t(`authPage.${req.key}`)}
                  </li>
                ))}
              </ul>

              <button
                type="submit"
                disabled={loading || strength < 2}
                className="w-full py-3.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-glow disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : t('authPage.resetPassword')}
              </button>
            </form>

            <p className="text-center mt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-300 transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
                {t('authPage.forgotBackToLogin')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
