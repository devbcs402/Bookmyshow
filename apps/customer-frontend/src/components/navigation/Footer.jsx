import React from 'react';
import { Link } from 'react-router-dom';
import { Film, ShieldCheck, CreditCard, Lock, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-cinema-darkest border-t border-cinema-border/80 text-slate-400 text-xs mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white shadow-cinema-glow">
                <Film className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Book<span className="text-brand">My</span>Show
              </span>
            </Link>
            <p className="text-slate-400 leading-relaxed text-xs">
              Next-generation cinema ticketing with atomic seat reservations, real-time availability sync, and secure digital passes.
            </p>
          </div>

          {/* Col 2: Movies */}
          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-xs mb-3">
              Movies in Theatres
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/movies?status=NOW_SHOWING" className="hover:text-white transition-colors">
                  Now Showing
                </Link>
              </li>
              <li>
                <Link to="/movies?status=UPCOMING" className="hover:text-white transition-colors">
                  Upcoming Releases
                </Link>
              </li>
              <li>
                <Link to="/movies" className="hover:text-white transition-colors">
                  Explore by Genre
                </Link>
              </li>
              <li>
                <Link to="/theatres" className="hover:text-white transition-colors">
                  Cinemas Near You
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-xs mb-3">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/my-bookings" className="hover:text-white transition-colors">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition-colors">
                  Profile & Settings
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="hover:text-white transition-colors">
                  Notification Center
                </Link>
              </li>
              <li>
                <span className="text-slate-500">24x7 Ticket Helpline</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Security Badges */}
          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-xs mb-3">
              Trust & Security
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>256-Bit Cryptographic QR Tickets</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>Distributed Redis Atomic Seat Locking</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>PCI-DSS Verified Razorpay Checkout</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-cinema-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            &copy; {new Date().getFullYear()} BookMyShow Platform. Enterprise Cinema Architecture. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            Built with <Heart className="w-3 h-3 text-brand fill-brand" /> for movie enthusiasts
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

