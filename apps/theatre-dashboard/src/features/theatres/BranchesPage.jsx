import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, MapPin, Power } from 'lucide-react';
import { Link } from 'react-router-dom';
import { branchesApi } from '../../services/api/branches.api';
import { theatresApi } from '../../services/api/theatres.api';
import { useTheatreContextStore } from '../../store/theatreContext.store';
import { useAuthStore, Permissions } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function BranchesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { selectedTheatreId, setSelectedTheatreId } = useTheatreContextStore();

  // Fetch partner's theatres to populate filter
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData)
    ? theatresData
    : theatresData?.theatres || [];

  const activeTheatreId = selectedTheatreId || (theatres[0]?._id || theatres[0]?.id);

  // Fetch branches for selected theatre
  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['theatreBranches', activeTheatreId],
    queryFn: () => branchesApi.getBranchesByTheatre(activeTheatreId),
    enabled: Boolean(activeTheatreId)
  });

  const branches = Array.isArray(branchesData)
    ? branchesData
    : branchesData?.branches || [];

  const toggleStatusMutation = useMutation({
    mutationFn: ({ branchId, status }) => branchesApi.toggleBranchStatus(branchId, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['theatreBranches', activeTheatreId]);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Branches & Multiplex Locations</h1>
          <p className="text-xs text-slate-400 mt-1">
            Physical cinema properties associated with your theatre brand
          </p>
        </div>

        <div className="flex items-center gap-3">
          {theatres.length > 0 && (
            <select
              value={activeTheatreId || ''}
              onChange={(e) => setSelectedTheatreId(e.target.value)}
              className="bg-cinema-card border border-cinema-border text-xs text-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-partner-500"
            >
              {theatres.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {hasPermission(Permissions.THEATRE_UPDATE) && activeTheatreId && (
            <Link to={`/branches/create?theatreId=${activeTheatreId}`}>
              <Button icon={Plus} variant="primary">
                Add Branch
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Retrieving multiplex branches..." />
      ) : branches.length === 0 ? (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-cinema-elevated text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Branches Registered</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Add physical locations to enable screen configuration and show scheduling.
          </p>
          {activeTheatreId && hasPermission(Permissions.THEATRE_UPDATE) && (
            <Link to={`/branches/create?theatreId=${activeTheatreId}`}>
              <Button size="sm" variant="secondary" icon={Plus}>
                Create Branch Location
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => {
            const bId = branch._id || branch.id;
            const isActive = branch.status === 'ACTIVE';

            return (
              <div
                key={bId}
                className="bg-cinema-card border border-cinema-border rounded-xl p-5 flex flex-col justify-between hover:border-slate-600 transition-all space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-white tracking-tight">{branch.name}</h3>
                    <StatusBadge status={branch.status} />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 mt-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{branch.city || branch.address?.city || 'City N/A'}</span>
                    </div>
                    {branch.address?.street && (
                      <p className="text-slate-400 truncate pl-5">{branch.address.street}</p>
                    )}
                  </div>

                  {branch.facilities && branch.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {branch.facilities.slice(0, 4).map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cinema-elevated text-slate-300"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-cinema-border flex items-center justify-between text-xs">
                  <button
                    onClick={() =>
                      toggleStatusMutation.mutate({
                        branchId: bId,
                        status: isActive ? 'INACTIVE' : 'ACTIVE'
                      })
                    }
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <div className="flex items-center gap-2">
                    {hasPermission(Permissions.THEATRE_UPDATE) && (
                      <Link
                        to={`/branches/${bId}/edit`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cinema-elevated"
                        title="Edit Branch"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BranchesPage;

