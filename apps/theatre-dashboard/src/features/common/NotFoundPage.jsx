import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import Button from '../../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-4 rounded-full bg-cinema-card border border-cinema-border text-slate-400">
        <HelpCircle className="w-12 h-12" />
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-md">
        The dashboard view you requested does not exist or has been relocated.
      </p>
      <Link to="/">
        <Button variant="secondary">Return to Overview</Button>
      </Link>
    </div>
  );
}

export default NotFoundPage;

