import React, { useState, useEffect } from 'react';
import api from '../api';
import { Megaphone, AlertTriangle, Radio, Award, RefreshCw, Calendar, Briefcase, Filter } from 'lucide-react';

export default function StudentNoticeBoard() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'URGENT' | 'NORMAL'

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/broadcasts/active');
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filtered = announcements.filter(a => {
    if (filter === 'URGENT') return a.priority === 'URGENT';
    if (filter === 'NORMAL') return a.priority === 'NORMAL';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Megaphone className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-gray-900 text-lg">Official Notice Board & Circulars</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Personalized circulars and urgent alerts issued by Central TPO and your Department Coordinator.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition ${
                filter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All ({announcements.length})
            </button>
            <button
              onClick={() => setFilter('URGENT')}
              className={`px-3 py-1 rounded-lg transition ${
                filter === 'URGENT' ? 'bg-red-50 text-red-700 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Urgent ({announcements.filter(a => a.priority === 'URGENT').length})
            </button>
          </div>
          <button
            onClick={fetchAnnouncements}
            className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition"
            title="Refresh Notice Board"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
            Loading official notices...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
            <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-700">No active circulars at this moment</p>
            <p className="text-xs text-gray-400 mt-1">
              New placement updates, interview slot revisions, and college notices will appear here.
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition-all shadow-xs ${
                item.priority === 'URGENT'
                  ? 'bg-red-50/50 border-red-200 ring-1 ring-red-100'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.priority === 'URGENT' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" /> URGENT FLASH
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      OFFICIAL NOTICE
                    </span>
                  )}
                  <h4 className="font-bold text-gray-900 text-base">{item.title}</h4>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap py-2">
                {item.message}
              </div>

              {/* Sender & Target Metadata Footer */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> Issued By: {item.sender_name} ({item.sender_role})
                </span>

                {item.target_departments && item.target_departments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                    Branch: {item.target_departments.join(', ')}
                  </span>
                )}

                {item.target_batch_year && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                    Batch: Class of {item.target_batch_year}
                  </span>
                )}

                {item.target_job_title && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Drive: {item.target_job_title}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
