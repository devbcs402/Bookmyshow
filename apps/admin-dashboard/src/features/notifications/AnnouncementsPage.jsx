import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  Send, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Radio,
  Clock
} from 'lucide-react';
import { adminNotificationsApi } from '../../services/api/admin-notifications.api';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate, formatNumber } from '../../utils/formatters';

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState(['IN_APP', 'EMAIL']);
  const [targetAudience, setTargetAudience] = useState('ALL_USERS');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(false);

  // Fetch notification delivery statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-notifications-stats'],
    queryFn: adminNotificationsApi.getStats,
    refetchInterval: 60000,
  });

  // Fetch broadcast history
  const { data: notificationsData, isLoading: notifLoading } = useQuery({
    queryKey: ['admin-notifications-history'],
    queryFn: () => adminNotificationsApi.getAllNotifications({ limit: 10 }),
  });

  const broadcastMutation = useMutation({
    mutationFn: (payload) => adminNotificationsApi.broadcastAnnouncement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications-history'] });
      setTitle('');
      setMessage('');
      setActionSuccess(true);
      setConfirmModalOpen(false);
    },
    onError: (err) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to dispatch broadcast');
      setConfirmModalOpen(false);
    }
  });

  const toggleChannel = (ch) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(false);

    if (!title.trim()) {
      setActionError('Announcement headline title is required.');
      return;
    }
    if (!message.trim()) {
      setActionError('Announcement body message is required.');
      return;
    }
    if (channels.length === 0) {
      setActionError('Select at least one delivery communication channel.');
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleExecuteBroadcast = () => {
    broadcastMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      channels,
      targetAudience,
    });
  };

  const notificationsList = notificationsData?.notifications || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform Announcements & Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Broadcast system notifications, promotional alerts, and service updates to platform users.
        </p>
      </div>

      {/* Delivery Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sent"
          value={statsLoading ? '...' : formatNumber(statsData?.total || 0)}
          description="All channels aggregate"
          icon={Bell}
        />
        <StatCard
          title="Email Delivered"
          value={statsLoading ? '...' : formatNumber(statsData?.email?.delivered || 0)}
          description="Transactional & broadcast"
          icon={Mail}
        />
        <StatCard
          title="SMS Delivered"
          value={statsLoading ? '...' : formatNumber(statsData?.sms?.delivered || 0)}
          description="Carrier SMS pipeline"
          icon={Smartphone}
        />
        <StatCard
          title="In-App Impressions"
          value={statsLoading ? '...' : formatNumber(statsData?.inApp?.delivered || 0)}
          description="Push & notification feed"
          icon={MessageSquare}
        />
      </div>

      {/* Broadcast Composer */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Send className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-bold text-slate-900">Compose Platform Broadcast</h3>
          </div>
          <span className="text-xs text-slate-500">All dispatches queued via Redis BullMQ</span>
        </div>

        {actionSuccess && (
          <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 border border-emerald-300 p-4 text-xs font-medium text-emerald-800 animate-fadeIn">
            <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Platform broadcast successfully queued and dispatched to target users!</span>
          </div>
        )}

        {actionError && (
          <div className="flex items-center space-x-2 rounded-xl bg-rose-50 border border-rose-300 p-4 text-xs font-medium text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={handleOpenConfirm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Announcement Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled System Maintenance on Sunday Midnight"
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Target User Cohort
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL_USERS">All Platform Users (Customers & Exhibitors)</option>
                <option value="CUSTOMERS_ONLY">Customers Only</option>
                <option value="THEATRE_OWNERS_ONLY">Exhibitor Theatre Partners Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Dispatch Communication Channels <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'IN_APP', label: 'In-App Notification Feed', icon: Bell },
                { id: 'EMAIL', label: 'Email Digest (SendGrid)', icon: Mail },
                { id: 'SMS', label: 'SMS Carrier Push (Twilio)', icon: Smartphone },
                { id: 'WHATSAPP', label: 'WhatsApp Business API', icon: MessageSquare },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => toggleChannel(id)}
                  className={`flex items-center space-x-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    channels.includes(id)
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Message Body / Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide complete communication details. Markdown links and plain text are supported."
              className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary">
              <Send className="h-4 w-4 mr-2" />
              Preview & Dispatch Broadcast
            </Button>
          </div>
        </form>
      </div>

      {/* Broadcast History Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-900">Recent Broadcast Log</h3>
          <p className="text-xs text-slate-500">Historical announcements pushed through the administrative queue</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Headline Title</th>
                <th className="px-6 py-3">Channels</th>
                <th className="px-6 py-3">Target Audience</th>
                <th className="px-6 py-3">Dispatched Date</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notificationsList.length > 0 ? (
                notificationsList.map((notif, idx) => (
                  <tr key={notif._id || idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{notif.title || 'Platform Announcement'}</td>
                    <td className="px-6 py-3.5 text-slate-600">{notif.channels?.join(', ') || 'In-App'}</td>
                    <td className="px-6 py-3.5 text-slate-600">{notif.targetAudience || 'All Users'}</td>
                    <td className="px-6 py-3.5 text-slate-500">{formatDate(notif.createdAt)}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        DISPATCHED
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    No previous platform announcements recorded in queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleExecuteBroadcast}
        title="Confirm Platform-Wide Broadcast"
        message={`Are you sure you want to push "${title}" via [${channels.join(', ')}] to [${targetAudience}]? This action immediately triggers actual user notifications.`}
        confirmText="Execute Broadcast"
        variant="warning"
        isLoading={broadcastMutation.isPending}
      />
    </div>
  );
}
