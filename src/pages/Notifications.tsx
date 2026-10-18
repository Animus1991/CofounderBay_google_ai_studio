import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, UserPlus, Zap, Trophy, Rocket, Check, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import PageShell from '../components/ui/PageShell';
import EmptyHint, { AskLink } from '../components/ui/EmptyHint';
import RelTime from '../components/ui/RelTime';
import { cn } from '../lib/utils';
import { useT } from '../lib/language';
import { clearActivity, keys, markActivityRead, readActivity, type ActivityKind } from '../lib/localLists';
import { useStored } from '../lib/useStored';

interface Notification {
  id: string;
  type: 'message' | 'match' | 'milestone' | 'system' | 'community';
  title: string;
  titleEl?: string;
  description: string;
  descriptionEl?: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

function kindToType(kind: ActivityKind): Notification['type'] {
  if (kind === 'message') return 'message';
  if (kind === 'request' || kind === 'profile') return 'match';
  if (kind === 'milestone') return 'milestone';
  if (kind === 'community' || kind === 'event') return 'community';
  return 'system';
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export default function Notifications() {
  const t = useT();
  const navigate = useNavigate();
  const activity = useStored(readActivity, [keys.activity]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [seed, setSeed] = useState<Notification[]>([
    {
      id: '1',
      type: 'match',
      title: 'New match suggestion',
      titleEl: 'Νέα πρόταση αντιστοίχισης',
      description: 'Sarah Chen is a 94% match for your Fintech project. View her profile to connect.',
      descriptionEl: 'Η Sarah Chen είναι 94% αντιστοίχιση για το FinTech έργο. Άνοιξε το προφίλ για σύνδεση.',
      time: hoursAgo(2),
      read: false,
      actionUrl: '/profile/sarah-chen',
    },
    {
      id: '2',
      type: 'message',
      title: 'New message from Marcus',
      titleEl: 'Νέο μήνυμα από τον Marcus',
      description: "Hey! I'd love to discuss the product roadmap we talked about yesterday.",
      descriptionEl: "Hey! I'd love to discuss the product roadmap we talked about yesterday.",
      time: hoursAgo(5),
      read: false,
      actionUrl: '/messages',
    },
    {
      id: '3',
      type: 'milestone',
      title: 'Milestone achieved',
      titleEl: 'Ορόσημο ολοκληρώθηκε',
      description: "You've completed your 'First 5 Match Requests' milestone.",
      descriptionEl: 'Ολοκληρώθηκε το ορόσημο «First 5 Match Requests».',
      time: hoursAgo(24),
      read: true,
    },
    {
      id: '4',
      type: 'system',
      title: 'Platform update',
      titleEl: 'Ενημέρωση πλατφόρμας',
      description: "We've added new AI-powered matching dimensions to help you find better partners.",
      descriptionEl: 'Προστέθηκαν νέες διαστάσεις αντιστοίχισης με AI για καλύτερους συνεταίρους.',
      time: hoursAgo(48),
      read: true,
    },
  ]);

  const studioNotes: Notification[] = useMemo(() => activity.map((item) => ({
    id: item.id,
    type: kindToType(item.kind),
    title: item.title,
    titleEl: item.titleEl,
    description: '',
    time: item.at,
    read: item.read,
    actionUrl: item.href,
  })), [activity]);
  const notifications = [...studioNotes, ...seed].filter((item) => !hiddenIds.includes(item.id));

  const markAllAsRead = () => {
    markActivityRead('all');
    setSeed((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setHiddenIds((prev) => [...prev, id]);
    setSeed((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    clearActivity();
    setSeed([]);
    setHiddenIds([]);
  };

  const openNote = (notification: Notification) => {
    markActivityRead([notification.id]);
    setSeed((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const getIcon = (type: Notification['type']) => {
    const iconCls = 'w-4 h-4 text-stone-500';
    switch (type) {
      case 'message': return <MessageSquare className={iconCls} />;
      case 'match': return <UserPlus className={iconCls} />;
      case 'milestone': return <Trophy className={iconCls} />;
      case 'system': return <Zap className={iconCls} />;
      case 'community': return <Rocket className={iconCls} />;
      default: return <Bell className={iconCls} />;
    }
  };

  return (
    <PageShell
      title={t('Notifications', 'Ειδοποιήσεις')}
      description={t('Stay updated with your ecosystem activity and connections.', 'Τι άλλαξε στο οικοσύστημα και στις συνδέσεις.')}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AskLink prompt="show my studio activity" />
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" /> {t('Mark all as read', 'Όλα ως αναγνωσμένα')}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-stone-400 hover:text-red-600" onClick={clearAll}>
            <Trash2 className="w-4 h-4 mr-2" /> {t('Clear all', 'Καθαρισμός')}
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <Card noPadding className="overflow-hidden border-stone-200 shadow-sm">
          <div className="divide-y divide-stone-100">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-6 flex gap-4 transition-colors hover:bg-stone-50/50 group relative',
                    !notification.read && 'bg-stone-50/30',
                  )}
                >
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-900" />
                  )}

                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    'bg-white border border-stone-100 shadow-sm',
                  )}>
                    {getIcon(notification.type)}
                  </div>

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

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-900" onClick={() => { markActivityRead([notification.id]); setSeed((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))); }}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-stone-400 hover:text-red-600"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyHint className="m-6" title={t('All caught up', 'Όλα εντάξει')} detail={t('No notifications in this list. Ask the studio assistant what changed today.', 'Καμία ειδοποίηση σε αυτή τη λίστα. Ρώτα τον βοηθό τι άλλαξε σήμερα.')}>
                <AskLink prompt="show my studio activity" />
              </EmptyHint>
            )}
          </div>
        </Card>

        <Card className="bg-stone-900 text-white border-none p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="text-lg font-medium">{t('Manage your alerts', 'Διαχείριση ειδοποιήσεων')}</h4>
              <p className="text-sm text-white/60">{t('Choose how and when you want to be notified about ecosystem activity.', 'Διάλεξε πώς και πότε θέλεις ειδοποίηση για ό,τι αλλάζει.')}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => navigate('/settings')}>{t('Notification Settings', 'Ρυθμίσεις ειδοποιήσεων')}</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
