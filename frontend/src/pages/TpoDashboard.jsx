import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';
import { formatDateTime } from '../utils/date';
import {
  Users, Award, Calendar, UploadCloud, Briefcase, Mail, CheckCircle2,
  AlertCircle, ShieldCheck, UserX, UserCheck, TrendingUp, DollarSign,
  Search, Filter, ExternalLink, RefreshCw, FileText, Edit2, Check, X,
  ToggleLeft, ToggleRight, Megaphone, Copy, Link2, AlertTriangle,
  ArrowRight, Clock, Building2, XCircle
} from 'lucide-react';
import BroadcastManager from '../components/BroadcastManager';

export default function TpoDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Appoint Coordinator Form State
  const [coordForm, setCoordForm] = useState({ full_name: '', email: '', department: 'CSE' });

  // Recruiter Invite Form State
  const [inviteForm, setInviteForm] = useState({ company_name: '', email: '' });
  const [newInviteLink, setNewInviteLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // CSV Upload State
  const [csvFile, setCsvFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  // Student Filters
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  // Job Governance & Date Filter States
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'APPROVED', 'REJECTED'
  const [jobSearch, setJobSearch] = useState('');
  const [jobDateFilter, setJobDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'
  const [jobStartDate, setJobStartDate] = useState('');
  const [jobEndDate, setJobEndDate] = useState('');
  const [jobSortOrder, setJobSortOrder] = useState('NEWEST'); // 'NEWEST', 'OLDEST'

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/tpo/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCoordinators = async () => {
    try {
      const res = await api.get('/tpo/coordinators');
      setCoordinators(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/tpo/batch-eligibility');
      setBatches(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const params = {};
      if (selectedDept) params.department = selectedDept;
      const res = await api.get('/tpo/students', { params });
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/tpo/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/tpo/invitations');
      setInvitations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchCoordinators();
    fetchBatches();
    fetchStudents();
    fetchJobs();
    fetchInvitations();
  }, [selectedDept]);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Appoint Coordinator
  const handleAppointCoordinator = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tpo/coordinators', coordForm);
      showNotification(`Coordinator appointed for ${coordForm.department} branch.`);
      setCoordForm({ full_name: '', email: '', department: 'CSE' });
      fetchCoordinators();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to appoint coordinator", true);
    } finally {
      setLoading(false);
    }
  };

  // Decommission Coordinator
  const handleDecommissionCoordinator = async (id, name) => {
    if (!window.confirm(`Decommission coordinator ${name}?`)) return;
    try {
      await api.delete(`/tpo/coordinators/${id}`);
      showNotification(`Coordinator ${name} decommissioned.`);
      fetchCoordinators();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Action failed", true);
    }
  };

  // Update Batch Granular Controls (Spec §4 & §5.B.1)
  const handleUpdateBatch = async (batch, key, value) => {
    try {
      const payload = {
        graduation_year: batch.graduation_year,
        is_active: key === 'is_active' ? value : batch.is_active,
        label: key === 'label' ? value : batch.label,
        allow_internships: key === 'allow_internships' ? value : batch.allow_internships,
        allow_full_time: key === 'allow_full_time' ? value : batch.allow_full_time
      };
      await api.patch(`/tpo/batches/${batch.graduation_year}/toggle`, payload);
      showNotification(`Batch ${batch.graduation_year} ${key} updated.`);
      fetchBatches();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Update failed", true);
    }
  };

  // Toggle Batch Master Eligibility
  const handleToggleBatch = async (batch) => {
    await handleUpdateBatch(batch, 'is_active', !batch.is_active);
  };

  // Add new batch year
  const handleAddBatchYear = async (e) => {
    e.preventDefault();
    const yearInput = prompt("Enter graduation year to add (e.g., 2029):");
    if (!yearInput || isNaN(yearInput)) return;
    const labelInput = prompt("Enter descriptive label (e.g., '1st Year Pre-Placement'):", `Batch of ${yearInput}`);
    try {
      await api.post('/tpo/batch-eligibility', {
        graduation_year: parseInt(yearInput),
        label: labelInput || `Batch of ${yearInput}`,
        is_active: true,
        allow_internships: false,
        allow_full_time: true
      });
      showNotification(`Batch ${yearInput} added and enabled.`);
      fetchBatches();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to add batch", true);
    }
  };

  // Upload CSV Roster
  const handleRosterUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('file', csvFile);
    setLoading(true);
    try {
      const res = await api.post('/tpo/upload-roster', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(res.data);
      showNotification(res.data.message);
      fetchStudents();
      fetchAnalytics();
      setCsvFile(null);
    } catch (err) {
      showNotification(err.response?.data?.detail || "Roster upload failed", true);
    } finally {
      setLoading(false);
    }
  };

  // Invite Recruiter
  const handleInviteRecruiter = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/tpo/invite-recruiter', inviteForm);
      showNotification(res.data.message);
      if (res.data?.token) {
        const fullLink = `${window.location.origin}/activate?token=${res.data.token}`;
        setNewInviteLink({
          company: inviteForm.company_name,
          email: inviteForm.email,
          url: fullLink
        });
      }
      setInviteForm({ company_name: '', email: '' });
      fetchInvitations();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Invitation failed", true);
    } finally {
      setLoading(false);
    }
  };

  // Job Governance
  const handleJobAction = async (jobId, action) => {
    try {
      if (action === 'reject') {
        const reason = window.prompt("Reason for rejecting/unpublishing this campus recruitment drive:", "Does not meet university requirements");
        if (reason === null) return;
        await api.put(`/tpo/jobs/${jobId}/reject?reason=${encodeURIComponent(reason)}`);
        showNotification("Drive rejected and feedback delivered to recruiter.");
      } else {
        await api.put(`/tpo/jobs/${jobId}/approve`);
        showNotification("✓ Drive approved and published live for eligible students!");
      }
      fetchJobs();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Action failed", true);
    }
  };

  const pendingJobsCount = jobs.filter(j => !j.is_approved && j.status !== 'REJECTED').length;
  const approvedJobsCount = jobs.filter(j => j.is_approved).length;
  const rejectedJobsCount = jobs.filter(j => j.status === 'REJECTED').length;

  const filteredJobs = jobs.filter(j => {
    // Status filter
    if (jobStatusFilter === 'PENDING') {
      if (j.is_approved || j.status === 'REJECTED') return false;
    } else if (jobStatusFilter === 'APPROVED') {
      if (!j.is_approved) return false;
    } else if (jobStatusFilter === 'REJECTED') {
      if (j.status !== 'REJECTED') return false;
    }

    // Search query
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      const matchTitle = j.title?.toLowerCase().includes(q);
      const matchCompany = j.company_name?.toLowerCase().includes(q);
      const matchLoc = j.location?.toLowerCase().includes(q);
      const matchBatch = j.target_batch_year ? String(j.target_batch_year).includes(q) : false;
      const matchDept = j.eligible_departments?.some(d => d.toLowerCase().includes(q));
      if (!matchTitle && !matchCompany && !matchLoc && !matchBatch && !matchDept) return false;
    }

    // Date filter
    const dateToCheck = j.created_at || j.drive_date;
    if (jobDateFilter !== 'ALL' && dateToCheck) {
      const d = new Date(dateToCheck);
      const now = new Date();
      if (jobDateFilter === 'TODAY') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (d < startOfToday) return false;
      } else if (jobDateFilter === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (d < weekAgo) return false;
      } else if (jobDateFilter === 'MONTH') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (d < monthAgo) return false;
      } else if (jobDateFilter === 'CUSTOM') {
        if (jobStartDate && d < new Date(jobStartDate)) return false;
        if (jobEndDate) {
          const end = new Date(jobEndDate);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
      }
    }

    return true;
  }).sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return jobSortOrder === 'OLDEST' ? da - db : db - da;
  });

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.roll_number?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold text-gray-900">Central TPO Governance Portal</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Manage college-wide placements, department SPOCs, recruiter access, and accreditation reports.
            </p>
          </div>
          <button
            onClick={() => {
              fetchAnalytics();
              fetchCoordinators();
              fetchBatches();
              fetchStudents();
              fetchJobs();
              fetchInvitations();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </button>
        </div>

        {/* Global Notifications */}
        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Flash Notification: Pending Campus Drive Approvals */}
        {pendingJobsCount > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs flex-shrink-0 animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25">
                    Action Required
                  </span>
                  <h4 className="font-bold text-sm sm:text-base">
                    {pendingJobsCount} Campus Drive {pendingJobsCount === 1 ? 'Approval' : 'Approvals'} Pending Review
                  </h4>
                </div>
                <p className="text-xs text-white/90 mt-0.5">
                  Recruiters/coordinators have submitted new placement drives awaiting your TPO review & publication.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('jobs');
                setJobStatusFilter('PENDING');
              }}
              className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              Review & Approve Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-1 sm:space-x-4 bg-white px-4 py-2 rounded-xl shadow-xs">
          {[
            { id: 'analytics', label: 'Accreditation & Analytics', icon: TrendingUp },
            { id: 'coordinators', label: 'Faculty Coordinators', icon: Users },
            { id: 'batches', label: 'Batch Eligibility', icon: Calendar },
            { id: 'roster', label: 'Master Student Roster', icon: UploadCloud },
            { id: 'jobs', label: 'Drives & Approvals', icon: Briefcase, badge: pendingJobsCount },
            { id: 'recruiters', label: 'Recruiter Onboarding', icon: Mail },
            { id: 'broadcasts', label: 'Broadcasts & Circulars', icon: Megaphone }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-3.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${isActive
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${
                    isActive ? 'bg-white text-purple-700' : 'bg-rose-600 text-white animate-pulse'
                  }`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* TAB 1: ACCREDITATION & ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Enrolled</span>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics?.total_students ?? 0}</p>
                <span className="text-xs text-gray-500 mt-1 block">College-wide registered candidates</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Placement Rate</span>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">{analytics?.placement_percentage ?? 0}%</p>
                <span className="text-xs text-gray-500 mt-1 block">{analytics?.placed_students ?? 0} students placed</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Average Package</span>
                <p className="text-3xl font-extrabold text-blue-600 mt-2">{analytics?.average_ctc ? `${analytics.average_ctc} LPA` : 'N/A'}</p>
                <span className="text-xs text-gray-500 mt-1 block">Accreditation average</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Highest Package</span>
                <p className="text-3xl font-extrabold text-purple-600 mt-2">{analytics?.highest_ctc ? `${analytics.highest_ctc} LPA` : 'N/A'}</p>
                <span className="text-xs text-gray-500 mt-1 block">Peak institutional offer</span>
              </div>
            </div>

            {/* Department Breakdown Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-base">Branch-Wise Placement Breakdown (NIRF / NAAC)</h3>
                <span className="text-xs text-gray-500">Auto-calculated from official offer records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Department</th>
                      <th className="px-6 py-3 text-left font-semibold">Enrolled</th>
                      <th className="px-6 py-3 text-left font-semibold">Placed</th>
                      <th className="px-6 py-3 text-left font-semibold">Placement Rate</th>
                      <th className="px-6 py-3 text-left font-semibold">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {analytics?.department_wise && Object.entries(analytics.department_wise).map(([dept, stat]) => (
                      <tr key={dept} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-semibold text-gray-900">{dept}</td>
                        <td className="px-6 py-4 text-gray-600">{stat.total}</td>
                        <td className="px-6 py-4 text-emerald-600 font-medium">{stat.placed}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{stat.percentage}%</td>
                        <td className="px-6 py-4 w-48">
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div
                              className="bg-emerald-500 h-2.5 rounded-full"
                              style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!analytics?.department_wise || Object.keys(analytics.department_wise).length === 0) && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500">No departmental records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FACULTY COORDINATORS */}
        {activeTab === 'coordinators' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appoint Coordinator Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs h-fit">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Appoint Dept Coordinator</h3>
              <p className="text-xs text-gray-500 mb-4">
                Bind a senior faculty member to their academic department. They will authenticate via institutional Google SSO.
              </p>
              <form onSubmit={handleAppointCoordinator} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Prof. K. Sharma"
                    value={coordForm.full_name}
                    onChange={(e) => setCoordForm({ ...coordForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Official Faculty Email</label>
                  <input
                    type="email"
                    required
                    placeholder="sharma.cse@college.edu"
                    value={coordForm.email}
                    onChange={(e) => setCoordForm({ ...coordForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Academic Department</label>
                  <select
                    value={coordForm.department}
                    onChange={(e) => setCoordForm({ ...coordForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="CSE">Computer Science & Engineering (CSE)</option>
                    <option value="ECE">Electronics & Communication (ECE)</option>
                    <option value="MECH">Mechanical Engineering (MECH)</option>
                    <option value="CIVIL">Civil Engineering (CIVIL)</option>
                    <option value="IT">Information Technology (IT)</option>
                    <option value="EE">Electrical Engineering (EE)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-sm transition shadow-xs"
                >
                  {loading ? 'Appointing...' : 'Authorize Coordinator'}
                </button>
              </form>
            </div>

            {/* List Coordinators Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-base">Active Department SPOCs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Faculty Name</th>
                      <th className="px-6 py-3 text-left font-semibold">Email</th>
                      <th className="px-6 py-3 text-left font-semibold">Bound Dept</th>
                      <th className="px-6 py-3 text-left font-semibold">Status</th>
                      <th className="px-6 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {coordinators.map(coord => (
                      <tr key={coord.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-semibold text-gray-900">{coord.full_name}</td>
                        <td className="px-6 py-4 text-gray-600">{coord.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {coord.department}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {coord.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <UserCheck className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <UserX className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {coord.is_active && (
                            <button
                              onClick={() => handleDecommissionCoordinator(coord.id, coord.full_name)}
                              className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 px-2.5 py-1 rounded border border-red-200 transition"
                            >
                              Decommission
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {coordinators.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500">No department coordinators appointed yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BATCH ELIGIBILITY */}
        {activeTab === 'batches' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Dynamic Batch Eligibility Gatekeeper</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Control portal access by graduation year (e.g., enable 2026 for Full-Time, enable 2027 for Internships, block 1st/2nd years).
                </p>
              </div>
              <button
                onClick={handleAddBatchYear}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
              >
                + Add Batch Year
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {batches.map(batch => (
                <div
                  key={batch.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${batch.is_active
                    ? 'bg-purple-50/40 border-purple-200 shadow-xs'
                    : 'bg-gray-50 border-gray-200 opacity-80'
                    }`}
                >
                  <div>
                    {/* Header: Year & Status */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Graduation Batch</span>
                        <h4 className="text-2xl font-black text-gray-950">{batch.graduation_year}</h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${batch.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}>
                        {batch.is_active ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserX className="w-3.5 h-3.5" />}
                        {batch.is_active ? 'Active' : 'Locked'}
                      </span>
                    </div>

                    {/* Batch Label & Edit */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium truncate" title={batch.label}>
                          {batch.label || `Batch of ${batch.graduation_year}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newLabel = prompt("Edit label for batch " + batch.graduation_year + ":", batch.label || "");
                            if (newLabel !== null) handleUpdateBatch(batch, 'label', newLabel.trim());
                          }}
                          className="text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-100 transition"
                          title="Rename label"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Granular Drive Controls (Spec §4 & §5.B.1) */}
                    <div className="space-y-2.5 p-3 bg-white rounded-xl border border-gray-200/80 mb-4">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Allowed Drive Types</span>

                      {/* Full-Time Toggle */}
                      <label className="flex items-center justify-between cursor-pointer text-xs">
                        <span className="text-gray-700 font-semibold">Full-Time Drives</span>
                        <input
                          type="checkbox"
                          checked={batch.allow_full_time ?? true}
                          disabled={!batch.is_active}
                          onChange={(e) => handleUpdateBatch(batch, 'allow_full_time', e.target.checked)}
                          className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 transition"
                        />
                      </label>

                      {/* Summer Internships Toggle */}
                      <label className="flex items-center justify-between cursor-pointer text-xs">
                        <span className="text-gray-700 font-semibold">Summer Internships</span>
                        <input
                          type="checkbox"
                          checked={batch.allow_internships ?? false}
                          disabled={!batch.is_active}
                          onChange={(e) => handleUpdateBatch(batch, 'allow_internships', e.target.checked)}
                          className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 transition"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Master Login Button */}
                  <button
                    onClick={() => handleToggleBatch(batch)}
                    className={`w-full py-2.5 text-xs font-bold rounded-xl border transition shadow-2xs ${batch.is_active
                      ? 'border-red-200 text-red-600 bg-white hover:bg-red-50'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                  >
                    {batch.is_active ? 'Restrict Batch Login' : 'Authorize Batch Login'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MASTER ROSTER */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            {/* Upload Box */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Upload Student Master CSV Roster</h3>
              <p className="text-xs text-gray-500 mb-4">
                Required columns: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">roll_no, full_name, email, department, graduation_year, cgpa, active_backlogs</code>
              </p>

              <form onSubmit={handleRosterUpload} className="flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-gray-200 rounded-lg p-1"
                />
                <button
                  type="submit"
                  disabled={!csvFile || loading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition whitespace-nowrap shadow-xs"
                >
                  {loading ? 'Uploading Roster...' : 'Upload & Sync'}
                </button>
              </form>

              {uploadResult && (
                <div className="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200 text-sm">
                  <p className="font-semibold text-purple-900">{uploadResult.message}</p>
                  {uploadResult.errors?.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      <p className="font-semibold">Skipped / Issues:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        {uploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Students Table with Search & Filter */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search name, roll no, email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">All Departments</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Roll No</th>
                      <th className="px-6 py-3 text-left font-semibold">Full Name</th>
                      <th className="px-6 py-3 text-left font-semibold">Email</th>
                      <th className="px-6 py-3 text-left font-semibold">Branch</th>
                      <th className="px-6 py-3 text-left font-semibold">CGPA</th>
                      <th className="px-6 py-3 text-left font-semibold">Year</th>
                      <th className="px-6 py-3 text-left font-semibold">Backlogs</th>
                      <th className="px-6 py-3 text-left font-semibold">Placement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-mono font-medium text-gray-900">{student.roll_number}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{student.full_name}</td>
                        <td className="px-6 py-4 text-gray-600">{student.email}</td>
                        <td className="px-6 py-4 font-medium">{student.department}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{student.cgpa ?? 'N/A'}</td>
                        <td className="px-6 py-4 text-gray-600">{student.graduation_year}</td>
                        <td className="px-6 py-4 text-gray-600">{student.active_backlogs}</td>
                        <td className="px-6 py-4">
                          {student.is_placed ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              Placed ✓
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Unplaced
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-gray-500">No student records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DRIVES & APPROVALS GOVERNANCE */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {/* Status Tabs and Metrics Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'ALL', label: 'All Drives', count: jobs.length, color: 'text-gray-700 bg-gray-100' },
                  { id: 'PENDING', label: 'Pending Review', count: pendingJobsCount, color: 'text-amber-800 bg-amber-100 ring-1 ring-amber-300' },
                  { id: 'APPROVED', label: 'Approved & Live', count: approvedJobsCount, color: 'text-emerald-800 bg-emerald-100' },
                  { id: 'REJECTED', label: 'Rejected', count: rejectedJobsCount, color: 'text-rose-800 bg-rose-100' }
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setJobStatusFilter(st.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      jobStatusFilter === st.id
                        ? 'bg-purple-600 text-white shadow-xs'
                        : `${st.color} hover:opacity-90`
                    }`}
                  >
                    <span>{st.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      jobStatusFilter === st.id ? 'bg-white/30 text-white' : 'bg-black/10 text-gray-800'
                    }`}>
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span>Showing <strong className="text-gray-800">{filteredJobs.length}</strong> of {jobs.length} drives</span>
              </div>
            </div>

            {/* Filter and Date Search Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Search Input */}
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search drive title, company, location, batch year..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  {jobSearch && (
                    <button 
                      onClick={() => setJobSearch('')} 
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Filter Dropdown */}
                <div className="md:col-span-4 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={jobDateFilter}
                    onChange={(e) => setJobDateFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                  >
                    <option value="ALL">All Submission Dates</option>
                    <option value="TODAY">Submitted Today</option>
                    <option value="WEEK">Past 7 Days</option>
                    <option value="MONTH">Past 30 Days</option>
                    <option value="CUSTOM">Custom Date Range...</option>
                  </select>
                </div>

                {/* Sort Order Dropdown */}
                <div className="md:col-span-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={jobSortOrder}
                    onChange={(e) => setJobSortOrder(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                  >
                    <option value="NEWEST">Newest Submitted First</option>
                    <option value="OLDEST">Oldest Submitted First</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Range Picker when selected */}
              {jobDateFilter === 'CUSTOM' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
                  <span className="font-semibold text-gray-600">From:</span>
                  <input
                    type="date"
                    value={jobStartDate}
                    onChange={(e) => setJobStartDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="font-semibold text-gray-600">To:</span>
                  <input
                    type="date"
                    value={jobEndDate}
                    onChange={(e) => setJobEndDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {(jobStartDate || jobEndDate) && (
                    <button
                      onClick={() => { setJobStartDate(''); setJobEndDate(''); }}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold cursor-pointer"
                    >
                      Reset Range
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Drives Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider">Job Title & Company</th>
                      <th className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider">Package / CTC</th>
                      <th className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider">Eligibility</th>
                      <th className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider">Submitted & Drive Date</th>
                      <th className="px-5 py-3 text-left font-bold text-xs uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-right font-bold text-xs uppercase tracking-wider">Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredJobs.map(job => {
                      const isPending = !job.is_approved && job.status !== 'REJECTED';
                      const isApproved = job.is_approved;
                      const isRejected = job.status === 'REJECTED';

                      return (
                        <tr key={job.id} className={`transition ${isPending ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-gray-50/70'}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 bg-purple-50 text-purple-700 rounded-xl mt-0.5">
                                <Briefcase className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 leading-snug">{job.title}</p>
                                <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 mt-0.5">
                                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                  {job.company_name || 'Internal Campus Proposal'}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                  <span className="inline-block text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                    🎓 {job.target_batch_year ? `Class of ${job.target_batch_year}` : 'All Batches'}
                                  </span>
                                  <span className="inline-block text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                    {job.job_type}
                                  </span>
                                  {job.location && (
                                    <span className="text-[10px] text-gray-500">
                                      📍 {job.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-extrabold text-sm text-blue-600 block">
                              {job.ctc_lpa ? `${job.ctc_lpa} LPA` : (job.stipend_monthly ? `₹${job.stipend_monthly}/mo` : 'Unspecified')}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">
                              {job.applicant_count || 0} applicant(s)
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-xs font-semibold text-gray-800">
                              Min CGPA: <span className="font-bold">{job.eligibility_cgpa ?? 'None'}</span>
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs" title={job.eligible_departments?.join(', ') || 'All Branches'}>
                              Branches: {job.eligible_departments?.join(', ') || 'All Branches'}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <div className="space-y-1">
                              <p className="text-gray-700 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span>Submitted: {job.created_at ? formatDateTime(job.created_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                              </p>
                              <p className="text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span>Drive: {job.drive_date ? formatDateTime(job.drive_date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</span>
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-amber-700" /> Pending Review
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Live
                              </span>
                            )}
                            {isRejected && (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                                </span>
                                {job.rejection_reason && (
                                  <p className="text-[10px] text-rose-700 mt-1 max-w-[160px] truncate" title={job.rejection_reason}>
                                    {job.rejection_reason}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleJobAction(job.id, 'approve')}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Approve & Publish
                                  </button>
                                  <button
                                    onClick={() => handleJobAction(job.id, 'reject')}
                                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </>
                              )}

                              {isApproved && (
                                <button
                                  onClick={() => handleJobAction(job.id, 'reject')}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-700 border border-gray-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                  title="Unpublish this drive from student portal"
                                >
                                  Unpublish Drive
                                </button>
                              )}

                              {isRejected && (
                                <button
                                  onClick={() => handleJobAction(job.id, 'approve')}
                                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition cursor-pointer"
                                >
                                  Re-Approve Drive
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredJobs.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-gray-500">
                          <Briefcase className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                          <p className="font-semibold text-gray-700">No recruitment drives matching filter criteria.</p>
                          <p className="text-xs text-gray-400 mt-1">Try resetting the status or date range filter.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: RECRUITER ONBOARDING */}
        {activeTab === 'recruiters' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invite Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs h-fit">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Invite Corporate Recruiter</h3>
              <p className="text-xs text-gray-500 mb-4">
                Enter the corporate HR or hiring manager's email address (any email address allowed).
              </p>
              <form onSubmit={handleInviteRecruiter} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google India"
                    value={inviteForm.company_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">HR Corporate Email</label>
                  <input
                    type="email"
                    required
                    placeholder="recruiter@google.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg text-sm transition shadow-xs"
                >
                  {loading ? 'Dispatching Invite...' : 'Send Recruiter Invitation'}
                </button>
              </form>

              {newInviteLink && (
                <div className="mt-4 p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900">🔗 Activation Link Ready</span>
                    <button
                      onClick={() => setNewInviteLink(null)}
                      className="text-xs text-purple-400 hover:text-purple-600"
                    >
                      Dismiss
                    </button>
                  </div>
                  <p className="text-xs text-purple-700">
                    Send this onboarding URL to <strong>{newInviteLink.email}</strong> to activate their account:
                  </p>
                  <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-purple-200 text-xs font-mono text-purple-900 break-all select-all">
                    <span className="truncate flex-1">{newInviteLink.url}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(newInviteLink.url);
                        showNotification("Activation link copied to clipboard!");
                      }}
                      className="p-1 text-purple-600 hover:text-purple-900 shrink-0"
                      title="Copy Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Invitations History Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-base">Corporate Invitations & Tokens</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Company</th>
                      <th className="px-6 py-3 text-left font-semibold">HR Email</th>
                      <th className="px-6 py-3 text-left font-semibold">Status</th>
                      <th className="px-6 py-3 text-left font-semibold">Invited On</th>
                      <th className="px-6 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {invitations.map(inv => {
                      const fullLink = inv.token ? `${window.location.origin}/activate?token=${inv.token}` : null;
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 font-bold text-gray-900">{inv.company_name}</td>
                          <td className="px-6 py-4 text-gray-600 font-mono text-xs">{inv.email}</td>
                          <td className="px-6 py-4">
                            {inv.is_used ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                Activated ✓
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                Invite Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {inv.created_at ? formatDateTime(inv.created_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!inv.is_used && fullLink ? (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(fullLink);
                                  setCopiedId(inv.id);
                                  showNotification(`Activation link for ${inv.company_name} copied!`);
                                  setTimeout(() => setCopiedId(null), 2500);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-md transition"
                              >
                                {copiedId === inv.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Claimed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {invitations.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500">No invitations dispatched yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: BROADCASTS & CIRCULARS (Spec: docs/notification_and_broadcast_spec.md) */}
        {activeTab === 'broadcasts' && (
          <BroadcastManager role="TPO_ADMIN" boundDepartment={null} />
        )}
      </main>
    </div>
  );
}
