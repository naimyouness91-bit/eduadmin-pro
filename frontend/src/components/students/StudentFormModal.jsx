import { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faUser } from '@fortawesome/free-solid-svg-icons';
import { studentsAPI } from '../../services/api';
import { parseApiErrors } from '../../utils/parseApiErrors';
import { Modal, FormField, Input, Select, Button } from '../common/UI';

const SECTIONS = ['A', 'B', 'C', 'D'];
const fieldInputClass =
  'h-10 bg-white dark:bg-surface-800/90 border-surface-200 dark:border-surface-600/50 hover:border-surface-300 dark:hover:border-surface-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  password_confirm: '',
  student_id: '',
  phone: '',
  grade_level: '',
  section: '',
  enrollment_status: 'active',
  create_parent_account: false,
  parent_name: '',
  parent_email: '',
  parent_phone: '',
  parent_relationship: 'guardian',
};

function studentToForm(student) {
  if (!student) return { ...emptyForm };
  return {
    name: student.user?.name ?? '',
    email: student.user?.email ?? '',
    password: '',
    password_confirm: '',
    student_id: student.student_id ?? '',
    phone: student.user?.phone ?? '',
    grade_level: student.grade_level ?? '',
    section: student.section ?? '',
    enrollment_status: student.enrollment_status ?? 'active',
    create_parent_account: false,
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_relationship: 'guardian',
  };
}

function buildPayload(form, avatarFile, { isEdit, originalStudentId } = {}) {
  const { password_confirm: _confirm, ...data } = { ...form };

  if (!data.create_parent_account) {
    delete data.create_parent_account;
    delete data.parent_name;
    delete data.parent_email;
    delete data.parent_phone;
    delete data.parent_relationship;
  }

  // Let the API auto-generate when creating; avoid sending blank IDs.
  if (!data.student_id?.trim()) {
    delete data.student_id;
  } else if (isEdit && data.student_id.trim() === (originalStudentId ?? '').trim()) {
    delete data.student_id;
  } else {
    data.student_id = data.student_id.trim();
  }

  if (avatarFile) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (typeof v === 'boolean') {
        fd.append(k, v ? '1' : '0');
      } else {
        fd.append(k, v);
      }
    });
    fd.append('avatar', avatarFile);
    return fd;
  }
  return data;
}

function AvatarUpload({ preview, name, onPick, inputRef, onChange }) {
  const { t } = useTranslation();
  const initials = name?.trim()
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-surface-200/80 dark:border-surface-600/30 bg-surface-50/80 dark:bg-surface-800/40 px-4 py-3">
      <div className="relative shrink-0">
        {preview ? (
          <img
            src={preview}
            alt={name || t('students.columnStudent')}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-surface-700 shadow-sm"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-surface-200 dark:bg-surface-700 ring-2 ring-white dark:ring-surface-600 flex items-center justify-center text-surface-400 dark:text-surface-300">
            {initials ? (
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-300">{initials}</span>
            ) : (
              <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onPick}
          className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center shadow-md transition-colors"
          aria-label={t('students.formUploadPhoto')}
        >
          <FontAwesomeIcon icon={faCamera} className="w-3 h-3" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-surface-800 dark:text-surface-100">{t('students.formProfilePhoto')}</p>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{t('students.formProfilePhotoHint')}</p>
        <button
          type="button"
          onClick={onPick}
          className="mt-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          {t('students.formChooseFile')}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </div>
    </div>
  );
}

function ParentCredentialsModal({ credentials, onClose }) {
  const { t } = useTranslation();
  const copy = (text, labelKey) => {
    navigator.clipboard.writeText(text).then(() => toast.success(t(labelKey)));
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('students.parentAccountCreated')}
      size="md"
      footer={<Button onClick={onClose}>{t('students.done')}</Button>}
    >
      <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {t('students.parentCredentialsHint')}
      </p>
      <div className="space-y-3 rounded-xl border border-surface-200 dark:border-surface-700 p-4 bg-surface-50 dark:bg-surface-900/40">
        <div>
          <p className="text-xs text-surface-500 uppercase tracking-wide">{t('students.parentNameLabel')}</p>
          <p className="font-medium text-surface-900 dark:text-white">{credentials.name}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide">{t('students.formEmail')}</p>
            <p className="font-mono text-sm">{credentials.email}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => copy(credentials.email, 'students.emailCopied')}>{t('students.copy')}</Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide">{t('students.temporaryPassword')}</p>
            <p className="font-mono text-sm">{credentials.temporary_password}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => copy(credentials.temporary_password, 'students.passwordCopied')}>{t('students.copy')}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function StudentFormModal({ isOpen, onClose, student, onSuccess }) {
  const { t } = useTranslation();
  const isEdit = !!student;

  const GRADE_LEVELS = useMemo(
    () => [
      t('common.grade9'),
      t('common.grade10'),
      t('common.grade11'),
      t('common.grade12'),
    ],
    [t]
  );

  const STATUSES = useMemo(
    () => [
      { value: 'active', label: t('common.active') },
      { value: 'inactive', label: t('common.inactive') },
      { value: 'graduated', label: t('common.graduated') },
    ],
    [t]
  );

  const RELATIONSHIPS = useMemo(
    () => [
      { value: 'father', label: t('students.formFather') },
      { value: 'mother', label: t('students.formMother') },
      { value: 'guardian', label: t('students.formGuardian') },
    ],
    [t]
  );
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [parentCredentials, setParentCredentials] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm(studentToForm(student));
      setErrors({});
      setAvatarFile(null);
      setAvatarPreview(student?.user?.avatar_url ?? null);
      setParentCredentials(null);
    }
  }, [isOpen, student]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('students.formImageTooLarge'));
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const finishAndClose = () => {
    onSuccess?.();
    onClose();
  };

  const handleCredentialsClose = () => {
    setParentCredentials(null);
    finishAndClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!isEdit && form.password && form.password !== form.password_confirm) {
      setErrors({ password_confirm: t('students.formPasswordsMismatch') });
      return;
    }

    if (!isEdit && form.password_confirm && !form.password) {
      setErrors({ password: t('students.formEnterPasswordOrEmpty') });
      return;
    }

    setLoading(true);

    const payload = buildPayload(
      { ...form, ...(isEdit && !form.password ? { password: undefined } : {}) },
      avatarFile,
      { isEdit, originalStudentId: student?.student_id }
    );
    if (isEdit && !form.password && !(payload instanceof FormData)) delete payload.password;

    try {
      if (isEdit) {
        const { data } = await studentsAPI.update(student.id, payload);
        toast.success(data.message || t('students.formStudentUpdated'));
        finishAndClose();
      } else {
        if (!(payload instanceof FormData) && !payload.password) {
          payload.password = 'password123';
        }
        const { data } = await studentsAPI.create(payload);
        toast.success(data.message || t('students.formStudentCreated'));
        if (data.parent_credentials) {
          setParentCredentials(data.parent_credentials);
        } else {
          finishAndClose();
        }
      }
    } catch (err) {
      const { fieldErrors, general } = parseApiErrors(err);
      setErrors(fieldErrors);
      if (general) toast.error(general);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
      <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
        {t('common.cancel')}
      </Button>
      <Button type="submit" form="student-form" loading={loading} size="md" className="w-full sm:w-auto min-w-[140px]">
        {isEdit ? t('students.formSaveChanges') : t('students.formCreateStudent')}
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen && !parentCredentials}
        onClose={onClose}
        title={isEdit ? t('students.editStudent') : t('students.addStudent')}
        size="form"
        footer={footer}
      >
        <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
          <p className="text-sm text-surface-500 dark:text-surface-400 -mt-1">
            {isEdit ? t('students.formEditSubtitle') : t('students.formAddSubtitle')}
          </p>

          <AvatarUpload
            preview={avatarPreview}
            name={form.name}
            onPick={() => fileRef.current?.click()}
            inputRef={fileRef}
            onChange={handleAvatarChange}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <FormField label={t('students.formFullName')} error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                error={errors.name}
                className={fieldInputClass}
                required
              />
            </FormField>

            <FormField label={t('students.formEmail')} error={errors.email} required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                error={errors.email}
                className={fieldInputClass}
                required
              />
            </FormField>

            <FormField
              label={t('students.formStudentId')}
              error={errors.student_id}
              hint={isEdit ? t('students.formStudentIdHintEdit') : t('students.formStudentIdHintCreate')}
            >
              <Input
                value={form.student_id}
                onChange={(e) => setField('student_id', e.target.value)}
                error={errors.student_id}
                className={fieldInputClass}
                placeholder={isEdit ? student?.student_id : t('students.formAutoGenerated')}
              />
            </FormField>

            <FormField label={t('students.formPhone')} error={errors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                error={errors.phone}
                className={fieldInputClass}
                placeholder={t('students.formPhonePlaceholder')}
              />
            </FormField>

            <FormField label={t('students.formGradeClass')} error={errors.grade_level || errors.section} required>
              <div className="flex gap-2">
                <Select
                  value={form.grade_level}
                  onChange={(e) => setField('grade_level', e.target.value)}
                  error={errors.grade_level}
                  className={`${fieldInputClass} flex-1 min-w-0`}
                  required
                >
                  <option value="">{t('students.formGrade')}</option>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </Select>
                <Select
                  value={form.section}
                  onChange={(e) => setField('section', e.target.value)}
                  error={errors.section}
                  className={`${fieldInputClass} w-28 shrink-0`}
                >
                  <option value="">{t('students.formClass')}</option>
                  {SECTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </FormField>

            <FormField label={t('students.formStatus')} error={errors.enrollment_status}>
              <Select
                value={form.enrollment_status}
                onChange={(e) => setField('enrollment_status', e.target.value)}
                error={errors.enrollment_status}
                className={fieldInputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </FormField>

            {!isEdit ? (
              <>
                <FormField label={t('students.formPassword')} error={errors.password} hint={t('students.formPasswordHint')}>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    error={errors.password}
                    className={fieldInputClass}
                    placeholder={t('students.formPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                </FormField>

                <FormField label={t('students.formConfirmPassword')} error={errors.password_confirm}>
                  <Input
                    type="password"
                    value={form.password_confirm}
                    onChange={(e) => setField('password_confirm', e.target.value)}
                    error={errors.password_confirm}
                    className={fieldInputClass}
                    placeholder={t('students.formConfirmPasswordPlaceholder')}
                    autoComplete="new-password"
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField label={t('students.formNewPassword')} error={errors.password} hint={t('students.formNewPasswordHint')}>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    error={errors.password}
                    className={fieldInputClass}
                    autoComplete="new-password"
                  />
                </FormField>
                <div className="hidden sm:block" aria-hidden />
              </>
            )}
          </div>

          {!isEdit && (
            <div className="rounded-xl border border-surface-200/80 dark:border-surface-600/30 bg-surface-50/50 dark:bg-surface-800/30 p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-white">{t('students.formParentInfo')}</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{t('students.formParentInfoHint')}</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.create_parent_account}
                  onChange={(e) => setField('create_parent_account', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-surface-300 dark:border-surface-500 text-primary-500 focus:ring-primary-500/30"
                />
                <span>
                  <span className="block text-sm font-medium text-surface-800 dark:text-surface-100 group-hover:text-surface-900 dark:group-hover:text-white transition-colors">
                    {t('students.formCreateParentAccount')}
                  </span>
                  <span className="block text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {t('students.formCreateParentAccountHint')}
                  </span>
                </span>
              </label>

              {form.create_parent_account && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 pt-1">
                  <FormField label={t('students.formParentFullName')} error={errors.parent_name} required>
                    <Input
                      value={form.parent_name}
                      onChange={(e) => setField('parent_name', e.target.value)}
                      error={errors.parent_name}
                      className={fieldInputClass}
                      required
                    />
                  </FormField>

                  <FormField label={t('students.formParentEmail')} error={errors.parent_email} required>
                    <Input
                      type="email"
                      value={form.parent_email}
                      onChange={(e) => setField('parent_email', e.target.value)}
                      error={errors.parent_email}
                      className={fieldInputClass}
                      required
                    />
                  </FormField>

                  <FormField label={t('students.formParentPhone')} error={errors.parent_phone}>
                    <Input
                      value={form.parent_phone}
                      onChange={(e) => setField('parent_phone', e.target.value)}
                      error={errors.parent_phone}
                      className={fieldInputClass}
                    />
                  </FormField>

                  <FormField label={t('students.formRelationship')} error={errors.parent_relationship} required>
                    <Select
                      value={form.parent_relationship}
                      onChange={(e) => setField('parent_relationship', e.target.value)}
                      error={errors.parent_relationship}
                      className={fieldInputClass}
                      required
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </Select>
                  </FormField>
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>

      {parentCredentials && (
        <ParentCredentialsModal credentials={parentCredentials} onClose={handleCredentialsClose} />
      )}
    </>
  );
}
