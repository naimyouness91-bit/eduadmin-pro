import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBullhorn,
  faVideo,
  faComments,
  faUsers,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import { groupsAPI, assignmentsAPI, studentsAPI, teachersAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { PageHeader, Card, Button, Badge } from '../../components/common/UI';
import GroupChat from '../../components/groups/GroupChat';
import MemberList from '../../components/groups/MemberList';
import FileShare from '../../components/groups/FileShare';

export default function GroupDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('super_admin', 'admin');
  const isTeacherOnly = hasRole('teacher') && !isAdmin;

  const [group, setGroup] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('chat');
  const [loading, setLoading] = useState(true);

  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingStart, setMeetingStart] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [addStudentIds, setAddStudentIds] = useState([]);
  const [addTeacherIds, setAddTeacherIds] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [discussionTitle, setDiscussionTitle] = useState('');
  const [discussionBody, setDiscussionBody] = useState('');

  const tabs = useMemo(() => {
    const list = [
      { id: 'chat', label: t('groupsPage.tabs.chat'), icon: faComments },
      { id: 'files', label: t('groupsPage.tabs.files'), icon: faFolder },
      { id: 'members', label: t('groupsPage.tabs.members'), icon: faUsers },
    ];
    if (permissions.can_manage) {
      list.push({ id: 'manage', label: t('groupsPage.tabs.manage'), icon: faBullhorn });
    }
    return list;
  }, [permissions.can_manage, t]);

  const loadGroup = useCallback(async () => {
    try {
      const { data } = await groupsAPI.get(id);
      setGroup(data.data);
      setPermissions(data.permissions ?? {});
    } catch {
      toast.error(t('groupsPage.groupNotFound'));
    }
  }, [id, t]);

  const loadMembers = useCallback(async () => {
    try {
      const { data } = await groupsAPI.members(id);
      setMembers(data.data ?? []);
    } catch {
      /* optional */
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      const { data } = await groupsAPI.messages(id, { per_page: 100 });
      setMessages(data.data ?? []);
    } catch {
      toast.error(t('groupsPage.loadMessagesFailed'));
    }
  }, [id, t]);

  const loadFiles = useCallback(async () => {
    try {
      const { data } = await groupsAPI.files(id, { per_page: 50 });
      setFiles(data.data ?? []);
    } catch {
      /* optional */
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadGroup(), loadMembers(), loadMessages(), loadFiles()]).finally(() =>
      setLoading(false)
    );
  }, [loadGroup, loadMembers, loadMessages, loadFiles]);

  useEffect(() => {
    if (permissions.can_manage && hasRole('super_admin', 'admin', 'teacher')) {
      assignmentsAPI.list({ per_page: 50, course_id: group?.course_id || undefined }).then(({ data }) => {
        let list = data.data ?? [];
        if (group?.course_id) {
          list = list.filter((a) => a.course_id === group.course_id);
        }
        setAssignments(list);
      }).catch(() => {});
    }
    if (permissions.can_manage && isAdmin) {
      studentsAPI.list({ per_page: 200 }).then(({ data }) => setAllStudents(data.data ?? [])).catch(() => {});
      teachersAPI.list({ per_page: 100 }).then(({ data }) => setAllTeachers(data.data ?? [])).catch(() => {});
    }
    if (permissions.can_manage && isTeacherOnly && group?.course_id) {
      groupsAPI.eligibleStudents(id).then(({ data }) => setEligibleStudents(data.data ?? [])).catch(() => {});
    }
  }, [permissions.can_manage, hasRole, isAdmin, isTeacherOnly, group?.course_id, id]);

  const refreshAll = () => {
    loadMessages();
    loadFiles();
    loadGroup();
  };

  const handleSend = async (content, type = 'text') => {
    setSending(true);
    try {
      await groupsAPI.sendMessage(id, { content, type });
      setDraft('');
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await groupsAPI.postAnnouncement(id, { title: announceTitle, content: announceBody });
      toast.success(t('groupsPage.announcementPosted'));
      setAnnounceTitle('');
      setAnnounceBody('');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.actionFailed'));
    }
  };

  const handleDiscussion = async (e) => {
    e.preventDefault();
    try {
      await groupsAPI.createDiscussion(id, { title: discussionTitle, content: discussionBody });
      toast.success(t('groupsPage.discussionStarted'));
      setDiscussionTitle('');
      setDiscussionBody('');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.actionFailed'));
    }
  };

  const handleMeeting = async (e) => {
    e.preventDefault();
    try {
      const schedule = isTeacherOnly ? groupsAPI.scheduleSession : groupsAPI.scheduleMeeting;
      await schedule(id, {
        title: meetingTitle,
        meeting_url: meetingUrl,
        starts_at: meetingStart,
      });
      toast.success(isTeacherOnly ? t('groupsPage.sessionScheduled') : t('groupsPage.meetingScheduled'));
      setMeetingTitle('');
      setMeetingUrl('');
      setMeetingStart('');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.actionFailed'));
    }
  };

  const handleUpload = async (file) => {
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await groupsAPI.uploadFile(id, form);
      toast.success(t('groupsPage.fileUploaded'));
      loadFiles();
      loadMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileMsg) => {
    try {
      await groupsAPI.downloadFile(id, fileMsg.id, fileMsg.file_name);
    } catch {
      toast.error(t('groupsPage.downloadFailed'));
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await groupsAPI.removeMember(id, userId);
      toast.success(t('groupsPage.memberRemoved'));
      loadMembers();
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.actionFailed'));
    }
  };

  const handleAddMembers = async () => {
    if (!addStudentIds.length && !addTeacherIds.length) return;
    try {
      await groupsAPI.addMembers(id, {
        student_ids: addStudentIds.length ? addStudentIds : undefined,
        teacher_ids: addTeacherIds.length ? addTeacherIds : undefined,
      });
      toast.success(t('groupsPage.membersAdded'));
      setAddStudentIds([]);
      setAddTeacherIds([]);
      loadMembers();
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.addMembersFailed'));
    }
  };

  const handleRefreshAudience = async () => {
    setRefreshing(true);
    try {
      const { data } = await groupsAPI.refreshAudience(id);
      toast.success(data.message || t('groupsPage.audienceRefreshed'));
      loadMembers();
      loadGroup();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAddId = (list, setList, itemId) => {
    setList((prev) => (prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]));
  };

  const handleShareAssignment = async (assignmentId) => {
    try {
      await groupsAPI.shareAssignment(id, { assignment_id: assignmentId });
      toast.success(t('groupsPage.assignmentShared'));
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || t('groupsPage.actionFailed'));
    }
  };

  if (loading) {
    return <p className="text-surface-500 p-8">{t('groupsPage.loadingGroup')}</p>;
  }

  if (!group) {
    return (
      <div className="p-8">
        <Link to="/groups" className="text-primary-600 text-sm">
          {t('groupsPage.backToGroups')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/groups" className="text-surface-500 hover:text-primary-600">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <PageHeader title={group.name} subtitle={group.description || t('groupsPage.groupWorkspace')} />
        <Badge color="primary" className="ms-auto capitalize">
          {t(`groupsPage.types.${group.type}`, { defaultValue: group.type })}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
              tab === tabItem.id
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700'
            }`}
          >
            <FontAwesomeIcon icon={tabItem.icon} />
            {tabItem.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {tab === 'chat' && (
            <Card padding={false} className="overflow-hidden min-h-[420px]">
              <GroupChat
                messages={messages}
                draft={draft}
                onDraftChange={setDraft}
                onSend={handleSend}
                sending={sending}
                canSend={permissions.can_send_messages}
              />
            </Card>
          )}

          {tab === 'files' && (
            <Card className="p-4">
              <FileShare
                files={files}
                canUpload={permissions.can_upload_files}
                onUpload={handleUpload}
                onDownload={handleDownload}
                uploading={uploading}
              />
            </Card>
          )}

          {tab === 'members' && (
            <Card className="p-4 space-y-4">
              {permissions.can_manage && group.audience && group.audience !== 'custom' && hasRole('super_admin', 'admin') && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-200 dark:border-surface-700">
                  <p className="text-sm text-surface-500">
                    {t('groupsPage.autoEnrolledAudience')}{' '}
                    <strong className="capitalize">
                      {t(`groupsPage.audienceOptions.${group.audience}`, { defaultValue: group.audience.replace('_', ' ') })}
                    </strong>
                  </p>
                  <Button size="sm" variant="ghost" disabled={refreshing} onClick={handleRefreshAudience}>
                    {refreshing ? t('groupsPage.syncing') : t('groupsPage.syncAudience')}
                  </Button>
                </div>
              )}
              <MemberList
                members={members}
                canManage={permissions.can_manage}
                onRemove={handleRemoveMember}
              />
              {permissions.can_manage && isTeacherOnly && group?.course_id && (
                <div className="pt-4 border-t border-surface-200 dark:border-surface-700 space-y-3">
                  <h4 className="text-sm font-semibold">{t('groupsPage.addEnrolledStudents')}</h4>
                  <p className="text-xs text-surface-500">{t('groupsPage.addEnrolledHint')}</p>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {eligibleStudents.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-xs py-0.5">
                        <input
                          type="checkbox"
                          checked={addStudentIds.includes(s.id)}
                          onChange={() => toggleAddId(addStudentIds, setAddStudentIds, s.id)}
                        />
                        {s.user?.name}
                      </label>
                    ))}
                  </div>
                  <Button size="sm" onClick={handleAddMembers} disabled={!addStudentIds.length}>
                    {t('groupsPage.addSelected')}
                  </Button>
                </div>
              )}

              {permissions.can_manage && isAdmin && (
                <div className="pt-4 border-t border-surface-200 dark:border-surface-700 space-y-3">
                  <h4 className="text-sm font-semibold">{t('groupsPage.addMembers')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-36 overflow-y-auto">
                    <div>
                      <p className="text-xs text-surface-500 mb-1">{t('common.students')}</p>
                      {allStudents.slice(0, 30).map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-xs py-0.5">
                          <input
                            type="checkbox"
                            checked={addStudentIds.includes(s.id)}
                            onChange={() => toggleAddId(addStudentIds, setAddStudentIds, s.id)}
                          />
                          {s.user?.name}
                        </label>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-surface-500 mb-1">{t('nav.teachers')}</p>
                      {allTeachers.map((teacher) => (
                        <label key={teacher.id} className="flex items-center gap-2 text-xs py-0.5">
                          <input
                            type="checkbox"
                            checked={addTeacherIds.includes(teacher.id)}
                            onChange={() => toggleAddId(addTeacherIds, setAddTeacherIds, teacher.id)}
                          />
                          {teacher.user?.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button size="sm" onClick={handleAddMembers} disabled={!addStudentIds.length && !addTeacherIds.length}>
                    {t('groupsPage.addSelected')}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {tab === 'manage' && permissions.can_manage && (
            <div className="space-y-4">
              {permissions.can_create_discussion && (
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={faComments} />
                    {t('groupsPage.startDiscussion')}
                  </h3>
                  <form onSubmit={handleDiscussion} className="space-y-2">
                    <input
                      required
                      value={discussionTitle}
                      onChange={(e) => setDiscussionTitle(e.target.value)}
                      placeholder={t('groupsPage.discussionTopicPlaceholder')}
                      className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-surface-800"
                    />
                    <textarea
                      required
                      value={discussionBody}
                      onChange={(e) => setDiscussionBody(e.target.value)}
                      placeholder={t('groupsPage.discussionBodyPlaceholder')}
                      rows={3}
                      className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-surface-800"
                    />
                    <Button type="submit" size="sm">
                      {t('groupsPage.startDiscussion')}
                    </Button>
                  </form>
                </Card>
              )}

              {isAdmin && (
                <Card className="p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FontAwesomeIcon icon={faBullhorn} />
                    {t('groupsPage.postAnnouncement')}
                  </h3>
                  <form onSubmit={handleAnnouncement} className="space-y-2">
                    <input
                      required
                      value={announceTitle}
                      onChange={(e) => setAnnounceTitle(e.target.value)}
                      placeholder={t('common.title')}
                      className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-surface-800"
                    />
                    <textarea
                      required
                      value={announceBody}
                      onChange={(e) => setAnnounceBody(e.target.value)}
                      placeholder={t('groupsPage.contentPlaceholder')}
                      rows={3}
                      className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-surface-800"
                    />
                    <Button type="submit" size="sm">
                      {t('groupsPage.post')}
                    </Button>
                  </form>
                </Card>
              )}

              <Card className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FontAwesomeIcon icon={faVideo} />
                  {isTeacherOnly ? t('groupsPage.scheduleLiveSession') : t('groupsPage.scheduleMeeting')}
                </h3>
                <form onSubmit={handleMeeting} className="space-y-2">
                  <input
                    required
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder={t('groupsPage.meetingTitlePlaceholder')}
                    className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-surface-800"
                  />
                  <input
                    required
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder={t('groupsPage.meetingUrlPlaceholder')}
                    className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-surface-800"
                  />
                  <input
                    required
                    type="datetime-local"
                    value={meetingStart}
                    onChange={(e) => setMeetingStart(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-surface-800"
                  />
                  <Button type="submit" size="sm">
                    {isTeacherOnly ? t('groupsPage.scheduleSession') : t('groupsPage.schedule')}
                  </Button>
                </form>
              </Card>

              {permissions.can_manage && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">{t('groupsPage.shareFile')}</h3>
                  <p className="text-xs text-surface-500 mb-2">{t('groupsPage.shareFileHint')}</p>
                  <Button size="sm" variant="ghost" onClick={() => setTab('files')}>
                    {t('groupsPage.goToFiles')}
                  </Button>
                </Card>
              )}

              {hasRole('super_admin', 'admin', 'teacher') && assignments.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">{t('groupsPage.shareAssignment')}</h3>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {assignments.map((a) => (
                      <li key={a.id} className="flex justify-between items-center text-sm gap-2">
                        <span className="truncate">{a.title}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleShareAssignment(a.id)}>
                          {t('groupsPage.share')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2">{t('groupsPage.quickInfo')}</h3>
            <p className="text-xs text-surface-500">
              {t('groupsPage.membersPosts', {
                members: group.members_count,
                posts: group.messages_count,
              })}
            </p>
            {group.course && (
              <p className="text-xs text-primary-600 mt-1">
                {t('groupsPage.courseLabel', { name: group.course.name })}
              </p>
            )}
            {group.audience && group.audience !== 'custom' && (
              <p className="text-xs text-emerald-600 mt-1 capitalize">
                {t('groupsPage.audienceLabel', {
                  audience: t(`groupsPage.audienceOptions.${group.audience}`, {
                    defaultValue: group.audience.replace(/_/g, ' '),
                  }),
                })}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
