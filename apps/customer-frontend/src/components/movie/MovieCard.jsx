import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Heart, Star, Calendar } from 'lucide-react';
import Badge from '../common/Badge';
import { formatDate } from '../../utils/formatters';
import wishlistApi from '../../services/api/wishlist.api';

export function MovieCard({ movie, className }) {
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = React.useState(() =>
    wishlistApi.isInWishlist(movie._id || movie.id)
  );

  const targetSlug = movie.slug || movie._id;
  const posterUrl = movie.posterUrl || movie.poster || '';
  const title = movie.title || 'Untitled Movie';
  const language = Array.isArray(movie.languages)
    ? movie.languages.join(', ')
    : movie.language || 'Hindi';
  const genre = Array.isArray(movie.genres)
    ? movie.genres.slice(0, 2).join(' / ')
    : movie.genre || 'Action';
  const censor = movie.censorRating || 'UA';

  const handleWishlistToggle = e => {
    e.preventDefault();
    e.stopPropagation();
    wishlistApi.toggleWishlist(movie);
    setIsWishlisted(!isWishlisted);
  };

  return (
    <div
      onClick={() => navigate(`/movies/${targetSlug}`)}
      className={`group cursor-pointer flex flex-col w-full text-left transition-transform duration-200 hover:-translate-y-1 ${className || ''}`}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-cinema-card border border-cinema-border/80 shadow-md">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback when image fails */}
        <div
          style={{ display: posterUrl ? 'none' : 'flex' }}
          className="w-full h-full bg-slate-800 flex-col items-center justify-center text-slate-500 p-4 text-center"
        >
          <Film className="w-10 h-10 mb-2 text-slate-600" />
          <span className="text-xs text-slate-400 font-medium line-clamp-2">
            {title}
          </span>
        </div>

        {/* Censor Rating Pill */}
        <div className="absolute top-2.5 left-2.5">
          <Badge variant="default" size="sm" className="bg-black/70 backdrop-blur-sm border-white/20 text-white font-bold">
            {censor}
          </Badge>
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:text-brand transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${
              isWishlisted ? 'fill-brand text-brand' : 'text-white'
            }`}
          />
        </button>

        {/* Hover Action Bar */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="w-full py-2 bg-brand text-white text-xs font-semibold rounded-lg text-center shadow-cinema-glow">
            Book Tickets
          </span>
        </div>
      </div>

      {/* Info Container */}
      <div className="pt-2.5 px-0.5 space-y-1">
        <h3 className="font-semibold text-sm text-slate-100 group-hover:text-brand transition-colors line-clamp-1">
          {title}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-1">
          {genre}
        </p>
        <p className="text-[11px] text-slate-500 font-medium">
          {language}
        </p>
      </div>
    </div>
  );
}

export default MovieCard;

