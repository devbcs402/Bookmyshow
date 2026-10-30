import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  Clock, 
  User, 
  FileText,
  Lock
} from 'lucide-react';
import { adminAuditLogsApi } from '../../services/api/admin-audit-logs.api';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { formatDate, formatTime } from '../../utils/formatters';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, actionFilter],
    queryFn: () => adminAuditLogsApi.getAuditLogs({
      page,
      limit: 15,
      action: actionFilter || undefined,
    }),
  });

  const logs = data?.logs || [];
  const filteredLogs = logs.filter((log) =>
    (log.actor?.name || log.actorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.resourceType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform Security Audit Trail
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Immutable, append-only administrative activity records and compliance logs.
        </p>
      </div>

      {/* Immutability Notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <Lock className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong className="text-slate-900">Cryptographically Sealed Audit Trail:</strong> All entries are strictly read-only and retained in MongoDB with server-side write-once safeguards.
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 uppercase">
          Read-Only Enforcement
        </span>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor name, action, or resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Administrative Actions</option>
          <option value="THEATRE_APPROVE">Theatre Approvals</option>
          <option value="THEATRE_REJECT">Theatre Rejections</option>
          <option value="MOVIE_APPROVE">Movie Approvals</option>
          <option value="SHOW_CANCEL">Show Cancellations</option>
          <option value="REFUND_INITIATE">Refund Dispatches</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <ShieldCheck className="mx-auto h-8 w-8 mb-2 text-slate-300" />
            No audit records matching the specified criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action Event</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 font-mono">
                      <div>{formatDate(log.createdAt || log.timestamp)}</div>
                      <div className="text-[10px] text-slate-400">{formatTime(log.createdAt || log.timestamp)}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{log.actor?.name || log.actorName || 'Super Admin'}</div>
                      <div className="text-[10px] text-slate-400">{log.actor?.role || log.actorRole || 'SUPER_ADMIN'}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      <div>{log.resourceType || 'SYSTEM'}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">{log.resourceId}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={log.status || (log.error ? 'FAILED' : 'SUCCESS')} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        title="Inspect Full Payload"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.pagination && (
          <div className="border-t border-slate-200 px-6 py-3">
            <Pagination
              currentPage={page}
              totalPages={data.pagination.totalPages || 1}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Inspection"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block mb-0.5">Event Action</span>
                <span className="font-mono font-bold text-slate-900">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Recorded Timestamp</span>
                <span className="font-semibold text-slate-800">{new Date(selectedLog.createdAt || selectedLog.timestamp).toISOString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Actor Identity</span>
                <span className="font-semibold text-slate-900">{selectedLog.actor?.name || selectedLog.actorName || 'Super Admin'} ({selectedLog.actor?.role || 'SUPER_ADMIN'})</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Client IP Address</span>
                <span className="font-mono text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-800 block mb-1">Payload Metadata & Changes</span>
              <pre className="w-full overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-[11px] text-emerald-400 leading-relaxed max-h-64">
                {JSON.stringify(selectedLog.metadata || selectedLog.details || selectedLog, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
