import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  CheckCheck,
  Trash2,
  Calendar
} from 'lucide-react';
import notificationsApi from '../../services/api/notifications.api';
import socketService from '../../services/socket/socket.client';
import { SOCKET_EVENTS } from '../../constants';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, formatTime } from '../../utils/formatters';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Paginated Notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationsApi.getNotifications({ limit: 30 })
  });

  const notifications = notificationsData?.data || [];

  // Listen for real-time notifications via Socket.IO
  useEffect(() => {
    const handleNewNotification = newNotif => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    };

    socketService.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);

    return () => {
      socketService.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    };
  }, [queryClient]);

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: id => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: id => notificationsApi.deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cinema-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time ticket updates, booking confirmations, and show alerts
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={CheckCheck}
            isLoading={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-cinema-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map(notif => {
            const isRead = notif.isRead;
            return (
              <div
                key={notif._id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  isRead
                    ? 'bg-cinema-card/60 border-cinema-border/60 opacity-80'
                    : 'bg-cinema-card border-brand/40 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notif.type?.includes('CONFIRM') || notif.type?.includes('SUCCESS') ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : notif.type?.includes('CANCEL') || notif.type?.includes('EXPIRE') ? (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Info className="w-5 h-5 text-sky-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">
                        {notif.title || 'Cinema Alert'}
                      </h3>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-brand" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300">
                      {notif.message || notif.body}
                    </p>
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      {formatDate(notif.createdAt)} at {formatTime(notif.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(notif._id)}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(notif._id)}
                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-xs"
                    title="Dismiss notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You are all caught up! Live alerts regarding your booked movie tickets will appear here."
        />
      )}
    </div>
  );
}

export default NotificationsPage;

