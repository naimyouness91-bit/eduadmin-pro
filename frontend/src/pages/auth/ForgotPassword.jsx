// ── ForgotPassword ────────────────────────────────────────────
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGraduationCap, faEnvelope, faPaperPlane, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || t('authPage.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

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

        {sent ? (
          /* ── Success state ── */
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-success-500/15 flex items-center justify-center mx-auto mb-6">
              <FontAwesomeIcon icon={faPaperPlane} className="text-success-400 w-9 h-9" />
            </div>
            <h2 className="font-display font-bold text-2xl text-white mb-3">{t('authPage.checkInbox')}</h2>
            <p className="text-surface-400 leading-relaxed mb-8">
              {t('authPage.sentToPrefix')}{' '}
              <span className="text-white font-medium">{email}</span>.
              {' '}{t('authPage.expiresIn')}
            </p>
            <p className="text-sm text-surface-500 mb-6">
              {t('authPage.didntReceive')}{' '}
              <button
                onClick={() => setSent(false)}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                {t('authPage.tryAgain')}
              </button>.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-300 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
              {t('authPage.forgotBackToLogin')}
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 className="font-display font-bold text-3xl text-white mb-2 text-center">{t('authPage.forgotTitle')}</h1>
            <p className="text-surface-400 text-center mb-8">
              {t('authPage.forgotSubtitle')}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 w-4 h-4"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder={t('authPage.forgotEmailPlaceholder')}
                  className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-glow disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPaperPlane} className="w-4 h-4" />
                    {t('authPage.sendResetLink')}
                  </>
                )}
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
