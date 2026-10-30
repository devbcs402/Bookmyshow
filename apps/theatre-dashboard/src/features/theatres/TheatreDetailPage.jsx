import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Mail, Phone, Tv, Plus, ArrowLeft, Edit } from 'lucide-react';
import { theatresApi } from '../../services/api/theatres.api';
import { branchesApi } from '../../services/api/branches.api';
import { screensApi } from '../../services/api/screens.api';
import { useAuthStore, Permissions } from '../../store/auth.store';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export function TheatreDetailPage() {
  const { theatreId } = useParams();
  const { hasPermission } = useAuthStore();

  const { data: theatre, isLoading: theatreLoading } = useQuery({
    queryKey: ['theatreDetail', theatreId],
    queryFn: () => theatresApi.getTheatreById(theatreId)
  });

  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['theatreBranches', theatreId],
    queryFn: () => branchesApi.getBranchesByTheatre(theatreId)
  });

  const { data: screensData, isLoading: screensLoading } = useQuery({
    queryKey: ['theatreScreens', theatreId],
    queryFn: () => screensApi.getScreensByTheatre(theatreId)
  });

  const branches = Array.isArray(branchesData)
    ? branchesData
    : branchesData?.branches || [];

  const screens = Array.isArray(screensData)
    ? screensData
    : screensData?.screens || [];

  if (theatreLoading) {
    return <LoadingSpinner text="Retrieving theatre profile..." />;
  }

  if (!theatre) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-lg font-bold text-white">Theatre Complex Not Found</h2>
        <Link to="/theatres">
          <Button variant="outline">Back to Theatres</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div className="flex items-center gap-3">
          <Link
            to="/theatres"
            className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{theatre.name}</h1>
              <StatusBadge status={theatre.status || theatre.approvalStatus} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registered Partner Property ID: <span className="font-mono text-slate-300">{theatre._id || theatre.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission(Permissions.THEATRE_UPDATE) && (
            <Link to={`/theatres/${theatre._id || theatre.id}/edit`}>
              <Button size="sm" variant="outline" icon={Edit}>
                Edit Details
              </Button>
            </Link>
          )}
          {hasPermission(Permissions.THEATRE_UPDATE) && (
            <Link to={`/branches/create?theatreId=${theatre._id || theatre.id}`}>
              <Button size="sm" variant="secondary" icon={Plus}>
                Add Branch
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Location</h3>
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-partner-400 shrink-0 mt-0.5" />
            <span>
              {theatre.address?.street || theatre.address || 'Street address not set'}, {theatre.city || theatre.address?.city}
            </span>
          </div>
        </div>

        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Communication</h3>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-partner-400 shrink-0" />
              <span>{theatre.contactEmail || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-partner-400 shrink-0" />
              <span>{theatre.contactPhone || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Auditoriums</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-white">{screens.length}</span>
              <p className="text-xs text-slate-400">Active Screens</p>
            </div>
            {hasPermission(Permissions.SCREEN_MANAGE) && (
              <Link to={`/screens/create?theatreId=${theatre._id || theatre.id}`}>
                <Button size="sm" variant="outline" icon={Plus}>
                  New Screen
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Branches List Section */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-cinema-border">
          <div>
            <h3 className="text-base font-bold text-white">Physical Multiplex Branches</h3>
            <p className="text-xs text-slate-400">Operating cinema branches under {theatre.name}</p>
          </div>
          {hasPermission(Permissions.THEATRE_UPDATE) && (
            <Link to={`/branches/create?theatreId=${theatre._id || theatre.id}`}>
              <Button size="sm" variant="ghost" icon={Plus}>
                New Branch
              </Button>
            </Link>
          )}
        </div>

        {branchesLoading ? (
          <LoadingSpinner text="Loading branches..." />
        ) : branches.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No physical branches created under this theatre brand yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((branch) => {
              const bId = branch._id || branch.id;
              return (
                <div
                  key={bId}
                  className="bg-cinema-dark border border-cinema-border rounded-lg p-4 flex items-center justify-between hover:border-slate-600 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{branch.name}</h4>
                      <StatusBadge status={branch.status} />
                    </div>
                    <p className="text-xs text-slate-400">{branch.city || branch.address?.city}</p>
                  </div>
                  <Link
                    to={`/branches/${bId}/edit`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-cinema-elevated"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Screens Section */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-cinema-border">
          <div>
            <h3 className="text-base font-bold text-white">Screens & Auditoriums</h3>
            <p className="text-xs text-slate-400">Projection halls in this complex</p>
          </div>
          {hasPermission(Permissions.SCREEN_MANAGE) && (
            <Link to={`/screens/create?theatreId=${theatre._id || theatre.id}`}>
              <Button size="sm" variant="ghost" icon={Plus}>
                New Screen
              </Button>
            </Link>
          )}
        </div>

        {screensLoading ? (
          <LoadingSpinner text="Loading screens..." />
        ) : screens.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No auditorium screens configured yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {screens.map((screen) => {
              const sId = screen._id || screen.id;
              return (
                <div
                  key={sId}
                  className="bg-cinema-dark border border-cinema-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{screen.name}</h4>
                    <StatusBadge status={screen.status} />
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>Projection: <span className="text-slate-200">{screen.projectionType || '2D'}</span></p>
                    <p>Sound: <span className="text-slate-200">{screen.soundSystem || 'Dolby Digital'}</span></p>
                    <p>Total Seats: <span className="text-slate-200">{screen.totalSeats || 0}</span></p>
                  </div>
                  <div className="pt-2 border-t border-cinema-border flex items-center justify-between text-xs">
                    <Link
                      to={`/screens/${sId}/layout`}
                      className="text-partner-400 font-semibold hover:underline"
                    >
                      Seat Layout Builder →
                    </Link>
                    <Link
                      to={`/screens/${sId}/edit`}
                      className="text-slate-400 hover:text-white"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TheatreDetailPage;

