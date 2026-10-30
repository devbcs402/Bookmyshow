import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tv, Plus, Edit, Grid, Trash2, Power, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { screensApi } from '../../services/api/screens.api';
import { theatresApi } from '../../services/api/theatres.api';
import { useTheatreContextStore } from '../../store/theatreContext.store';
import { useAuthStore, Permissions } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export function ScreensPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const { selectedTheatreId, setSelectedTheatreId } = useTheatreContextStore();
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Fetch partner theatres
  const { data: theatresData } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 50 })
  });

  const theatres = Array.isArray(theatresData)
    ? theatresData
    : theatresData?.theatres || [];

  const activeTheatreId = selectedTheatreId || (theatres[0]?._id || theatres[0]?.id);

  // Fetch screens for active theatre
  const { data: screensData, isLoading } = useQuery({
    queryKey: ['theatreScreens', activeTheatreId],
    queryFn: () => screensApi.getScreensByTheatre(activeTheatreId),
    enabled: Boolean(activeTheatreId)
  });

  const screens = Array.isArray(screensData)
    ? screensData
    : screensData?.screens || [];

  const toggleStatusMutation = useMutation({
    mutationFn: ({ screenId, status }) => screensApi.updateScreenStatus(screenId, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['theatreScreens', activeTheatreId]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (screenId) => screensApi.deleteScreen(screenId),
    onSuccess: () => {
      queryClient.invalidateQueries(['theatreScreens', activeTheatreId]);
      setDeleteTargetId(null);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Auditoriums & Screens</h1>
          <p className="text-xs text-slate-400 mt-1">
            Projection halls, hardware specifications, and seating layouts
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

          {hasPermission(Permissions.SCREEN_MANAGE) && activeTheatreId && (
            <Link to={`/screens/create?theatreId=${activeTheatreId}`}>
              <Button icon={Plus} variant="primary">
                Add Screen
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Screen Cards Grid */}
      {isLoading ? (
        <LoadingSpinner text="Retrieving auditorium screens..." />
      ) : screens.length === 0 ? (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-cinema-elevated text-slate-400 flex items-center justify-center mx-auto">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Screens Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Configure auditorium projection halls to start designing seat layouts and scheduling shows.
          </p>
          {activeTheatreId && hasPermission(Permissions.SCREEN_MANAGE) && (
            <Link to={`/screens/create?theatreId=${activeTheatreId}`}>
              <Button size="sm" variant="secondary" icon={Plus}>
                Create Auditorium Screen
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens.map((screen) => {
            const sId = screen._id || screen.id;
            const isActive = screen.status === 'ACTIVE';

            return (
              <div
                key={sId}
                className="bg-cinema-card border border-cinema-border rounded-xl p-5 flex flex-col justify-between hover:border-slate-600 transition-all space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{screen.name}</h3>
                      <p className="text-[11px] text-slate-400">Screen #{screen.screenNumber || 1}</p>
                    </div>
                    <StatusBadge status={screen.status} />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 mt-4 bg-cinema-dark p-3 rounded-lg border border-cinema-border">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Projection:</span>
                      <span className="font-semibold text-white">{screen.projectionType || 'STANDARD_2D'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sound Engine:</span>
                      <span className="font-semibold text-white">{screen.soundSystem || 'DOLBY_7_1'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Seat Capacity:</span>
                      <span className="font-semibold text-partner-400">{screen.totalSeats || 0} seats</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Layout Version:</span>
                      <span className="font-mono text-emerald-400">v{screen.activeLayoutVersion || 1}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-cinema-border">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/screens/${sId}/layout`}
                      className="flex-1"
                    >
                      <Button size="sm" variant="secondary" className="w-full text-xs" icon={Grid}>
                        Layout Builder
                      </Button>
                    </Link>
                    <Link to={`/screens/${sId}/edit`}>
                      <Button size="sm" variant="outline" className="p-2" title="Edit Screen Hardware">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          screenId: sId,
                          status: isActive ? 'INACTIVE' : 'ACTIVE'
                        })
                      }
                      className={`flex items-center gap-1 font-medium transition-colors ${
                        isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    {hasPermission(Permissions.SCREEN_MANAGE) && (
                      <button
                        onClick={() => setDeleteTargetId(sId)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Screen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Screen Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => deleteMutation.mutate(deleteTargetId)}
        title="Delete Auditorium Screen"
        message="Are you sure you want to delete this screen? This will remove all associated layout configurations. Deletion will be rejected if future shows are scheduled."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default ScreensPage;

