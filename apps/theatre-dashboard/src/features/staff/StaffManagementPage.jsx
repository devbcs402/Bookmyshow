import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Trash2, Mail, Shield, AlertCircle } from 'lucide-react';
import { staffApi } from '../../services/api/staff.api';
import { theatresApi } from '../../services/api/theatres.api';
import { useTheatreContextStore } from '../../store/theatreContext.store';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function StaffManagementPage() {
  const queryClient = useQueryClient();
  const { selectedTheatreId } = useTheatreContextStore();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'THEATRE_STAFF' });
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch partner theatres
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData) ? theatresData : theatresData?.theatres || [];
  const activeTheatreId = selectedTheatreId || theatres[0]?._id || theatres[0]?.id;

  // Fetch staff for active theatre
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['theatreStaff', activeTheatreId],
    queryFn: () => staffApi.getTheatreStaff(activeTheatreId),
    enabled: Boolean(activeTheatreId)
  });

  const staffList = Array.isArray(staffData) ? staffData : staffData?.staff || [];

  const assignMutation = useMutation({
    mutationFn: () =>
      staffApi.assignStaff(activeTheatreId, {
        email: inviteForm.email,
        role: inviteForm.role
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['theatreStaff', activeTheatreId]);
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', role: 'THEATRE_STAFF' });
      setErrorMessage('');
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to assign staff member.');
    }
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => staffApi.removeStaff(activeTheatreId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['theatreStaff', activeTheatreId]);
    }
  });

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteForm.email) {
      setErrorMessage('User email is required');
      return;
    }
    assignMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff Oversight & Access Delegation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Assign operations staff and managers to cinema branches with granular permissions
          </p>
        </div>

        {activeTheatreId && (
          <Button onClick={() => setIsInviteModalOpen(true)} icon={Plus} variant="primary">
            Assign Staff Member
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner text="Retrieving theatre staff..." />
      ) : staffList.length === 0 ? (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-12 text-center space-y-4">
          <Users className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Staff Members Assigned</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have not delegated management or front-desk access for this theatre property.
          </p>
          {activeTheatreId && (
            <Button size="sm" variant="secondary" onClick={() => setIsInviteModalOpen(true)} icon={Plus}>
              Assign First Staff Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((member) => {
            const uId = member._id || member.id || member.userId;
            const isManager = member.role === 'THEATRE_MANAGER';

            return (
              <div
                key={uId}
                className="bg-cinema-card border border-cinema-border rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isManager
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-partner-500/10 text-partner-400 border border-partner-500/20'
                      }`}
                    >
                      {member.role?.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => removeMutation.mutate(uId)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Revoke Staff Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-3 truncate">{member.name || 'Staff User'}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-cinema-border text-[11px] text-slate-500">
                  Assigned on {formatDate(member.createdAt || new Date())}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Assign Theatre Staff"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-slate-400 leading-relaxed">
            Specify the registered email address of the employee and choose their administrative privilege level.
          </p>

          <Input
            label="User Email Address"
            type="email"
            placeholder="staff@theatre.com"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            icon={Mail}
          />

          <Select
            label="Administrative Role"
            options={[
              { value: 'THEATRE_STAFF', label: 'THEATRE_STAFF (Admissions & Box Office Lookups)' },
              { value: 'THEATRE_MANAGER', label: 'THEATRE_MANAGER (Show Scheduling & Screen Layouts)' }
            ]}
            value={inviteForm.role}
            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
          />

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" isLoading={assignMutation.isPending}>
              Assign Access
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StaffManagementPage;

