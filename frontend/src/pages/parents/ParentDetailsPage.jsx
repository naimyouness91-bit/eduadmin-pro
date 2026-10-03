import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPenToSquare, faEnvelope, faPhone, faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import { parentsAPI } from '../../services/api';
import { Card, Badge, Avatar, Button } from '../../components/common/UI';

export default function ParentDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await parentsAPI.get(id);
        setParent(data.data);
      } catch {
        toast.error(t('parentsPage.loadParentFailed'));
        navigate('/parents');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, t]);

  if (loading) {
    return <div className="h-48 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse" />;
  }

  if (!parent) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap justify-between gap-3">
        <Link to="/parents" className="text-sm text-surface-500 hover:text-primary-600 flex items-center gap-2">
          <FontAwesomeIcon icon={faArrowLeft} /> {t('parentsPage.backToParents')}
        </Link>
        <Button onClick={() => navigate(`/parents/${id}/edit`)}>
          <FontAwesomeIcon icon={faPenToSquare} className="me-2" /> {t('parentsPage.editButton')}
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={parent.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white">{parent.name}</h1>
            <Badge color={parent.is_active ? 'success' : 'gray'} size="sm" className="mt-2">
              {parent.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
          <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
            <FontAwesomeIcon icon={faEnvelope} className="text-primary-500" />
            {parent.email}
          </div>
          <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
            <FontAwesomeIcon icon={faPhone} className="text-primary-500" />
            {parent.phone || '—'}
          </div>
          <div><span className="text-surface-500">{t('parentsPage.occupation')}:</span> {parent.occupation || '—'}</div>
          <div><span className="text-surface-500">{t('parentsPage.relationship')}:</span> {parent.relationship || '—'}</div>
          {parent.national_id && (
            <div><span className="text-surface-500">{t('parentsPage.nationalId')}:</span> {parent.national_id}</div>
          )}
        </div>

        {parent.notes && (
          <p className="mt-4 text-sm text-surface-600 dark:text-surface-400 border-t border-surface-200 dark:border-surface-700 pt-4">
            {parent.notes}
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-4">
          <FontAwesomeIcon icon={faUserGraduate} className="text-primary-500" />
          {t('parentsPage.linkedStudents', { count: parent.students?.length ?? 0 })}
        </h2>
        {(parent.students ?? []).length === 0 ? (
          <p className="text-sm text-surface-500">{t('parentsPage.noLinkedStudents')}</p>
        ) : (
          <ul className="space-y-2">
            {parent.students.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-700"
              >
                <div>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-surface-500 text-sm ms-2">{s.student_id} · {s.grade_level}</span>
                </div>
                <div className="flex gap-2">
                  {s.is_primary && <Badge color="primary" size="sm">{t('parentsPage.primary')}</Badge>}
                  <Badge color="gray" size="sm">{s.relationship}</Badge>
                  <Link to={`/students/${s.id}`} className="text-xs text-primary-600 hover:underline">{t('parentsPage.viewStudent')}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
