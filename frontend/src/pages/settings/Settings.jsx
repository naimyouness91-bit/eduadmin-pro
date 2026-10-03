import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faSave } from '@fortawesome/free-solid-svg-icons';
import { settingsAPI } from '../../services/api';
import { useAuthStore, useUIStore } from '../../store';
import { PageHeader, Card, Button, EmptyState, FormField, Input, Select, Textarea } from '../../components/common/UI';
import ThemeSelector from '../../components/settings/ThemeSelector';
import { getColorThemeMeta, normalizeColorTheme } from '../../config/colorThemes';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Casablanca',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const DEFAULTS = {
  general: {
    school_name: 'EduAdmin Pro Academy',
    school_email: 'contact@eduadmin.com',
    school_phone: '+1 (555) 010-2000',
    timezone: 'UTC',
    school_address: '123 Education Avenue',
  },
  academic: {
    academic_year: '2024-2025',
    current_semester: 'Spring 2025',
    passing_grade: '60',
    max_class_size: '30',
  },
  appearance: {
    default_theme: 'light',
    color_theme: 'blue',
    primary_color: '#3b82f6',
    date_format: 'MM/DD/YYYY',
  },
  security: {
    allow_registration: true,
    require_2fa: false,
    email_verification: true,
    session_remember: true,
    session_timeout: '120',
  },
  email: {
    smtp_host: 'smtp.mailtrap.io',
    smtp_port: '587',
    smtp_username: '',
    smtp_password: '',
    mail_from_name: 'EduAdmin Pro',
    smtp_encryption: 'tls',
  },
};

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-surface-100 dark:border-surface-800 last:border-0">
      <div>
        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{label}</p>
        {description && (
          <p className="text-xs text-surface-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function flatToGroups(flat) {
  return {
    general: { ...DEFAULTS.general, ...pick(flat, Object.keys(DEFAULTS.general)) },
    academic: { ...DEFAULTS.academic, ...pick(flat, Object.keys(DEFAULTS.academic)) },
    appearance: { ...DEFAULTS.appearance, ...pick(flat, Object.keys(DEFAULTS.appearance)) },
    security: { ...DEFAULTS.security, ...pick(flat, Object.keys(DEFAULTS.security)) },
    email: { ...DEFAULTS.email, ...pick(flat, Object.keys(DEFAULTS.email)) },
  };
}

function pick(obj, keys) {
  return keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});
}

function groupsToPayload(groups) {
  const settings = [];
  Object.entries(groups).forEach(([group, values]) => {
    if (group === 'system') return;
    Object.entries(values).forEach(([key, value]) => {
      const type =
        typeof value === 'boolean'
          ? 'boolean'
          : ['passing_grade', 'max_class_size', 'session_timeout', 'smtp_port'].includes(key)
            ? 'integer'
            : 'string';
      settings.push({
        key,
        value: type === 'boolean' ? value : String(value ?? ''),
        type,
        group,
      });
    });
  });
  return settings;
}

export default function Settings() {
  const { t } = useTranslation();
  const { hasRole } = useAuthStore();
  const { setColorTheme } = useUIStore();
  const isAdmin = hasRole('super_admin', 'admin');

  const SECTIONS = useMemo(
    () => [
      { key: 'general', label: t('settingsPage.general') },
      { key: 'academic', label: t('settingsPage.academic') },
      { key: 'appearance', label: t('settingsPage.appearance') },
      { key: 'security', label: t('settingsPage.security') },
      { key: 'email', label: t('settingsPage.email') },
      { key: 'system', label: t('settingsPage.system') },
    ],
    [t]
  );

  const SYSTEM_INFO = useMemo(
    () => [
      [t('settingsPage.platform'), 'EduAdmin Pro'],
      [t('settingsPage.laravel'), '10.x'],
      [t('settingsPage.php'), '8.2+'],
      [t('settingsPage.mysql'), '8.0'],
      [t('settingsPage.cache'), 'File'],
      [t('settingsPage.queue'), 'Sync'],
      [t('settingsPage.storage'), 'Local'],
    ],
    [t]
  );
  const [section, setSection] = useState('general');
  const [groups, setGroups] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    settingsAPI
      .get()
      .then((res) => {
        const flat = {};
        Object.entries(res.data.data ?? res.data ?? {}).forEach(([group, items]) => {
          (items ?? []).forEach((item) => {
            flat[item.key] = item.value;
          });
        });
        const next = flatToGroups(flat);
        setGroups(next);
        if (next.appearance?.color_theme) {
          useUIStore.getState().setColorTheme(normalizeColorTheme(next.appearance.color_theme));
        }
      })
      .catch(() => toast.error(t('settingsPage.loadError')))
      .finally(() => setLoading(false));
  }, [isAdmin, t]);

  const setGroupField = (group, key, value) => {
    setGroups((prev) => ({
      ...prev,
      [group]: { ...prev[group], [key]: value },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const { data } = await settingsAPI.update({ settings: groupsToPayload(groups) });
      toast.success(data.message || t('settingsPage.saved'));
    } catch {
      toast.error(t('settingsPage.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <EmptyState
        icon={faLock}
        title={t('settingsPage.accessRestricted')}
        description={t('settingsPage.adminOnly')}
      />
    );
  }

  const g = groups;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('settingsPage.title')}
        subtitle={t('settingsPage.subtitle')}
        actions={
          <Button icon={faSave} onClick={handleSaveAll} loading={saving}>
            {t('settingsPage.saveAllChanges')}
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        <nav className="w-full lg:w-52 flex-shrink-0">
          <Card padding={false}>
            <ul className="p-2 space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setSection(s.key)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      section === s.key
                        ? 'bg-primary-500 text-white'
                        : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                    }`}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </nav>

        <div className="flex-1 min-w-0">
          {loading ? (
            <Card>
              <div className="h-64 animate-pulse bg-surface-100 dark:bg-surface-800 rounded-xl" />
            </Card>
          ) : (
            <>
              {section === 'general' && (
                <Card title={t('settingsPage.generalSettings')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label={t('settingsPage.schoolName')}>
                      <Input value={g.general.school_name} onChange={(e) => setGroupField('general', 'school_name', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.schoolEmail')}>
                      <Input type="email" value={g.general.school_email} onChange={(e) => setGroupField('general', 'school_email', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.schoolPhone')}>
                      <Input value={g.general.school_phone} onChange={(e) => setGroupField('general', 'school_phone', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.timezone')}>
                      <Select value={g.general.timezone} onChange={(e) => setGroupField('general', 'timezone', e.target.value)}>
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </Select>
                    </FormField>
                    <div className="sm:col-span-2">
                      <FormField label={t('settingsPage.schoolAddress')}>
                        <Textarea rows={3} value={g.general.school_address} onChange={(e) => setGroupField('general', 'school_address', e.target.value)} />
                      </FormField>
                    </div>
                  </div>
                </Card>
              )}

              {section === 'academic' && (
                <Card title={t('settingsPage.academicSettings')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label={t('settingsPage.academicYear')}>
                      <Input value={g.academic.academic_year} onChange={(e) => setGroupField('academic', 'academic_year', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.currentSemester')}>
                      <Select value={g.academic.current_semester} onChange={(e) => setGroupField('academic', 'current_semester', e.target.value)}>
                        <option value="Fall 2025">Fall 2025</option>
                        <option value="Spring 2025">Spring 2025</option>
                        <option value="Summer 2025">Summer 2025</option>
                      </Select>
                    </FormField>
                    <FormField label={t('settingsPage.passingGrade')}>
                      <Input type="number" min="0" max="100" value={g.academic.passing_grade} onChange={(e) => setGroupField('academic', 'passing_grade', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.maxClassSize')}>
                      <Input type="number" min="1" value={g.academic.max_class_size} onChange={(e) => setGroupField('academic', 'max_class_size', e.target.value)} />
                    </FormField>
                  </div>
                </Card>
              )}

              {section === 'appearance' && (
                <Card title={t('settingsPage.appearance')}>
                  <div className="space-y-6">
                    <FormField label={t('settingsPage.colorTheme')}>
                      <ThemeSelector
                        onSelect={(id) => {
                          const meta = getColorThemeMeta(id);
                          setGroupField('appearance', 'color_theme', id);
                          setGroupField('appearance', 'primary_color', meta.preview);
                        }}
                      />
                    </FormField>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField label={t('settingsPage.defaultTheme')}>
                        <Select
                          value={g.appearance.default_theme}
                          onChange={(e) => setGroupField('appearance', 'default_theme', e.target.value)}
                        >
                          <option value="light">{t('settingsPage.themeLight')}</option>
                          <option value="dark">{t('settingsPage.themeDark')}</option>
                          <option value="system">{t('settingsPage.themeSystem')}</option>
                        </Select>
                      </FormField>
                      <FormField label={t('settingsPage.dateFormat')}>
                        <Select
                          value={g.appearance.date_format}
                          onChange={(e) => setGroupField('appearance', 'date_format', e.target.value)}
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </Select>
                      </FormField>
                    </div>
                  </div>
                </Card>
              )}

              {section === 'security' && (
                <Card title={t('settingsPage.security')}>
                  <Toggle
                    label={t('settingsPage.allowRegistration')}
                    checked={g.security.allow_registration}
                    onChange={(v) => setGroupField('security', 'allow_registration', v)}
                  />
                  <Toggle
                    label={t('settingsPage.require2fa')}
                    description={t('settingsPage.require2faDesc')}
                    checked={g.security.require_2fa}
                    onChange={(v) => setGroupField('security', 'require_2fa', v)}
                  />
                  <Toggle
                    label={t('settingsPage.emailVerification')}
                    checked={g.security.email_verification}
                    onChange={(v) => setGroupField('security', 'email_verification', v)}
                  />
                  <Toggle
                    label={t('settingsPage.rememberSession')}
                    checked={g.security.session_remember}
                    onChange={(v) => setGroupField('security', 'session_remember', v)}
                  />
                  <div className="mt-4">
                  <FormField label={t('settingsPage.sessionTimeout')}>
                    <Input
                      type="number"
                      min="5"
                      value={g.security.session_timeout}
                      onChange={(e) => setGroupField('security', 'session_timeout', e.target.value)}
                      className="max-w-xs"
                    />
                  </FormField>
                  </div>
                </Card>
              )}

              {section === 'email' && (
                <Card title={t('settingsPage.emailSmtp')}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label={t('settingsPage.smtpHost')}>
                      <Input value={g.email.smtp_host} onChange={(e) => setGroupField('email', 'smtp_host', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.smtpPort')}>
                      <Input type="number" value={g.email.smtp_port} onChange={(e) => setGroupField('email', 'smtp_port', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.smtpUsername')}>
                      <Input value={g.email.smtp_username} onChange={(e) => setGroupField('email', 'smtp_username', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.smtpPassword')}>
                      <Input type="password" value={g.email.smtp_password} onChange={(e) => setGroupField('email', 'smtp_password', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.fromName')}>
                      <Input value={g.email.mail_from_name} onChange={(e) => setGroupField('email', 'mail_from_name', e.target.value)} />
                    </FormField>
                    <FormField label={t('settingsPage.encryption')}>
                      <Select value={g.email.smtp_encryption} onChange={(e) => setGroupField('email', 'smtp_encryption', e.target.value)}>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                        <option value="none">None</option>
                      </Select>
                    </FormField>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => toast(t('settingsPage.testEmailNotConfigured'))}
                  >
                    {t('settingsPage.sendTestEmail')}
                  </Button>
                </Card>
              )}

              {section === 'system' && (
                <Card title={t('settingsPage.system')}>
                  <table className="w-full text-sm mb-6">
                    <tbody>
                      {SYSTEM_INFO.map(([label, value]) => (
                        <tr key={label} className="border-b border-surface-100 dark:border-surface-800">
                          <td className="py-3 text-surface-500 w-1/3">{label}</td>
                          <td className="py-3 font-medium text-surface-800 dark:text-surface-200">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => toast(t('settingsPage.clearCacheHint'))}>
                      {t('settingsPage.clearCache')}
                    </Button>
                    <Button variant="outline" onClick={() => toast(t('settingsPage.runMigrationsHint'))}>
                      {t('settingsPage.runMigrations')}
                    </Button>
                    <Button variant="danger" onClick={() => toast.error(t('settingsPage.maintenanceModeHint'))}>
                      {t('settingsPage.maintenanceMode')}
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
