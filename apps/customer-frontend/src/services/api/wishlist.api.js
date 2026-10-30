import { STORAGE_KEYS } from '../../constants';

export const wishlistApi = {
  getWishlist() {
    try {
      const data = localStorage.getItem('bms_wishlist');
      return data ? JSON.parse(data) : [];
    } catch (_e) {
      return [];
    }
  },

  isInWishlist(movieId) {
    const list = this.getWishlist();
    return list.some(item => item._id === movieId || item.id === movieId);
  },

  toggleWishlist(movie) {
    let list = this.getWishlist();
    const id = movie._id || movie.id;
    const exists = list.some(item => item._id === id || item.id === id);

    if (exists) {
      list = list.filter(item => item._id !== id && item.id !== id);
    } else {
      list.unshift({
        _id: id,
        title: movie.title,
        posterUrl: movie.posterUrl || movie.poster || '',
        releaseDate: movie.releaseDate,
        genres: movie.genres || [],
        languages: movie.languages || []
      });
    }

    localStorage.setItem('bms_wishlist', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('bms:wishlist:updated', { detail: list }));
    return list;
  }
};

export default wishlistApi;

