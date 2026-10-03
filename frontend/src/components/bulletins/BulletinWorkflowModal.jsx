import { useTranslation } from 'react-i18next';
import { Modal } from '../common/UI';
import AcademicBulletinPanel from './AcademicBulletinPanel';

export default function BulletinWorkflowModal({
  isOpen,
  onClose,
  student,
  onStatusChange,
}) {
  const { t } = useTranslation();

  if (!student?.id) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('bulletin.title')}
      size="xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-surface-200/80 dark:border-surface-700/60 bg-surface-50/80 dark:bg-surface-800/40 px-4 py-3">
          <p className="font-semibold text-surface-900 dark:text-white">
            {student.user?.name || t('bulletin.pageTitle')}
          </p>
          <p className="text-xs text-surface-500 mt-0.5 font-mono">
            {student.student_id || `ID ${student.id}`}
          </p>
        </div>
        <AcademicBulletinPanel
          key={student.id}
          studentId={student.id}
          studentCode={student.student_id}
          variant="admin"
          embedded
          onStatusChange={(payload) => onStatusChange?.(student.id, payload)}
        />
      </div>
    </Modal>
  );
}
