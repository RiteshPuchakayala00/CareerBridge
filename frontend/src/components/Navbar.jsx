import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Shield, Award, Briefcase, GraduationCap } from 'lucide-react';
import NotificationBell from './NotificationBell';
import FlashAnnouncementBanner from './FlashAnnouncementBanner';

export default function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || '';
  const fullName = localStorage.getItem('user_name') || 'User';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_name');
    navigate('/login');
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'TPO_ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
            <Shield className="w-3.5 h-3.5" /> Central TPO Admin
          </span>
        );
      case 'DEPT_COORDINATOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <Award className="w-3.5 h-3.5" /> Dept Coordinator
          </span>
        );
      case 'RECRUITER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
            <Briefcase className="w-3.5 h-3.5" /> Corporate Recruiter
          </span>
        );
      case 'STUDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
            <GraduationCap className="w-3.5 h-3.5" /> Student
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="sticky top-0 z-40">
      {/* High-Visibility Sticky Urgent Flash Announcement Banner */}
      <FlashAnnouncementBanner />

      <header className="bg-white border-b border-gray-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  CB
                </div>
                <div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">CareerBridge</span>
                  <span className="hidden sm:inline-block ml-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campus Recruitment
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {getRoleBadge()}

              {/* In-App Notification Hub Bell */}
              <NotificationBell />

              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-gray-900 leading-tight">{fullName}</span>
                <span className="text-xs text-gray-500">Authenticated</span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
