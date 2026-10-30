import React, { useState, useEffect } from 'react';
import { Search, MapPin, Check } from 'lucide-react';
import Modal from '../common/Modal';
import { useCityStore } from '../../store/city.store';

export function CitySelectorModal({ isOpen, onClose }) {
  const { currentCity, availableCities, setCity, fetchCities, isLoadingCities } = useCityStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCities();
    }
  }, [isOpen, fetchCities]);

  const filteredCities = availableCities.filter(city =>
    city.name?.toLowerCase().includes(search.toLowerCase()) ||
    city.state?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCity = city => {
    setCity(city);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Your City"
      maxWidth="max-w-xl"
    >
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for your city..."
          className="w-full bg-cinema-card border border-cinema-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand transition-colors"
          autoFocus
        />
      </div>

      {/* Popular Cities */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Popular Cities
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          {availableCities.slice(0, 8).map(city => {
            const isSelected = currentCity?._id === city._id || currentCity?.name === city.name;
            return (
              <button
                key={city._id || city.name}
                onClick={() => handleSelectCity(city)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-brand/10 border-brand text-brand shadow-sm'
                    : 'bg-cinema-elevated/60 border-cinema-border text-slate-200 hover:border-slate-500 hover:bg-cinema-elevated'
                }`}
              >
                <span className="truncate">{city.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* All / Filtered Cities */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          {search ? `Matching Cities (${filteredCities.length})` : 'All Available Cities'}
        </p>
        {isLoadingCities ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading cinema cities...</div>
        ) : filteredCities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No cinema branches found matching "{search}".
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredCities.map(city => {
              const isSelected = currentCity?._id === city._id || currentCity?.name === city.name;
              return (
                <button
                  key={city._id || city.name}
                  onClick={() => handleSelectCity(city)}
                  className={`flex items-center gap-2 p-2 rounded-md text-xs text-left transition-colors ${
                    isSelected
                      ? 'text-brand font-semibold bg-brand/5'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{city.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CitySelectorModal;

