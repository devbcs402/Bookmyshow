import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { notificationsApi } from '../../services/api/notifications.api';
import { formatDate, formatTime } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['partnerNotifications'],
    queryFn: () => notificationsApi.getNotifications({ limit: 50 })
  });

  const notifications = Array.isArray(notificationsData)
    ? notificationsData
    : notificationsData?.notifications || [];

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['partnerNotifications']);
      queryClient.invalidateQueries(['unreadNotificationsCount']);
    }
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['partnerNotifications']);
      queryClient.invalidateQueries(['unreadNotificationsCount']);
    }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Partner Notifications</h1>
          <p className="text-xs text-slate-400 mt-1">
            Operational alerts, property verification approvals, and booking notices
          </p>
        </div>

        {notifications.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            icon={CheckCheck}
            onClick={() => markAllMutation.mutate()}
            isLoading={markAllMutation.isPending}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner text="Retrieving operational alerts..." />
      ) : notifications.length === 0 ? (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-12 text-center space-y-4">
          <Bell className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Unread Notifications</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You are completely caught up. New operational updates from the platform will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-cinema-card border border-cinema-border rounded-xl divide-y divide-cinema-border overflow-hidden shadow-sm">
          {notifications.map((n) => {
            const id = n._id || n.id;
            const isUnread = !n.read && !n.isRead;

            return (
              <div
                key={id}
                onClick={() => isUnread && markOneMutation.mutate(id)}
                className={`p-4 flex items-start gap-4 transition-colors cursor-pointer ${
                  isUnread ? 'bg-cinema-elevated/40 hover:bg-cinema-elevated/60' : 'hover:bg-cinema-dark/50'
                }`}
              >
                <div className="p-2 rounded-lg bg-partner-500/10 text-partner-400 shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">{n.title || 'Platform Notice'}</h4>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {formatDate(n.createdAt)}, {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {n.message || n.body || 'No details provided.'}
                  </p>
                </div>

                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-2" title="Unread" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;

