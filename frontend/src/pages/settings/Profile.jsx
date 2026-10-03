import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faClock,
  faShieldHalved,
  faCircleCheck,
  faEnvelope,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { authAPI } from '../../services/api';
import { useAuthStore, useUIStore } from '../../store';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Card, Badge, Avatar, Tabs, FormField, Input, Select, Textarea, Button } from '../../components/common/UI';
import { ARABIC_ENABLED } from '../../i18n';

const ROLE_COLORS = {
  super_admin: 'purple',
  admin: 'primary',
  teacher: 'success',
  student: 'info',
  parent: 'warning',
};

const LOCALE_OPTIONS = [
  { value: 'en', labelKey: 'profilePage.localeEnglish' },
  { value: 'fr', labelKey: 'profilePage.localeFrench' },
  { value: 'es', labelKey: 'profilePage.localeSpanish' },
  ...(ARABIC_ENABLED ? [{ value: 'ar', labelKey: 'profilePage.localeArabic' }] : []),
  { value: 'de', labelKey: 'profilePage.localeGerman' },
];

export default function Profile() {
  const { t } = useTranslation();
  const { user, updateUser, fetchMe } = useAuthStore();
  const { setTheme: setGlobalTheme } = useUIStore();
  const fileRef = useRef(null);

  const locales = useMemo(
    () => LOCALE_OPTIONS.map((l) => ({ value: l.value, label: t(l.labelKey) })),
    [t]
  );

  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    bio: user?.bio ?? '',
    date_of_birth: user?.date_of_birth ?? '',
    gender: user?.gender ?? '',
    locale: user?.locale ?? 'en',
    theme: user?.theme ?? 'light',
    address: user?.address ?? '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    if (user) {
      setProfileForm((p) => ({
        ...p,
        name: user.name ?? '',
        phone: user.phone ?? '',
        bio: user.bio ?? '',
        date_of_birth: user.date_of_birth ?? '',
        gender: user.gender ?? '',
        locale: !ARABIC_ENABLED && user.locale === 'ar' ? 'en' : (user.locale ?? 'en'),
        theme: user.theme ?? 'light',
        address: user.address ?? '',
      }));
    }
  }, [user?.id]);

  const loadActivities = useCallback(() => {
    authAPI.me()
      .then(({ data }) => setRecentActivities(data.recent_activities ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities, user?.id]);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [twoFaData, setTwoFaData] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  const twoFactorEnabled = user?.two_factor_enabled;

  const tabs = useMemo(() => [
    { key: 'profile', label: t('profilePage.tabProfile') },
    { key: 'activity', label: t('profilePage.tabActivity') },
    { key: 'security', label: t('profilePage.tabSecurity') },
    { key: '2fa', label: t('profilePage.tab2fa') },
  ], [t]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('profilePage.avatarInvalidType'));
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('profilePage.avatarTooLarge'));
      e.target.value = '';
      return;
    }
    const form = new FormData();
    form.append('avatar', file);
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data.user);
      loadActivities();
      toast.success(t('profilePage.avatarUpdated'));
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      if (fieldErrors.avatar) toast.error(fieldErrors.avatar);
      else if (general) toast.error(general);
      else toast.error(t('profilePage.avatarUploadFailed'));
    }
    e.target.value = '';
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileErrors({});
    setProfileSaving(true);
    const form = new FormData();
    Object.entries(profileForm).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, value);
    });
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data.user);
      if (data.user?.theme) {
        setGlobalTheme(data.user.theme);
      }
      loadActivities();
      toast.success(data.message || t('profilePage.profileUpdated'));
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setProfileErrors(fieldErrors);
      if (general) toast.error(general);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setPasswordSaving(true);
    try {
      const { data } = await authAPI.changePassword(passwordForm);
      toast.success(data.message || t('profilePage.passwordUpdated'));
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setPasswordErrors(fieldErrors);
      if (general) toast.error(general);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleEnable2fa = async () => {
    setTwoFaLoading(true);
    try {
      const { data } = await authAPI.enable2fa();
      setTwoFaData(data);
      toast.success(data.message || t('profilePage.scanQrToast'));
    } catch {
      toast.error(t('profilePage.enable2faFailed'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleConfirm2fa = async () => {
    setTwoFaLoading(true);
    try {
      const { data } = await authAPI.confirm2fa({ code: twoFaCode });
      toast.success(data.message || t('profilePage.twoFaEnabled'));
      setTwoFaData(null);
      setTwoFaCode('');
      await fetchMe();
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      if (fieldErrors.code) toast.error(fieldErrors.code);
      else if (general) toast.error(general);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisable2fa = async () => {
    const password = window.prompt(t('profilePage.promptDisablePassword'));
    if (!password) return;
    const code = window.prompt(t('profilePage.promptDisableCode'));
    if (!code) return;
    setTwoFaLoading(true);
    try {
      const { data } = await authAPI.disable2fa({ password, code });
      toast.success(data.message || t('profilePage.twoFaDisabled'));
      await fetchMe();
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      if (general) toast.error(general);
      else toast.error(fieldErrors.password || fieldErrors.code || t('profilePage.disable2faFailed'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Card padding={false}>
        <div className="p-6 lg:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-start">
          <div className="relative group">
            <Avatar
              src={user?.avatar_url}
              name={user?.name}
              className="!w-28 !h-28 !rounded-2xl !text-3xl"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <FontAwesomeIcon icon={faCamera} className="w-6 h-6 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
              {user?.name}
            </h1>
            <p className="text-surface-500 mt-1">{user?.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge color={ROLE_COLORS[user?.role] || 'gray'} size="sm">
                {user?.role ? t(`roles.${user.role}`) : ''}
              </Badge>
              <Badge color={user?.is_active ? 'success' : 'danger'} size="sm" dot>
                {user?.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card title={t('profilePage.accountStatus')} padding={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-100 dark:divide-surface-800">
          <div className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.is_active ? 'bg-success-500/10' : 'bg-danger-500/10'}`}>
              <FontAwesomeIcon icon={faUserShield} className={`w-4 h-4 ${user?.is_active ? 'text-success-500' : 'text-danger-500'}`} />
            </div>
            <div>
              <p className="text-xs text-surface-400">{t('common.status')}</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white capitalize">
                {user?.account_status ?? (user?.is_active ? t('common.active') : t('common.inactive'))}
              </p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.email_verified ? 'bg-success-500/10' : 'bg-warning-500/10'}`}>
              <FontAwesomeIcon icon={faEnvelope} className={`w-4 h-4 ${user?.email_verified ? 'text-success-500' : 'text-warning-500'}`} />
            </div>
            <div>
              <p className="text-xs text-surface-400">{t('profilePage.emailLabel')}</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                {user?.email_verified ? t('profilePage.emailVerified') : t('profilePage.emailNotVerified')}
              </p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-primary-500" />
            </div>
            <div>
              <p className="text-xs text-surface-400">{t('profilePage.lastLogin')}</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                {user?.last_login_at
                  ? new Date(user.last_login_at).toLocaleString()
                  : '—'}
              </p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-500/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faCircleCheck} className="w-4 h-4 text-surface-500" />
            </div>
            <div>
              <p className="text-xs text-surface-400">{t('profilePage.memberSince')}</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <Card title={t('profilePage.personalInfo')}>
          <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('profilePage.fullName')} error={profileErrors.name}>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                error={profileErrors.name}
              />
            </FormField>
            <FormField label={t('profilePage.phone')} error={profileErrors.phone}>
              <Input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                error={profileErrors.phone}
                placeholder={t('profilePage.phonePlaceholder')}
              />
            </FormField>
            <FormField label={t('profilePage.dateOfBirth')} error={profileErrors.date_of_birth}>
              <Input
                type="date"
                value={profileForm.date_of_birth}
                onChange={(e) => setProfileForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                error={profileErrors.date_of_birth}
              />
            </FormField>
            <FormField label={t('profilePage.gender')} error={profileErrors.gender}>
              <Select
                value={profileForm.gender}
                onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))}
                error={profileErrors.gender}
              >
                <option value="">{t('profilePage.select')}</option>
                <option value="male">{t('profilePage.male')}</option>
                <option value="female">{t('profilePage.female')}</option>
                <option value="other">{t('profilePage.other')}</option>
              </Select>
            </FormField>
            <FormField label={t('common.language')} error={profileErrors.locale}>
              <Select
                value={locales.some((l) => l.value === profileForm.locale) ? profileForm.locale : 'en'}
                onChange={(e) => setProfileForm((p) => ({ ...p, locale: e.target.value }))}
                error={profileErrors.locale}
              >
                {locales.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label={t('profilePage.theme')} error={profileErrors.theme}>
              <Select
                value={profileForm.theme}
                onChange={(e) => setProfileForm((p) => ({ ...p, theme: e.target.value }))}
                error={profileErrors.theme}
              >
                <option value="light">{t('settingsPage.themeLight')}</option>
                <option value="dark">{t('settingsPage.themeDark')}</option>
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={t('profilePage.address')} error={profileErrors.address}>
                <Textarea
                  rows={3}
                  value={profileForm.address}
                  onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                  error={profileErrors.address}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label={t('profilePage.bio')} error={profileErrors.bio}>
                <Textarea
                  rows={4}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                  error={profileErrors.bio}
                  placeholder={t('profilePage.bioPlaceholder')}
                />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={profileSaving}>{t('profilePage.saveChanges')}</Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'activity' && (
        <Card title={t('profilePage.recentActivity')} subtitle={t('profilePage.recentActivitySubtitle')}>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-surface-500">{t('profilePage.noRecentActivity')}</p>
          ) : (
            <ul className="space-y-3">
              {recentActivities.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faShieldHalved} className="w-3.5 h-3.5 text-primary-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{log.description}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{log.action_label ?? log.action}</p>
                    <p className="text-xs text-surface-400 mt-1">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'security' && (
        <Card title={t('profilePage.changePassword')}>
          <form onSubmit={handlePasswordSave} className="max-w-md space-y-4">
            <FormField label={t('profilePage.currentPassword')} error={passwordErrors.current_password}>
              <Input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                error={passwordErrors.current_password}
                required
              />
            </FormField>
            <FormField label={t('profilePage.newPassword')} error={passwordErrors.password}>
              <Input
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
                error={passwordErrors.password}
                required
              />
            </FormField>
            <FormField label={t('profilePage.confirmPassword')} error={passwordErrors.password_confirmation}>
              <Input
                type="password"
                value={passwordForm.password_confirmation}
                onChange={(e) => setPasswordForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                error={passwordErrors.password_confirmation}
                required
              />
            </FormField>
            <Button type="submit" loading={passwordSaving}>{t('profilePage.updatePassword')}</Button>
          </form>
        </Card>
      )}

      {tab === '2fa' && (
        <Card title={t('profilePage.twoFactorAuth')}>
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-50 dark:bg-surface-800 mb-6">
            <div>
              <p className="font-medium text-surface-900 dark:text-white">{t('common.status')}</p>
              <p className="text-sm text-surface-500 mt-0.5">
                {twoFactorEnabled
                  ? t('profilePage.twoFaProtected')
                  : t('profilePage.twoFaAddLayer')}
              </p>
            </div>
            <Badge color={twoFactorEnabled ? 'success' : 'gray'}>
              {twoFactorEnabled ? t('profilePage.enabled') : t('profilePage.disabled')}
            </Badge>
          </div>

          {!twoFactorEnabled && !twoFaData && (
            <Button onClick={handleEnable2fa} loading={twoFaLoading}>
              {t('profilePage.enable2fa')}
            </Button>
          )}

          {twoFaData && !twoFactorEnabled && (
            <div className="space-y-4 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
              {twoFaData.qr_code_url && (
                <img
                  src={twoFaData.qr_code_url}
                  alt={t('profilePage.qrAlt')}
                  className="mx-auto w-48 h-48 rounded-lg border border-surface-200 dark:border-surface-700"
                />
              )}
              <p className="text-sm text-surface-500">{t('profilePage.manualSecret')}</p>
              <p className="font-mono text-sm bg-surface-100 dark:bg-surface-800 p-3 rounded-lg break-all select-all">
                {twoFaData.secret}
              </p>
              <FormField label={t('profilePage.verificationCode')}>
                <Input
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-center tracking-widest"
                  placeholder={t('authPage.codePlaceholder')}
                  maxLength={6}
                />
              </FormField>
              <div className="flex gap-2">
                <Button onClick={handleConfirm2fa} loading={twoFaLoading} disabled={twoFaCode.length < 6}>
                  {t('profilePage.verify')}
                </Button>
                <Button variant="outline" onClick={() => { setTwoFaData(null); setTwoFaCode(''); }}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}

          {twoFactorEnabled && (
            <Button variant="danger" onClick={handleDisable2fa} loading={twoFaLoading}>
              {t('profilePage.disable2fa')}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
