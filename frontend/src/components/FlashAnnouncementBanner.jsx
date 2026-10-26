import React, { useState, useEffect } from 'react';
import api from '../api';
import { AlertTriangle, Megaphone, X, ChevronRight, Clock, Shield, Award } from 'lucide-react';

export default function FlashAnnouncementBanner() {
  const [activeUrgent, setActiveUrgent] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchActiveBroadcasts = async () => {
    try {
      const res = await api.get('/broadcasts/active');
      const urgentOnly = (res.data || []).filter(b => b.priority === 'URGENT');
      
      // Filter out dismissed announcements
      const dismissedRaw = sessionStorage.getItem('dismissed_urgent_broadcasts');
      const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      const visible = urgentOnly.filter(b => !dismissedIds.includes(b.id));

      setActiveUrgent(visible);
    } catch (err) {
      // User might be unauthorized or route not available
    }
  };

  useEffect(() => {
    fetchActiveBroadcasts();
    const interval = setInterval(fetchActiveBroadcasts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id) => {
    const dismissedRaw = sessionStorage.getItem('dismissed_urgent_broadcasts');
    const dismissedIds = dismissedRaw ? JSON.parse(dismissedRaw) : [];
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      sessionStorage.setItem('dismissed_urgent_broadcasts', JSON.stringify(dismissedIds));
    }
    setActiveUrgent(prev => prev.filter(b => b.id !== id));
  };

  if (!activeUrgent || activeUrgent.length === 0) {
    return null;
  }

  const currentBanner = activeUrgent[currentIndex % activeUrgent.length];

  return (
    <>
      {/* Sticky High-Priority Flash Ribbon */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 shadow-md relative z-30 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[11px] uppercase tracking-wider backdrop-blur-xs flex-shrink-0 animate-pulse">
              <Megaphone className="w-3.5 h-3.5" /> URGENT FLASH
            </span>
            <p className="font-semibold truncate">
              <span className="font-bold underline mr-1.5">{currentBanner.title}:</span>
              {currentBanner.message}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {activeUrgent.length > 1 && (
              <span className="text-[11px] text-white/80 font-medium hidden md:inline">
                ({(currentIndex % activeUrgent.length) + 1}/{activeUrgent.length})
              </span>
            )}
            <button
              onClick={() => setSelectedAnnouncement(currentBanner)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              Details <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleDismiss(currentBanner.id)}
              className="p-1 hover:bg-white/20 rounded-md transition text-white/90 hover:text-white cursor-pointer"
              title="Acknowledge and dismiss flash announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Reading Full Circular */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 uppercase tracking-wider">
                    Official Flash Notice
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedAnnouncement.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-100 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedAnnouncement.message}
              </div>

              {/* Circular Target & Sender Metadata */}
              <div className="bg-gray-50 p-3.5 rounded-xl text-xs space-y-1.5 text-gray-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-500">Issued By:</span>
                  <span className="font-bold text-gray-800">
                    {selectedAnnouncement.sender_name} ({selectedAnnouncement.sender_role})
                  </span>
                </div>
                {selectedAnnouncement.target_departments && selectedAnnouncement.target_departments.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-500">Departments:</span>
                    <span className="font-medium text-gray-800">
                      {selectedAnnouncement.target_departments.join(', ')}
                    </span>
                  </div>
                )}
                {selectedAnnouncement.target_batch_year && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-500">Batch Year:</span>
                    <span className="font-medium text-gray-800">
                      Class of {selectedAnnouncement.target_batch_year}
                    </span>
                  </div>
                )}
                {selectedAnnouncement.target_placement_status && selectedAnnouncement.target_placement_status !== 'ALL' && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-500">Cohort Filter:</span>
                    <span className="font-medium text-gray-800">
                      {selectedAnnouncement.target_placement_status}
                    </span>
                  </div>
                )}
                {selectedAnnouncement.target_job_title && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-500">Target Drive:</span>
                    <span className="font-medium text-gray-800">
                      {selectedAnnouncement.target_job_title}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  handleDismiss(selectedAnnouncement.id);
                  setSelectedAnnouncement(null);
                }}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
