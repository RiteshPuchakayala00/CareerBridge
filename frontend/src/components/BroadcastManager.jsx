import React, { useState, useEffect } from 'react';
import api from '../api';
import { formatDateTime } from '../utils/date';
import {
  Radio, Megaphone, Send, Shield, Award, Users, AlertTriangle,
  Clock, CheckCircle2, AlertCircle, Filter, Calendar, Briefcase, RefreshCw
} from 'lucide-react';

export default function BroadcastManager({ role, boundDepartment }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'NORMAL', // 'NORMAL' | 'URGENT'
    target_batch_year: '',
    target_departments: role === 'DEPT_COORDINATOR' && boundDepartment ? [boundDepartment] : [],
    target_placement_status: 'ALL', // 'ALL' | 'UNPLACED_ONLY' | 'PLACED_ONLY'
    target_job_id: '',
    expires_at: ''
  });

  const availableDepartments = ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT', 'EE'];

  const showNotification = (msg, isErr = false) => {
    if (isErr) setError(msg);
    else setMessage(msg);
    setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 5000);
  };

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/broadcasts');
      setBroadcasts(res.data || []);
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to load broadcasts', true);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrives = async () => {
    try {
      const res = await api.get('/jobs');
      setDrives(res.data || []);
    } catch (err) {
      console.error('Failed to load drives for targeting:', err);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
    fetchDrives();
  }, []);

  const handleDeptToggle = (dept) => {
    if (role === 'DEPT_COORDINATOR') return; // Strictly bound
    setFormData(prev => {
      const exists = prev.target_departments.includes(dept);
      if (exists) {
        return { ...prev, target_departments: prev.target_departments.filter(d => d !== dept) };
      } else {
        return { ...prev, target_departments: [...prev.target_departments, dept] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      showNotification('Title and message are required', true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        target_batch_year: formData.target_batch_year ? parseInt(formData.target_batch_year) : null,
        target_departments: role === 'DEPT_COORDINATOR'
          ? [boundDepartment]
          : (formData.target_departments.length > 0 ? formData.target_departments : null),
        target_placement_status: formData.target_placement_status,
        target_job_id: formData.target_job_id ? parseInt(formData.target_job_id) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
      };

      await api.post('/broadcasts', payload);
      showNotification(
        formData.priority === 'URGENT'
          ? 'Urgent flash announcement published and fanned out to targeted students.'
          : 'Targeted broadcast published and delivered to student bell hubs.'
      );

      // Reset form
      setFormData({
        title: '',
        message: '',
        priority: 'NORMAL',
        target_batch_year: '',
        target_departments: role === 'DEPT_COORDINATOR' && boundDepartment ? [boundDepartment] : [],
        target_placement_status: 'ALL',
        target_job_id: '',
        expires_at: ''
      });

      fetchBroadcasts();
    } catch (err) {
      showNotification(err.response?.data?.detail || 'Failed to dispatch broadcast', true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Grid: Form on left, Broadcast history on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Broadcast Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">New Targeted Circular</h3>
              <p className="text-xs text-gray-500">In-App Notification & Flash Hub</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Priority Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Announcement Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: 'NORMAL' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.priority === 'NORMAL'
                      ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" /> Normal Circular
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: 'URGENT' }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.priority === 'URGENT'
                      ? 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-100 animate-pulse'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Urgent Flash
                </button>
              </div>
              {formData.priority === 'URGENT' && (
                <p className="text-[11px] text-red-600 font-medium mt-1.5">
                  ⚡ Will display as a sticky, high-visibility banner across targeted students' dashboards.
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TCS Technical Interview Venue Relocation"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Notice Content / Instructions *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Detailed circular copy, guidelines, or venue changes..."
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Audience Targeting Section */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                <Filter className="w-3.5 h-3.5 text-indigo-600" /> Audience Targeting Filters (§4.A)
              </div>

              {/* Department Targeting */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Target Departments
                </label>
                {role === 'DEPT_COORDINATOR' ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Bound Department:
                    </span>
                    <span className="font-bold px-2 py-0.5 bg-white text-emerald-700 rounded-md border border-emerald-200">
                      {boundDepartment}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {availableDepartments.map(dept => {
                      const selected = formData.target_departments.includes(dept);
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => handleDeptToggle(dept)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                            selected
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {dept}
                        </button>
                      );
                    })}
                  </div>
                )}
                {role === 'TPO_ADMIN' && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Leave unselected to broadcast across all college departments.
                  </p>
                )}
              </div>

              {/* Batch Year & Placement Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Graduation Batch
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2026 (All if blank)"
                    value={formData.target_batch_year}
                    onChange={e => setFormData({ ...formData, target_batch_year: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Placement Status
                  </label>
                  <select
                    value={formData.target_placement_status}
                    onChange={e => setFormData({ ...formData, target_placement_status: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="ALL">All Cohort</option>
                    <option value="UNPLACED_ONLY">Unplaced Only</option>
                    <option value="PLACED_ONLY">Placed Only</option>
                  </select>
                </div>
              </div>

              {/* Drive Applicants Filtering */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Target Specific Drive Applicants
                </label>
                <select
                  value={formData.target_job_id}
                  onChange={e => setFormData({ ...formData, target_job_id: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">None (Broadcast to cohort)</option>
                  {drives.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.company_name} — {d.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Expiry Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Expiry Timestamp (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2.5 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                formData.priority === 'URGENT'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Publishing...' : 'Dispatch Broadcast'}
            </button>
          </form>
        </div>

        {/* Broadcast History & Circular Registry */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 sm:px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Broadcast Announcements & Circulars</h3>
              <p className="text-xs text-gray-500">Live registry of staff dispatches & active flash banners</p>
            </div>
            <button
              onClick={fetchBroadcasts}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition"
              title="Refresh circulars"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading broadcasts...</div>
            ) : broadcasts.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Radio className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-700">No announcements issued yet</p>
                <p className="text-xs text-gray-400 mt-1">Compose circulars using the form on the left.</p>
              </div>
            ) : (
              broadcasts.map(b => (
                <div
                  key={b.id}
                  className={`p-4 rounded-xl border transition ${
                    b.priority === 'URGENT'
                      ? 'bg-red-50/40 border-red-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {b.priority === 'URGENT' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> URGENT FLASH
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                          CIRCULAR
                        </span>
                      )}
                      <h4 className="font-bold text-gray-900 text-sm">{b.title}</h4>
                    </div>

                    <span className="text-[11px] text-gray-400 whitespace-nowrap">
                      {formatDateTime(b.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                    {b.message}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                      <Award className="w-3 h-3 text-indigo-500" /> {b.sender_name} ({b.sender_role})
                    </span>

                    {b.target_departments && b.target_departments.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                        Dept: {b.target_departments.join(', ')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                        All Departments
                      </span>
                    )}

                    {b.target_batch_year && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                        Batch: {b.target_batch_year}
                      </span>
                    )}

                    {b.target_placement_status !== 'ALL' && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        {b.target_placement_status}
                      </span>
                    )}

                    {b.target_job_title && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {b.target_job_title}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
