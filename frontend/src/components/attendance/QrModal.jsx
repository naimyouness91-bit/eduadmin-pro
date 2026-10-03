import { useTranslation } from 'react-i18next';
import { Modal } from '../common/UI';

export default function QrModal({ isOpen, onClose, qrData }) {
  const { t } = useTranslation();

  if (!qrData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('attendancePage.qrTitle')} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        {qrData.image ? (
          <img
            src={qrData.image}
            alt={t('attendancePage.qrAlt')}
            className="w-full max-w-[min(16rem,80vw)] aspect-square rounded-xl border border-surface-200 dark:border-surface-700 bg-white p-2"
          />
        ) : (
          <div className="w-full max-w-[min(16rem,80vw)] aspect-square rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400">
            {t('attendancePage.qrNoImage')}
          </div>
        )}
        <div className="w-full space-y-2 text-sm">
          <p className="text-surface-500">
            {t('attendancePage.qrCourse')}:{' '}
            <span className="font-medium text-surface-800 dark:text-surface-200">
              {qrData.course?.name || qrData.course?.code}
            </span>
          </p>
          <p className="text-surface-500 break-all">
            {t('attendancePage.qrToken')}:{' '}
            <span className="font-mono text-xs text-surface-700 dark:text-surface-300">
              {qrData.token}
            </span>
          </p>
          <p className="text-surface-500">
            {t('attendancePage.qrExpires')}:{' '}
            <span className="font-medium">
              {qrData.expires_at
                ? new Date(qrData.expires_at).toLocaleString()
                : '—'}
            </span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
