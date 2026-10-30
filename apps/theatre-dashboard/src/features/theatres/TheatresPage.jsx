import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { theatresApi } from '../../services/api/theatres.api';
import { useAuthStore, Roles, Permissions } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export function TheatresPage() {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuthStore();
  const [deleteTargetId, setDeleteTargetId] = React.useState(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['myTheatresList'],
    queryFn: () => theatresApi.getMyTheatres({ limit: 100 })
  });

  const theatres = Array.isArray(response)
    ? response
    : response?.theatres || [];

  const deleteMutation = useMutation({
    mutationFn: (theatreId) => theatresApi.deleteTheatre(theatreId),
    onSuccess: () => {
      queryClient.invalidateQueries(['myTheatresList']);
      queryClient.invalidateQueries(['myTheatresSwitcher']);
      setDeleteTargetId(null);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cinema Complexes & Theatres</h1>
          <p className="text-xs text-slate-400 mt-1">
            Exhibitor properties registered under your partner organization
          </p>
        </div>

        {hasRole(Roles.THEATRE_OWNER) && hasPermission(Permissions.THEATRE_CREATE) && (
          <Link to="/theatres/create">
            <Button icon={Plus} variant="primary">
              Register New Theatre
            </Button>
          </Link>
        )}
      </div>

      {/* Grid of Theatres */}
      {isLoading ? (
        <LoadingSpinner text="Retrieving registered theatre complexes..." />
      ) : theatres.length === 0 ? (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-cinema-elevated text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Theatre Complexes Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have not registered any cinema entities under your partner account yet.
          </p>
          {hasRole(Roles.THEATRE_OWNER) && (
            <Link to="/theatres/create">
              <Button size="sm" variant="secondary" icon={Plus}>
                Register Your First Theatre
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {theatres.map((theatre) => {
            const id = theatre._id || theatre.id;
            return (
              <div
                key={id}
                className="bg-cinema-card border border-cinema-border rounded-xl p-5 flex flex-col justify-between hover:border-slate-600/60 transition-all shadow-sm space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-white tracking-tight truncate">
                      {theatre.name}
                    </h3>
                    <StatusBadge status={theatre.status || theatre.approvalStatus} />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400 mt-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{theatre.city || theatre.address?.city || 'City N/A'}</span>
                    </div>
                    {theatre.contactEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{theatre.contactEmail}</span>
                      </div>
                    )}
                    {theatre.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{theatre.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-cinema-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/theatres/${id}`}
                      className="text-partner-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      View Branches <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    {hasPermission(Permissions.THEATRE_UPDATE) && (
                      <Link
                        to={`/theatres/${id}/edit`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cinema-elevated transition-colors"
                        title="Edit Theatre"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}

                    {hasRole(Roles.THEATRE_OWNER) && hasPermission(Permissions.THEATRE_DELETE) && (
                      <button
                        onClick={() => setDeleteTargetId(id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Theatre"
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

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => deleteMutation.mutate(deleteTargetId)}
        title="Delete Theatre Complex"
        message="Are you sure you want to deactivate and remove this cinema complex? This will disable all associated branches, screens, and scheduled shows."
        confirmText="Delete Complex"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default TheatresPage;

