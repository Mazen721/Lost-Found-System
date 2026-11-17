import { Bell, CheckCheck, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { iconForType } from '@/components/shared/NotificationBell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { notificationsApi } from '@/features/notifications/notificationsApi';
import { resolveParams } from '@/i18n/localize';
import { fmtDistanceToNow } from '@/lib/dateLocale';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/notifications';

/** Same key + queryFn as the top-bar bell, so both share one cache. */
const NOTIFICATIONS_QUERY_KEY = ['notifications', 'bell'] as const;

interface MobileNotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNotificationsSheet({ open, onOpenChange }: MobileNotificationsSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => notificationsApi.list({ limit: 10 }),
    staleTime: 15_000,
    enabled: open,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: ({ updated }) => {
      toast.success(updated > 0 ? t('common.success') : t('notifications.allCaughtUp'));
      return invalidate();
    },
    onError: () => toast.error(t('errors.generic')),
  });

  const notifications = notificationsQuery.data?.data ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  const handleOpen = (notification: AppNotification) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="fixed inset-x-0 bottom-0 left-0 top-auto flex max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-b-none rounded-t-2xl border-x-0 border-b-0 bg-card p-0 sm:rounded-b-none sm:rounded-t-2xl"
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-border"
        />
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
          <DialogTitle className="text-base font-bold text-foreground">
            {t('notifications.title')}
            {unreadCount > 0 ? (
              <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {unreadCount} {t('notifications.unread')}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('notifications.title')}</DialogDescription>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="h-12 gap-1.5 px-3 text-xs font-semibold"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
              )}
              {t('notifications.markAllAsRead')}
            </Button>
            <DialogClose
              className="flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogClose>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[env(safe-area-inset-bottom)]">
          {notificationsQuery.isLoading ? (
            <div className="space-y-2 p-2" aria-busy="true" aria-label={t('common.loading')}>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notificationsQuery.isError ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                {t('notifications.unableToLoad')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void notificationsQuery.refetch()}
              >
                {t('ai.retry')}
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-foreground">{t('notifications.allCaughtUp')}</p>
              <p className="text-xs text-muted-foreground">{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.map((notification) => (
                <SheetNotificationRow
                  key={notification.id}
                  notification={notification}
                  onOpen={handleOpen}
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SheetNotificationRowProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}

function SheetNotificationRow({ notification, onOpen }: SheetNotificationRowProps) {
  const { t } = useTranslation();
  const Icon = iconForType(notification.type);
  const destination = notification.linkUrl ?? '/dashboard';
  const resolvedParams = resolveParams(notification.params);
  const localizedTitle = notification.titleKey
    ? t(`notif.${notification.titleKey}`, { ...resolvedParams, defaultValue: notification.title })
    : notification.title;
  const localizedMessage = notification.messageKey
    ? t(`notif.${notification.messageKey}`, {
        ...resolvedParams,
        defaultValue: notification.message,
      })
    : notification.message;

  return (
    <li>
      <Link
        to={destination}
        onClick={() => onOpen(notification)}
        className="flex min-h-14 items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            notification.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className={cn(
                'line-clamp-2 text-sm leading-snug',
                notification.isRead ? 'text-muted-foreground' : 'font-semibold text-foreground',
              )}
            >
              {localizedTitle}
            </span>
            {!notification.isRead ? (
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-label={t('notifications.unread')}
              />
            ) : null}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
            {localizedMessage}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground/80">
            {fmtDistanceToNow(notification.createdAt, { addSuffix: true })}
          </span>
        </span>
      </Link>
    </li>
  );
}
