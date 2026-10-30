import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Wand2,
  Send,
  History,
  Grid as GridIcon,
  HelpCircle,
  Eye
} from 'lucide-react';
import { seatLayoutsApi } from '../../services/api/seat-layouts.api';
import { screensApi } from '../../services/api/screens.api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const CATEGORY_COLORS = {
  VIP: { bg: 'bg-purple-600', border: 'border-purple-400', label: 'VIP / Recliner' },
  PLATINUM: { bg: 'bg-sky-500', border: 'border-sky-300', label: 'Platinum' },
  GOLD: { bg: 'bg-amber-500', border: 'border-amber-300', label: 'Gold' },
  SILVER: { bg: 'bg-slate-400', border: 'border-slate-300', label: 'Silver' },
  REGULAR: { bg: 'bg-slate-500', border: 'border-slate-400', label: 'Regular' }
};

export function SeatLayoutBuilderPage() {
  const { screenId } = useParams();
  const queryClient = useQueryClient();

  // Active Tool: 'CATEGORY' | 'STATUS' | 'AISLE'
  const [activeTool, setActiveTool] = useState('CATEGORY');
  const [selectedCategory, setSelectedCategory] = useState('GOLD');
  const [activeStatus, setActiveStatus] = useState('ACTIVE');

  // Seats matrix state: array of seat objects
  const [seats, setSeats] = useState([]);
  const [screenMeta, setScreenMeta] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  // Bulk Generator Form State
  const [generatorForm, setGeneratorForm] = useState({
    rowCount: 8,
    seatsPerRow: 16,
    aisle1: 4,
    aisle2: 12,
    categorySplit: 'BALANCED' // or UNIFORM
  });

  // 1. Fetch Screen Details
  const { data: screenData } = useQuery({
    queryKey: ['screenDetail', screenId],
    queryFn: () => screensApi.getScreenById(screenId)
  });

  // 2. Fetch Existing Layout / Draft
  const { data: layoutData, isLoading: layoutLoading } = useQuery({
    queryKey: ['screenLayout', screenId],
    queryFn: () => seatLayoutsApi.getLayout(screenId),
    retry: false
  });

  // 3. Fetch Versions
  const { data: versionsData } = useQuery({
    queryKey: ['layoutVersions', screenId],
    queryFn: () => seatLayoutsApi.getLayoutVersions(screenId),
    enabled: isVersionsOpen
  });

  // Sync loaded layout into local canvas state
  useEffect(() => {
    if (layoutData?.seats && layoutData.seats.length > 0) {
      setSeats(layoutData.seats);
    } else if (screenData && seats.length === 0) {
      // Initialize an 8-row x 14-col default layout if empty
      initializeDefaultLayout(8, 14);
    }
  }, [layoutData, screenData]);

  const initializeDefaultLayout = (rowCount, colCount) => {
    const generated = [];
    for (let r = 0; r < rowCount; r++) {
      const rowLabel = ROW_LETTERS[r];
      // Categories: top rows VIP/Platinum, middle GOLD, bottom SILVER
      let cat = 'SILVER';
      if (r < 2) cat = 'VIP';
      else if (r < 4) cat = 'PLATINUM';
      else if (r < 6) cat = 'GOLD';

      let seatNum = 1;
      for (let c = 0; c < colCount; c++) {
        // Leave columns 4 and colCount - 4 as walkway aisles
        const isAisle = c === 3 || c === colCount - 4;
        if (isAisle) {
          generated.push({
            rowLabel,
            columnNumber: 0,
            seatLabel: '',
            categoryCode: cat,
            type: 'EMPTY_SPACE',
            status: 'INACTIVE',
            gridRow: r,
            gridCol: c,
            isAvailable: false
          });
        } else {
          generated.push({
            rowLabel,
            columnNumber: seatNum,
            seatLabel: `${rowLabel}${seatNum}`,
            categoryCode: cat,
            type: cat === 'VIP' ? 'RECLINER' : 'NORMAL',
            status: 'ACTIVE',
            gridRow: r,
            gridCol: c,
            isAvailable: true
          });
          seatNum++;
        }
      }
    }
    setSeats(generated);
  };

  // Click handler for individual seat cell
  const handleSeatClick = (index) => {
    setSeats((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };

      if (activeTool === 'AISLE') {
        // Toggle between seat and aisle gap
        if (target.type === 'EMPTY_SPACE') {
          target.type = 'NORMAL';
          target.status = 'ACTIVE';
          target.isAvailable = true;
          target.seatLabel = `${target.rowLabel}${target.gridCol + 1}`;
        } else {
          target.type = 'EMPTY_SPACE';
          target.status = 'INACTIVE';
          target.isAvailable = false;
          target.seatLabel = '';
        }
      } else if (activeTool === 'CATEGORY') {
        if (target.type !== 'EMPTY_SPACE') {
          target.categoryCode = selectedCategory;
          target.type = selectedCategory === 'VIP' ? 'RECLINER' : 'NORMAL';
        }
      } else if (activeTool === 'STATUS') {
        if (target.type !== 'EMPTY_SPACE') {
          target.status = target.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
          target.isAvailable = target.status === 'ACTIVE';
        }
      }

      copy[index] = target;
      // Re-index seat numbering in the modified row so numbers are continuous
      return renumberRowSeats(copy, target.rowLabel);
    });
  };

  // Renumbers active seats in a row from 1 to N ignoring aisles
  const renumberRowSeats = (seatList, rowLabel) => {
    let count = 1;
    return seatList.map((s) => {
      if (s.rowLabel === rowLabel) {
        if (s.type !== 'EMPTY_SPACE') {
          return {
            ...s,
            columnNumber: count,
            seatLabel: `${rowLabel}${count++}`
          };
        }
      }
      return s;
    });
  };

  // Bulk Generator Execute
  const handleBulkGenerate = () => {
    const { rowCount, seatsPerRow, aisle1, aisle2 } = generatorForm;
    const totalCols = seatsPerRow + (aisle1 > 0 ? 1 : 0) + (aisle2 > 0 ? 1 : 0);
    const generated = [];

    for (let r = 0; r < rowCount; r++) {
      const rowLabel = ROW_LETTERS[r] || `R${r + 1}`;
      let cat = 'SILVER';
      if (r < Math.floor(rowCount * 0.25)) cat = 'VIP';
      else if (r < Math.floor(rowCount * 0.5)) cat = 'PLATINUM';
      else if (r < Math.floor(rowCount * 0.75)) cat = 'GOLD';

      let seatNum = 1;
      for (let c = 0; c < totalCols; c++) {
        const isAisle = (aisle1 > 0 && c === aisle1) || (aisle2 > 0 && c === aisle2 + 1);
        if (isAisle) {
          generated.push({
            rowLabel,
            columnNumber: 0,
            seatLabel: '',
            categoryCode: cat,
            type: 'EMPTY_SPACE',
            status: 'INACTIVE',
            gridRow: r,
            gridCol: c,
            isAvailable: false
          });
        } else {
          generated.push({
            rowLabel,
            columnNumber: seatNum,
            seatLabel: `${rowLabel}${seatNum}`,
            categoryCode: cat,
            type: cat === 'VIP' ? 'RECLINER' : 'NORMAL',
            status: 'ACTIVE',
            gridRow: r,
            gridCol: c,
            isAvailable: true
          });
          seatNum++;
        }
      }
    }

    setSeats(generated);
    setIsGeneratorOpen(false);
    setFeedback({ type: 'success', message: 'Procedural seating grid generated successfully.' });
  };

  // Layout Mutations
  const validateMutation = useMutation({
    mutationFn: () => {
      const activeSeatsOnly = seats.filter((s) => s.type !== 'EMPTY_SPACE');
      return seatLayoutsApi.validateLayout(screenId, {
        seats: activeSeatsOnly
      });
    },
    onSuccess: (res) => {
      setFeedback({
        type: 'success',
        message: res.message || 'Layout schema validated! All row paths and continuous seat numbering are compliant.'
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Layout validation failed. Please review aisle alignments.'
      });
    }
  });

  const saveDraftMutation = useMutation({
    mutationFn: () => {
      const activeSeatsOnly = seats.filter((s) => s.type !== 'EMPTY_SPACE');
      return seatLayoutsApi.saveLayoutDraft(screenId, {
        name: `${screenData?.name || 'Screen'} Draft Layout`,
        seats: activeSeatsOnly
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['screenLayout', screenId]);
      setFeedback({ type: 'success', message: 'Layout draft saved successfully to backend.' });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save layout draft.'
      });
    }
  });

  const publishMutation = useMutation({
    mutationFn: () => seatLayoutsApi.publishLayout(screenId),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['screenLayout', screenId]);
      queryClient.invalidateQueries(['screenDetail', screenId]);
      setFeedback({
        type: 'success',
        message: 'Layout published immutably! This version is now live for show scheduling.'
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to publish layout. Please ensure draft is validated.'
      });
    }
  });

  // Calculate distinct rows and columns for CSS grid layout
  const maxRow = seats.reduce((max, s) => Math.max(max, s.gridRow ?? 0), 0) + 1;
  const maxCol = seats.reduce((max, s) => Math.max(max, s.gridCol ?? 0), 0) + 1;
  const activeCount = seats.filter((s) => s.type !== 'EMPTY_SPACE' && s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-cinema-border">
        <div className="flex items-center gap-3">
          <Link
            to="/screens"
            className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Seating Layout Builder & Engine
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-partner-600/20 text-partner-400 border border-partner-500/30">
                {screenData?.name || 'Screen'} • v{screenData?.activeLayoutVersion || 1}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive 2D matrix designer with aisle spaces, continuous numbering, and immutable version publishing
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={Wand2}
            onClick={() => setIsGeneratorOpen(true)}
          >
            Bulk Generator
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={History}
            onClick={() => setIsVersionsOpen(true)}
          >
            Version Log
          </Button>

          <Button
            size="sm"
            variant="ghost"
            icon={CheckCircle}
            onClick={() => validateMutation.mutate()}
            isLoading={validateMutation.isPending}
          >
            Validate
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={Save}
            onClick={() => saveDraftMutation.mutate()}
            isLoading={saveDraftMutation.isPending}
          >
            Save Draft
          </Button>

          <Button
            size="sm"
            variant="secondary"
            icon={Send}
            onClick={() => publishMutation.mutate()}
            isLoading={publishMutation.isPending}
          >
            Publish Version
          </Button>
        </div>
      </div>

      {/* Alert / Feedback Notification */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor Tool Palette */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Tool Modes */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Tool Mode:</span>
          <button
            type="button"
            onClick={() => setActiveTool('CATEGORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === 'CATEGORY'
                ? 'bg-partner-600 text-white shadow-sm'
                : 'bg-cinema-dark text-slate-400 hover:text-white'
            }`}
          >
            Category Painter
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('AISLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === 'AISLE'
                ? 'bg-partner-600 text-white shadow-sm'
                : 'bg-cinema-dark text-slate-400 hover:text-white'
            }`}
          >
            Aisle / Walkway
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('STATUS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTool === 'STATUS'
                ? 'bg-partner-600 text-white shadow-sm'
                : 'bg-cinema-dark text-slate-400 hover:text-white'
            }`}
          >
            Maintenance Block
          </button>
        </div>

        {/* Right: Category Picker (Active if tool === 'CATEGORY') */}
        {activeTool === 'CATEGORY' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Brush Tier:</span>
            {Object.entries(CATEGORY_COLORS).map(([code, config]) => (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCategory(code)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  selectedCategory === code
                    ? 'border-white text-white font-bold scale-105'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${config.bg}`} />
                <span>{code}</span>
              </button>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-400 font-medium">
          Total Usable Seats: <span className="font-bold text-white">{activeCount}</span>
        </div>
      </div>

      {/* 2D Seating Canvas Area */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-8 overflow-x-auto shadow-inner flex flex-col items-center">
        {/* Curved Screen Banner at Top */}
        <div className="w-full max-w-2xl mb-12 flex flex-col items-center">
          <div className="w-full h-2.5 bg-gradient-to-r from-transparent via-partner-500 to-transparent rounded-full shadow-lg shadow-partner-500/30" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-2">
            AUDITORIUM SCREEN DIRECTION (EYES FRONT)
          </p>
        </div>

        {/* The Grid Matrix */}
        {layoutLoading ? (
          <LoadingSpinner text="Loading auditorium layout matrix..." />
        ) : (
          <div
            className="grid gap-2 select-none"
            style={{
              gridTemplateColumns: `repeat(${maxCol}, minmax(36px, 1fr))`
            }}
          >
            {seats.map((seat, idx) => {
              const isAisle = seat.type === 'EMPTY_SPACE';
              const isBlocked = seat.status === 'MAINTENANCE';
              const catColor = CATEGORY_COLORS[seat.categoryCode] || CATEGORY_COLORS.REGULAR;

              if (isAisle) {
                return (
                  <div
                    key={idx}
                    onClick={() => handleSeatClick(idx)}
                    className="w-9 h-9 rounded flex items-center justify-center border border-dashed border-cinema-border/40 hover:border-slate-500/80 cursor-pointer transition-colors group"
                    title={`Aisle Space (Row ${seat.rowLabel}, Col ${seat.gridCol + 1}) - Click to restore seat`}
                  >
                    <span className="text-[9px] text-slate-700 group-hover:text-slate-400">•</span>
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSeatClick(idx)}
                  className={`w-9 h-9 rounded-md flex flex-col items-center justify-center text-[10px] font-bold tracking-tighter border transition-all duration-150 transform hover:scale-110 active:scale-95 ${
                    isBlocked
                      ? 'bg-rose-950/40 border-rose-600/50 text-rose-400'
                      : `${catColor.bg} text-white ${catColor.border}`
                  }`}
                  title={`${seat.seatLabel} • ${seat.categoryCode} • ${seat.type}`}
                >
                  <span>{seat.seatLabel}</span>
                  {seat.type === 'RECLINER' && (
                    <span className="text-[7px] leading-none opacity-80">REC</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 pt-6 border-t border-cinema-border w-full flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          {Object.entries(CATEGORY_COLORS).map(([code, config]) => (
            <div key={code} className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded ${config.bg}`} />
              <span>{config.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-dashed border-slate-500 bg-transparent" />
            <span>Aisle Gap</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-rose-950 border border-rose-600" />
            <span>Maintenance Block</span>
          </div>
        </div>
      </div>

      {/* Bulk Generator Modal */}
      <Modal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        title="Procedural Seating Grid Generator"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Generate an entire auditorium layout quickly with automated aisle spacing and tier gradients.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Number of Rows (A-Z)
              </label>
              <input
                type="number"
                min="1"
                max="26"
                value={generatorForm.rowCount}
                onChange={(e) =>
                  setGeneratorForm({ ...generatorForm, rowCount: Number(e.target.value) })
                }
                className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Seats Per Row
              </label>
              <input
                type="number"
                min="4"
                max="30"
                value={generatorForm.seatsPerRow}
                onChange={(e) =>
                  setGeneratorForm({ ...generatorForm, seatsPerRow: Number(e.target.value) })
                }
                className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Left Aisle Placement
              </label>
              <input
                type="number"
                value={generatorForm.aisle1}
                onChange={(e) =>
                  setGeneratorForm({ ...generatorForm, aisle1: Number(e.target.value) })
                }
                className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3 py-2 text-sm text-white"
                placeholder="After seat # (e.g. 4)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Right Aisle Placement
              </label>
              <input
                type="number"
                value={generatorForm.aisle2}
                onChange={(e) =>
                  setGeneratorForm({ ...generatorForm, aisle2: Number(e.target.value) })
                }
                className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3 py-2 text-sm text-white"
                placeholder="After seat # (e.g. 12)"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-cinema-border flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsGeneratorOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleBulkGenerate}>
              Generate Layout
            </Button>
          </div>
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        title="Published Layout Versions"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Published layouts are immutable. Shows scheduled against a previous version will preserve their layout geometry.
          </p>

          {!versionsData || versionsData.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No previous versions archived.</p>
          ) : (
            <div className="divide-y divide-cinema-border">
              {versionsData.map((v) => (
                <div key={v._id || v.version} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">Version {v.version}</span>
                    <span className="text-slate-400 ml-2">({v.totalSeats || 0} seats)</span>
                    <p className="text-[11px] text-slate-500">{new Date(v.createdAt).toLocaleDateString()}</p>
                  </div>
                  {v.isPublished && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                      Published
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-cinema-border flex justify-end">
            <Button variant="ghost" onClick={() => setIsVersionsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default SeatLayoutBuilderPage;

