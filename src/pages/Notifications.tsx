import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, MessageSquare, UserPlus, Zap, Trophy, Rocket, Check, Trash2, Award, Calendar, UserCheck } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageShell from '../components/ui/PageShell';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import RelTime from '../components/ui/RelTime';
import Avatar from '../components/ui/Avatar';
import Tabs from '../components/ui/Tabs';
import { cn } from '../lib/utils';
import { useT } from '../lib/language';
import { useAuth } from '../App';
import { clearActivity, keys, markActivityRead, readActivity, type ActivityKind } from '../lib/localLists';
import { useStored } from '../lib/useStored';
import { clearNotifications, deleteNotification as deleteCloudNotification, markNotificationsRead, useNotifications, type NotificationType } from '../lib/social';
import { useToast } from '../context/ToastContext';

type NoteType = 'message' | 'match' | 'milestone' | 'system' | 'community' | 'endorsement' | 'event' | 'accepted' | 'mentorship';

interface Notification {
  id: string;
  type: NoteType;
  title: string;
  titleEl?: string;
  description: string;
  descriptionEl?: string;
  time: string;
  read: boolean;
  actionUrl?: string;
  fromName?: string;
  fromAvatar?: string;
  /** 'cloud' came from another member; 'local' is this account's own activity log. */
  source: 'cloud' | 'local';
}

type Filter = 'all' | 'unread' | 'people' | 'activity';

function kindToType(kind: ActivityKind): NoteType {
  if (kind === 'message') return 'message';
  if (kind === 'request' || kind === 'profile') return 'match';
  if (kind === 'milestone') return 'milestone';
  if (kind === 'community' || kind === 'event') return 'community';
  return 'system';
}

function cloudToType(type: NotificationType): NoteType {
  if (type === 'connection') return 'match';
  if (type === 'accepted') return 'accepted';
  if (type === 'message') return 'message';
  if (type === 'endorsement') return 'endorsement';
  if (type === 'mentorship') return 'mentorship';
  if (type === 'community') return 'community';
  if (type === 'event') return 'event';
  return 'system';
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export default function Notifications() {
  const t = useT();
  const { isDemoMode } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const activity = useStored(readActivity, [keys.activity]);
  const cloud = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cb_hidden_notifications') || '[]'); } catch { return []; }
  });
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported',
  );
  const [seed, setSeed] = useState<Notification[]>(() => isDemoMode ? [
    {
      id: '1',
      type: 'match',
      title: 'New match suggestion',
      titleEl: 'Νέα πρόταση αντιστοίχισης',
      description: 'Sarah Chen is a 94% match for your Fintech project. View her profile to connect.',
      descriptionEl: 'Η Sarah Chen ταιριάζει 94% με το FinTech έργο σου. Άνοιξε το προφίλ της για να συνδεθείτε.',
      time: hoursAgo(2),
      read: false,
      actionUrl: '/profile/sarah-chen',
      source: 'local',
    },
    {
      id: '2',
      type: 'message',
      title: 'New message from Marcus',
      titleEl: 'Νέο μήνυμα από τον Marcus',
      description: "Hey! I'd love to discuss the product roadmap we talked about yesterday.",
      descriptionEl: 'Γεια! Θα ήθελα να συζητήσουμε το product roadmap που λέγαμε χθες.',
      time: hoursAgo(5),
      read: false,
      actionUrl: '/messages',
      source: 'local',
    },
    {
      id: '3',
      type: 'milestone',
      title: 'Milestone achieved',
      titleEl: 'Ορόσημο ολοκληρώθηκε',
      description: "You've completed your 'First 5 Match Requests' milestone.",
      descriptionEl: 'Ολοκλήρωσες το ορόσημο «Πρώτα 5 αιτήματα σύνδεσης».',
      time: hoursAgo(24),
      read: true,
      source: 'local',
    },
    {
      id: '4',
      type: 'system',
      title: 'Platform update',
      titleEl: 'Ενημέρωση πλατφόρμας',
      description: "We've added new AI-powered matching dimensions to help you find better partners.",
      descriptionEl: 'Προσθέσαμε νέες διαστάσεις αντιστοίχισης με AI για να βρίσκεις καλύτερους συνεργάτες.',
      time: hoursAgo(48),
      read: true,
      source: 'local',
    },
  ] : []);

  const localNotes: Notification[] = useMemo(() => activity.map((item) => ({
    id: item.id,
    type: kindToType(item.kind),
    title: item.title,
    titleEl: item.titleEl,
    description: '',
    time: item.at,
    read: item.read,
    actionUrl: item.href,
    source: 'local' as const,
  })), [activity]);

  const cloudNotes: Notification[] = useMemo(() => cloud.items.map((item) => ({
    id: item.id,
    type: cloudToType(item.type),
    title: item.title,
    titleEl: item.titleEl,
    description: item.body,
    descriptionEl: item.bodyEl,
    time: new Date(item.createdAt).toISOString(),
    read: item.read,
    actionUrl: item.href || undefined,
    fromName: item.fromName,
    fromAvatar: item.fromAvatar,
    source: 'cloud' as const,
  })), [cloud.items]);

  const all = useMemo(
    () => [...cloudNotes, ...localNotes, ...seed].filter((item) => !hiddenIds.includes(item.id)).sort((a, b) => Date.parse(b.time) - Date.parse(a.time)),
    [cloudNotes, localNotes, seed, hiddenIds],
  );
  const unreadCount = all.filter((item) => !item.read).length;
  const notifications = all.filter((item) => {
    if (filter === 'unread') return !item.read;
    if (filter === 'people') return item.source === 'cloud';
    if (filter === 'activity') return item.source === 'local';
    return true;
  });

  const markAllAsRead = () => {
    markActivityRead('all');
    void markNotificationsRead('all');
    setSeed((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = (notification: Notification) => {
    if (notification.source === 'cloud') void markNotificationsRead([notification.id]);
    else markActivityRead([notification.id]);
    setSeed((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
  };

  const deleteNotification = (notification: Notification) => {
    setHiddenIds((prev) => {
      const next = [...prev, notification.id];
      try { localStorage.setItem('cb_hidden_notifications', JSON.stringify(next)); } catch {}
      return next;
    });
    setSeed((prev) => prev.filter((n) => n.id !== notification.id));
    if (notification.source === 'cloud') void deleteCloudNotification(notification.id);
  };

  const clearAll = () => {
    clearActivity();
    void clearNotifications();
    setSeed([]);
    setHiddenIds([]);
    try { localStorage.removeItem('cb_hidden_notifications'); } catch {}
  };

  const openNote = (notification: Notification) => {
    markOneRead(notification);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const askPermission = async () => {
    if (permission === 'unsupported') return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') toast.success(t('Browser alerts are on', 'Οι ειδοποιήσεις του browser ενεργοποιήθηκαν'), t('You will hear about new messages and requests while this tab is in the background.', 'Θα ενημερώνεσαι για νέα μηνύματα και αιτήματα όσο αυτή η καρτέλα είναι στο παρασκήνιο.'));
    } catch {
      /* the browser refused; the in-app list keeps working */
    }
  };

  const getIcon = (type: NoteType) => {
    const iconCls = 'w-4 h-4 text-stone-500';
    switch (type) {
      case 'message': return <MessageSquare className={iconCls} />;
      case 'match': return <UserPlus className={iconCls} />;
      case 'accepted': return <UserCheck className={iconCls} />;
      case 'mentorship': return <Award className={iconCls} />;
      case 'endorsement': return <Award className={iconCls} />;
      case 'milestone': return <Trophy className={iconCls} />;
      case 'system': return <Zap className={iconCls} />;
      case 'event': return <Calendar className={iconCls} />;
      case 'community': return <Rocket className={iconCls} />;
      default: return <Bell className={iconCls} />;
    }
  };

  const tabs = [
    { id: 'all', label: t('All', 'Όλες'), count: all.length },
    { id: 'unread', label: t('Unread', 'Αδιάβαστες'), count: unreadCount, attention: unreadCount > 0 },
    { id: 'people', label: t('From members', 'Από μέλη'), count: cloudNotes.length },
    { id: 'activity', label: t('My activity', 'Η δραστηριότητά μου'), count: localNotes.length + seed.length },
  ];

  return (
    <PageShell
      title={t('Notifications', 'Ειδοποιήσεις')}
      description={t('Requests, messages and endorsements from members, plus your own activity.', 'Αιτήματα, μηνύματα και συστάσεις από μέλη, μαζί με τη δική σου δραστηριότητα.')}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AskLink prompt="show my studio activity" />
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <Check className="w-4 h-4 mr-2" /> {t('Mark all as read', 'Σήμανση όλων ως αναγνωσμένων')}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-stone-400 hover:text-red-600" onClick={clearAll} disabled={all.length === 0}>
            <Trash2 className="w-4 h-4 mr-2" /> {t('Clear all', 'Διαγραφή όλων')}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {!isDemoMode && permission === 'default' && (
          <Card className="border-stone-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0"><BellRing className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">{t('Get alerts while you are away', 'Ειδοποιήσεις όταν λείπεις')}</p>
                  <p className="text-sm text-stone-500 mt-0.5">{t('Allow browser notifications for new messages and connection requests when this tab is in the background.', 'Επίτρεψε ειδοποιήσεις browser για νέα μηνύματα και αιτήματα σύνδεσης όταν η καρτέλα είναι στο παρασκήνιο.')}</p>
                </div>
              </div>
              <Button type="button" onClick={() => void askPermission()} className="shrink-0">{t('Turn on', 'Ενεργοποίηση')}</Button>
            </div>
          </Card>
        )}

        <Tabs tabs={tabs} activeTab={filter} onChange={(id) => setFilter(id as Filter)} variant="segment" />

        <Card noPadding className="overflow-hidden border-stone-200 shadow-sm">
          <div className="divide-y divide-stone-100">
            {!isDemoMode && !cloud.loaded && activity.length === 0 ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />)}
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 sm:p-6 flex gap-4 transition-colors hover:bg-stone-50/50 group relative',
                    !notification.read && 'bg-stone-50/30',
                  )}
                >
                  {!notification.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-900" aria-hidden="true" />}

                  {notification.fromName ? (
                    <Avatar src={notification.fromAvatar} fallback={notification.fromName} size="md" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white border border-stone-100 shadow-sm">
                      {getIcon(notification.type)}
                    </div>
                  )}

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      {notification.actionUrl ? (
                        <button
                          type="button"
                          className={cn('text-left text-sm hover:underline', !notification.read ? 'font-medium text-stone-900' : 'font-medium text-stone-600')}
                          onClick={() => openNote(notification)}
                        >
                          {t(notification.title, notification.titleEl || notification.title)}
                        </button>
                      ) : (
                        <h4 className={cn('text-sm', !notification.read ? 'font-medium text-stone-900' : 'font-medium text-stone-600')}>
                          {t(notification.title, notification.titleEl || notification.title)}
                        </h4>
                      )}
                      <RelTime iso={notification.time} className="text-xs font-medium text-stone-400 tracking-wide shrink-0" />
                    </div>
                    {notification.description ? (
                      <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
                        {t(notification.description, notification.descriptionEl || notification.description)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    {!notification.read && (
                      <Button type="button" variant="ghost" size="icon" aria-label={t('Mark as read', 'Σήμανση ως αναγνωσμένη')} title={t('Mark as read', 'Σήμανση ως αναγνωσμένη')} className="h-9 w-9 text-stone-400 hover:text-stone-900" onClick={() => markOneRead(notification)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('Delete', 'Διαγραφή')}
                      title={t('Delete', 'Διαγραφή')}
                      className="h-9 w-9 text-stone-400 hover:text-red-600"
                      onClick={() => deleteNotification(notification)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyHint
                className="m-6"
                title={filter === 'unread' ? t('Nothing unread', 'Καμία μη αναγνωσμένη ειδοποίηση') : t('All caught up', 'Καμία νέα ειδοποίηση')}
                detail={filter === 'people'
                  ? t('When a member sends you a request, a message or an endorsement, it appears here.', 'Όταν ένα μέλος σου στείλει αίτημα, μήνυμα ή σύσταση, θα εμφανιστεί εδώ.')
                  : t('No notifications in this list yet.', 'Δεν υπάρχουν ειδοποιήσεις σε αυτή τη λίστα ακόμη.')}
              >
                <AskLink prompt="show my studio activity" />
              </EmptyHint>
            )}
          </div>
        </Card>

        <Card className="bg-stone-900 text-white border-none p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="text-lg font-medium">{t('Manage your alerts', 'Διαχείριση ειδοποιήσεων')}</h4>
              <p className="text-sm text-white/60">{t('Choose which events notify you and how often.', 'Διάλεξε για ποια γεγονότα θα ειδοποιείσαι και πόσο συχνά.')}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => navigate('/settings?tab=notifications')}>{t('Notification settings', 'Ρυθμίσεις ειδοποιήσεων')}</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
