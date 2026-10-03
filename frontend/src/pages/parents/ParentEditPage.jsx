import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { parentsAPI } from '../../services/api';
import { Card, PageHeader } from '../../components/common/UI';
import ParentForm from '../../components/parents/ParentForm';

export default function ParentEditPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await parentsAPI.get(id);
        const p = data.data;
        setInitial({
          name: p.name,
          email: p.email,
          phone: p.phone ?? '',
          occupation: p.occupation ?? '',
          relationship: p.relationship ?? 'guardian',
          national_id: p.national_id ?? '',
          notes: p.notes ?? '',
          is_active: p.is_active,
          student_ids: (p.students ?? []).map((s) => s.id),
        });
      } catch {
        toast.error(t('parentsPage.loadParentFailed'));
        navigate('/parents');
      } finally {
        setFetching(false);
      }
    })();
  }, [id, navigate, t]);

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      const { data } = await parentsAPI.update(id, payload);
      toast.success(data.message || t('parentsPage.updated'));
      navigate(`/parents/${id}`);
    } catch (err) {
      if (err.response?.data?.errors) throw err;
      toast.error(err.response?.data?.message || t('parentsPage.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="h-64 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to={`/parents/${id}`} className="text-sm text-surface-500 hover:text-primary-600 flex items-center gap-2">
        <FontAwesomeIcon icon={faArrowLeft} /> {t('parentsPage.backToParent')}
      </Link>
      <PageHeader title={t('parentsPage.editTitle')} subtitle={t('parentsPage.editSubtitle')} />
      <Card className="p-6">
        <ParentForm
          initialValues={initial}
          onSubmit={handleSubmit}
          loading={loading}
          isEdit
          submitLabel={t('parentsPage.saveChanges')}
        />
      </Card>
    </div>
  );
}
