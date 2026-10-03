import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { parentsAPI } from '../../services/api';
import { Card, PageHeader } from '../../components/common/UI';
import ParentForm from '../../components/parents/ParentForm';

export default function ParentCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      const { data } = await parentsAPI.create(payload);
      toast.success(data.message || t('parentsPage.created'));
      navigate(`/parents/${data.data.id}`);
    } catch (err) {
      if (err.response?.data?.errors) throw err;
      toast.error(err.response?.data?.message || t('parentsPage.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/parents" className="text-sm text-surface-500 hover:text-primary-600 flex items-center gap-2">
        <FontAwesomeIcon icon={faArrowLeft} /> {t('parentsPage.backToParents')}
      </Link>
      <PageHeader title={t('parentsPage.createTitle')} subtitle={t('parentsPage.createSubtitle')} />
      <Card className="p-6">
        <ParentForm onSubmit={handleSubmit} loading={loading} submitLabel={t('parentsPage.createSubmit')} />
      </Card>
    </div>
  );
}
