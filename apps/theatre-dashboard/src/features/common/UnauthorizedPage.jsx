import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button';

export function UnauthorizedPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h1>
      <p className="text-sm text-slate-400 max-w-md">
        You do not have the required role privileges or permissions to view this administrative resource.
      </p>
      <Link to="/">
        <Button variant="outline">Return to Dashboard</Button>
      </Link>
    </div>
  );
}

export default UnauthorizedPage;

