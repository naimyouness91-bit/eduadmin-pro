import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUsers } from '@fortawesome/free-solid-svg-icons';
import { groupsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { PageHeader, SearchBar, Button, EmptyState } from '../../components/common/UI';
import GroupCard from '../../components/groups/GroupCard';

const TYPE_FILTER_VALUES = ['', 'student', 'teacher', 'mixed', 'course', 'announcement'];

export default function GroupsPage() {
  const { t } = useTranslation();
  const { hasRole } = useAuthStore();
  const canCreate = hasRole('super_admin', 'admin', 'teacher');

  const typeFilters = useMemo(
    () =>
      TYPE_FILTER_VALUES.map((value) => ({
        value,
        label: value
          ? t(`groupsPage.types.${value}`)
          : t('common.allTypes'),
      })),
    [t]
  );

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await groupsAPI.list({
        per_page: 50,
        search: search.trim() || undefined,
        type: typeFilter || undefined,
      });
      setGroups(data.data ?? []);
    } catch {
      toast.error(t('groupsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, t]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.groups')}
        subtitle={t('groupsPage.subtitle')}
        actions={
          canCreate ? (
            <Link to="/groups/create">
              <Button>
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                {t('groupsPage.createGroup')}
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t('groupsPage.searchPlaceholder')} className="flex-1" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-2 text-sm"
        >
          {typeFilters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-surface-500 text-sm">{t('groupsPage.loadingGroups')}</p>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={faUsers}
          title={t('groupsPage.noGroupsFound')}
          description={canCreate ? t('groupsPage.emptyCreateHint') : t('groupsPage.emptyMemberHint')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
