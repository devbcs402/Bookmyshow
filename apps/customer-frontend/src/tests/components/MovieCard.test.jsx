import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MovieCard from '../../components/movie/MovieCard';

const mockMovie = {
  _id: 'movie-101',
  slug: 'interstellar-voyage',
  title: 'Interstellar Voyage',
  language: 'English',
  genres: ['Sci-Fi', 'Adventure'],
  censorRating: 'UA',
  posterUrl: 'https://example.com/poster.jpg'
};

describe('MovieCard Component', () => {
  it('renders movie title, censor rating, and genres correctly', () => {
    render(
      <BrowserRouter>
        <MovieCard movie={mockMovie} />
      </BrowserRouter>
    );

    expect(screen.getAllByText('Interstellar Voyage')[0]).toBeInTheDocument();
    expect(screen.getByText('UA')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi / Adventure')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('renders Book Tickets call to action', () => {
    render(
      <BrowserRouter>
        <MovieCard movie={mockMovie} />
      </BrowserRouter>
    );

    expect(screen.getByText('Book Tickets')).toBeInTheDocument();
  });

  it('handles wishlist button click', () => {
    render(
      <BrowserRouter>
        <MovieCard movie={mockMovie} />
      </BrowserRouter>
    );

    const wishlistBtn = screen.getByTitle(/Add to wishlist|Remove from wishlist/i);
    expect(wishlistBtn).toBeInTheDocument();
    fireEvent.click(wishlistBtn);
  });
});
