import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, ArrowLeft, Send, CheckCircle, AlertCircle, Film, Tv, Clock } from 'lucide-react';
import { pricingApi } from '../../services/api/pricing.api';
import { showsApi } from '../../services/api/shows.api';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DEFAULT_CATEGORIES = [
  { code: 'VIP', label: 'VIP / Luxury Recliner', defaultPrice: 500 },
  { code: 'PLATINUM', label: 'Platinum Prime Balcony', defaultPrice: 350 },
  { code: 'GOLD', label: 'Gold Sweet Spot', defaultPrice: 240 },
  { code: 'SILVER', label: 'Silver Regular', defaultPrice: 160 }
];

export function ShowPricingPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [priceTiers, setPriceTiers] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // 1. Fetch Show Details
  const { data: show, isLoading: showLoading } = useQuery({
    queryKey: ['showDetail', showId],
    queryFn: () => showsApi.getShowById(showId)
  });

  // 2. Fetch Existing Show Pricing
  const { data: existingPricing, isLoading: pricingLoading } = useQuery({
    queryKey: ['showPricing', showId],
    queryFn: () => pricingApi.getShowPricing(showId),
    retry: false
  });

  useEffect(() => {
    // Populate form with existing pricing if already configured
    if (existingPricing && Array.isArray(existingPricing.pricing)) {
      const mapped = {};
      existingPricing.pricing.forEach((p) => {
        mapped[p.categoryCode] = p.basePrice;
      });
      setPriceTiers(mapped);
    } else {
      // Default initial prices
      const initial = {};
      DEFAULT_CATEGORIES.forEach((c) => {
        initial[c.code] = c.defaultPrice;
      });
      setPriceTiers(initial);
    }
  }, [existingPricing]);

  const handlePriceChange = (code, val) => {
    setPriceTiers((prev) => ({
      ...prev,
      [code]: Math.max(0, Number(val) || 0)
    }));
  };

  const savePricingMutation = useMutation({
    mutationFn: () => {
      const payload = {
        pricing: Object.entries(priceTiers).map(([categoryCode, basePrice]) => ({
          categoryCode,
          basePrice
        }))
      };
      return pricingApi.setShowPricing(showId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['showPricing', showId]);
      queryClient.invalidateQueries(['partnerShows']);
      setFeedback({ type: 'success', message: 'Show seat tier pricing configured successfully.' });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save show pricing.'
      });
    }
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      // First save pricing, then publish show
      const payload = {
        pricing: Object.entries(priceTiers).map(([categoryCode, basePrice]) => ({
          categoryCode,
          basePrice
        }))
      };
      await pricingApi.setShowPricing(showId, payload);
      return showsApi.publishShow(showId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['partnerShows']);
      navigate('/shows');
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to publish show.'
      });
    }
  });

  if (showLoading || pricingLoading) {
    return <LoadingSpinner text="Retrieving show tier pricing..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-cinema-border">
        <Link
          to="/shows"
          className="p-2 rounded-lg bg-cinema-card border border-cinema-border text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Show Seat Category Pricing</h1>
          <p className="text-xs text-slate-400">
            Configure dynamic seat prices per seating tier for this screening
          </p>
        </div>
      </div>

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
          <button onClick={() => setFeedback({ type: '', message: '' })}>✕</button>
        </div>
      )}

      {/* Show Overview Card */}
      {show && (
        <div className="bg-cinema-card border border-cinema-border rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="space-y-1">
            <h3 className="font-bold text-white text-sm">
              {show.movieTitle || show.movieId?.title || 'Screening'}
            </h3>
            <p className="text-slate-400">
              {show.screenName || show.screenId?.name || 'Screen 1'} • {show.format || '2D'}
            </p>
          </div>
          <div className="text-right text-slate-300">
            <p className="font-semibold">{formatDate(show.startTime)}</p>
            <p className="text-slate-400">{formatTime(show.startTime)}</p>
          </div>
        </div>
      )}

      {/* Pricing Matrix Form */}
      <div className="bg-cinema-card border border-cinema-border rounded-xl p-6 space-y-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Base Seat Pricing (Inclusive of Taxes & Amenities)
        </h3>

        <div className="divide-y divide-cinema-border">
          {DEFAULT_CATEGORIES.map((cat) => {
            const currentPrice = priceTiers[cat.code] ?? cat.defaultPrice;

            return (
              <div key={cat.code} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{cat.code}</span>
                    <span className="text-xs text-slate-400">({cat.label})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Base price per customer ticket</p>
                </div>

                <div className="flex items-center gap-2 w-36">
                  <span className="text-slate-400 text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    value={currentPrice}
                    onChange={(e) => handlePriceChange(cat.code, e.target.value)}
                    className="w-full bg-cinema-dark border border-cinema-border rounded-lg px-3 py-1.5 text-sm font-bold text-white text-right focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-cinema-border flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => savePricingMutation.mutate()}
            isLoading={savePricingMutation.isPending}
          >
            Save Pricing Only
          </Button>

          <Button
            variant="secondary"
            icon={Send}
            onClick={() => publishMutation.mutate()}
            isLoading={publishMutation.isPending}
          >
            Save & Publish Show Live
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ShowPricingPage;

