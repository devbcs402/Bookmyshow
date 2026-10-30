import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Home } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <HelpCircle className="h-10 w-10" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
        404 - Console Route Not Found
      </h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The platform resource or administration view you requested does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary">
            <Home className="h-4 w-4 mr-2" />
            Back to Platform Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}

