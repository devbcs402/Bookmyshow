import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home } from 'lucide-react';
import Button from './Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand mb-2">
        <Film className="w-8 h-8" />
      </div>
      <h1 className="text-4xl sm:text-6xl font-extrabold text-white">404</h1>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-200">
        Lost in Cinema Space?
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
        The screening room or page you are trying to reach does not exist or has ended.
      </p>
      <div className="pt-2">
        <Link to="/">
          <Button variant="primary" size="md" leftIcon={Home}>
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;

