import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faPenToSquare, faTrash, faEye } from '@fortawesome/free-solid-svg-icons';
import { parentsAPI } from '../../services/api';
import {
  PageHeader,
  Card,
  SearchBar,
  Select,
  Table,
  Pagination,
  Badge,
  Avatar,
  Button,
  ConfirmDialog,
} from '../../components/common/UI';

export default function ParentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [linked, setLinked] = useState('');
  const [page, setPage] = useState(1);
  const [parents, setParents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: '', label: t('common.allStatuses') },
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
    ],
    [t],
  );

  const LINKED_OPTIONS = useMemo(
    () => [
      { value: '', label: t('parentsPage.filterAllParents') },
      { value: 'yes', label: t('parentsPage.filterWithStudent') },
      { value: 'no', label: t('parentsPage.filterWithoutStudent') },
    ],
    [t],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, status, linked]);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await parentsAPI.list({
        page,
        per_page: 15,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status && { status }),
        ...(linked && { linked }),
      });
      setParents(data.data ?? []);
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      });
    } catch {
      toast.error(t('parentsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, linked, t]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await parentsAPI.delete(deleteTarget.id);
      toast.success(t('parentsPage.deleted'));
      setDeleteTarget(null);
      fetchParents();
    } catch (err) {
      toast.error(err.response?.data?.message || t('parentsPage.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: t('parentsPage.columnName'),
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.name} size="sm" />
            <span className="font-medium">{row.name}</span>
          </div>
        ),
      },
      { key: 'email', label: t('parentsPage.columnEmail'), render: (_, row) => row.email || '—' },
      {
        key: 'linked',
        label: t('parentsPage.columnLinkedStudent'),
        render: (_, row) => row.linked_students_label || '—',
      },
      { key: 'phone', label: t('parentsPage.columnPhone'), render: (_, row) => row.phone || '—' },
      {
        key: 'status',
        label: t('common.status'),
        render: (_, row) => (
          <Badge color={row.is_active ? 'success' : 'gray'} size="sm">
            {row.is_active ? t('common.active') : t('common.inactive')}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: t('common.actions'),
        render: (_, row) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => navigate(`/parents/${row.id}`)} title={t('common.view')}>
              <FontAwesomeIcon icon={faEye} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/parents/${row.id}/edit`)} title={t('common.edit')}>
              <FontAwesomeIcon icon={faPenToSquare} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(row)} title={t('common.delete')}>
              <FontAwesomeIcon icon={faTrash} className="text-danger-500" />
            </Button>
          </div>
        ),
      },
    ],
    [t, navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.parents')}
        subtitle={t('parentsPage.subtitle')}
        action={
          <Link to="/parents/new">
            <Button type="button">
              <FontAwesomeIcon icon={faUserPlus} className="me-2" />
              {t('parentsPage.addParent')}
            </Button>
          </Link>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder={t('parentsPage.searchPlaceholder')} className="flex-1" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="lg:w-44">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select value={linked} onChange={(e) => setLinked(e.target.value)} className="lg:w-52">
            {LINKED_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        <Table columns={columns} data={parents} loading={loading} emptyMessage={t('parentsPage.empty')} />

        {meta && meta.last_page > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('parentsPage.deleteTitle')}
        message={t('parentsPage.deleteMessage', { name: deleteTarget?.name })}
        confirmLabel={t('common.delete')}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
