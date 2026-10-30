import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Film, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import discoveryApi from '../../services/api/discovery.api';

export function SearchAutocompleteDropdown({ className }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isCancelled = false;

    const fetchSuggestions = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await discoveryApi.getSearchSuggestions(debouncedQuery);
        if (!isCancelled) {
          // Backend returns suggestions in data
          const items = Array.isArray(res?.data) ? res.data : [];
          setResults(items);
        }
      } catch (_err) {
        if (!isCancelled) setResults([]);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchSuggestions();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMovie = movie => {
    setIsOpen(false);
    setQuery('');
    const targetSlug = movie.slug || movie._id;
    navigate(`/movies/${targetSlug}`);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for Movies, Events, Plays..."
          className="w-full bg-cinema-darkest border border-cinema-border rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-cinema-card border border-cinema-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-xs text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand" />
              Searching movies catalog...
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-cinema-border">
                Movies
              </div>
              {results.map(movie => (
                <div
                  key={movie._id || movie.slug}
                  onClick={() => handleSelectMovie(movie)}
                  className="flex items-center gap-3 p-2.5 hover:bg-slate-800/80 cursor-pointer transition-colors border-b border-cinema-border/40 last:border-0"
                >
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-9 h-12 object-cover rounded bg-slate-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-12 rounded bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {movie.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {[movie.language, movie.genre, movie.releaseYear]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching movies found for "{query}".
              <div className="mt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                  className="text-brand hover:underline font-medium"
                >
                  View full search results
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchAutocompleteDropdown;

