import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import MovieCard from '../../components/movie/MovieCard';
import EmptyState from '../../components/common/EmptyState';
import wishlistApi from '../../services/api/wishlist.api';

export function WishlistPage() {
  const [movies, setMovies] = useState(() => wishlistApi.getWishlist());
  const navigate = useNavigate();

  useEffect(() => {
    const handleUpdate = e => {
      setMovies(e.detail || []);
    };
    window.addEventListener('bms:wishlist:updated', handleUpdate);
    return () => window.removeEventListener('bms:wishlist:updated', handleUpdate);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border-b border-cinema-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-brand fill-brand" />
          <span>My Wishlist ({movies.length})</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Movies you are interested in watching when they hit cinemas
        </p>
      </div>

      {movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {movies.map(movie => (
            <MovieCard key={movie._id || movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Browse now showing and upcoming movies and tap the heart icon to save them for quick access."
          actionText="Explore Movies"
          onAction={() => navigate('/movies')}
        />
      )}
    </div>
  );
}

export default WishlistPage;

