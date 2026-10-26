import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api';
import { 
  Award, Users, Radar, Briefcase, Mail, CheckCircle2, AlertCircle, 
  Search, Filter, ExternalLink, RefreshCw, Send, FileText, CheckCheck,
  MapPin, Calendar, Clock, Video, Laptop, Settings, Link2,
  MessageSquare, MessageCircle, HelpCircle, Pin, CheckCircle, ChevronRight, User, Plus, Megaphone
} from 'lucide-react';
import BroadcastManager from '../components/BroadcastManager';

export default function CoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Round logistics management for department drives (Spec §3.C & §6)
  const [selectedDriveForRounds, setSelectedDriveForRounds] = useState(null);
  const [driveRounds, setDriveRounds] = useState([]);
  const [showRoundsModal, setShowRoundsModal] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [roundForm, setRoundForm] = useState({
    venue: '',
    description: '',
    start_time: '',
    end_time: '',
    meeting_url: '',
    test_url: '',
    access_code: ''
  });

  // Filter states
  const [radarActive, setRadarActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Propose Drive form state
  const [driveForm, setDriveForm] = useState({
    title: '',
    job_type: 'Full-time',
    ctc_lpa: '',
    stipend_monthly: '',
    eligibility_cgpa: '7.0',
    max_backlogs: '0',
    drive_date: '',
    deadline: '',
    description: '',
    eligible_departments: ['CSE']
  });

  // Invite Recruiter form state
  const [inviteForm, setInviteForm] = useState({ company_name: '', email: '' });

  // Messaging & Doubt Desk State (Spec: docs/messaging_and_inquiry_system_spec.md)
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadDetail, setThreadDetail] = useState(null);
  const [threadFilter, setThreadFilter] = useState('ALL'); // ALL, STUDENT_COORDINATOR, COORDINATOR_RECRUITER, OPEN, RESOLVED
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinForm, setPinForm] = useState({ question: '', answer: '' });
  const [newLogisticsModalOpen, setNewLogisticsModalOpen] = useState(false);
  const [logisticsForm, setLogisticsForm] = useState({ job_id: '', subject: '', message: '' });

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/coordinator/students');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/coordinator/analytics');
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDrives = async () => {
    try {
      const res = await api.get('/coordinator/drives');
      setDrives(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchThreads = async () => {
    try {
      const res = await api.get('/messages/threads');
      setThreads(res.data);
      if (res.data.length > 0 && !selectedThreadId) {
        setSelectedThreadId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching message threads:", err);
    }
  };

  const fetchThreadDetail = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/messages/threads/${id}`);
      setThreadDetail(res.data);
    } catch (err) {
      console.error("Error fetching thread detail:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAnalytics();
    fetchDrives();
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activeTab === 'doubts') {
      fetchThreads();
      const interval = setInterval(fetchThreads, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadDetail(selectedThreadId);
    }
  }, [selectedThreadId]);

  const [replyError, setReplyError] = useState(null);

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const threadId = selectedThreadId || threadDetail?.id;
    if (!replyText.trim() || !threadId) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      await api.post(`/messages/threads/${threadId}/messages`, { content: replyText.trim() });
      setReplyText('');
      await fetchThreadDetail(threadId);
      await fetchThreads();
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || "Failed to send message";
      setReplyError(errMsg);
      showNotification(errMsg, true);
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleStatus = async (statusToSet) => {
    if (!selectedThreadId) return;
    try {
      await api.patch(`/messages/threads/${selectedThreadId}/status`, { status: statusToSet });
      showNotification(`Thread marked as ${statusToSet}`);
      await fetchThreadDetail(selectedThreadId);
      await fetchThreads();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to update status", true);
    }
  };

  const handleOpenPinModal = () => {
    if (!threadDetail) return;
    const lastStaff = threadDetail.messages?.filter(m => m.sender_role === 'DEPT_COORDINATOR' || m.sender_role === 'TPO_ADMIN').slice(-1)[0];
    setPinForm({
      question: threadDetail.subject || '',
      answer: lastStaff ? lastStaff.content : (threadDetail.messages?.slice(-1)[0]?.content || '')
    });
    setPinModalOpen(true);
  };

  const handlePublishPinFaq = async (e) => {
    e.preventDefault();
    if (!selectedThreadId) return;
    setLoading(true);
    try {
      await api.post(`/messages/threads/${selectedThreadId}/pin-faq`, {
        faq_question: pinForm.question,
        faq_answer: pinForm.answer
      });
      showNotification("✓ Successfully pinned to Drive FAQ! Broadcast live to all candidates.");
      setPinModalOpen(false);
      await fetchThreadDetail(selectedThreadId);
      await fetchThreads();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to pin FAQ", true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLane2Thread = async (e) => {
    e.preventDefault();
    if (!logisticsForm.job_id || !logisticsForm.subject || !logisticsForm.message) {
      showNotification("Please fill all required fields", true);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/messages/threads', {
        job_id: parseInt(logisticsForm.job_id),
        thread_type: 'COORDINATOR_RECRUITER',
        subject: logisticsForm.subject,
        initial_message: logisticsForm.message
      });
      showNotification("✓ Drive logistics chat initiated with Recruiter!");
      setNewLogisticsModalOpen(false);
      setLogisticsForm({ job_id: '', subject: '', message: '' });
      await fetchThreads();
      setSelectedThreadId(res.data.id);
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to start logistics chat", true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRounds = async (drive) => {
    setSelectedDriveForRounds(drive);
    setLoading(true);
    try {
      const res = await api.get(`/jobs/${drive.id}/rounds`);
      setDriveRounds(res.data);
      setShowRoundsModal(true);
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to load rounds", true);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRoundLogistics = (rnd) => {
    setEditingRound(rnd);
    setRoundForm({
      venue: rnd.venue || '',
      description: rnd.description || '',
      start_time: rnd.start_time ? rnd.start_time.slice(0, 16) : '',
      end_time: rnd.end_time ? rnd.end_time.slice(0, 16) : '',
      meeting_url: rnd.meeting_url || '',
      test_url: rnd.test_url || '',
      access_code: rnd.access_code || ''
    });
  };

  const handleSaveRoundLogistics = async (e) => {
    e.preventDefault();
    if (!editingRound || !selectedDriveForRounds) return;
    setLoading(true);
    try {
      await api.patch(`/jobs/${selectedDriveForRounds.id}/rounds/${editingRound.id}/logistics`, {
        venue: roundForm.venue || null,
        description: roundForm.description || null,
        start_time: roundForm.start_time ? new Date(roundForm.start_time).toISOString() : null,
        end_time: roundForm.end_time ? new Date(roundForm.end_time).toISOString() : null,
        meeting_url: roundForm.meeting_url || null,
        test_url: roundForm.test_url || null,
        access_code: roundForm.access_code || null
      });
      showNotification(`Logistics and on-campus venue updated for Round ${editingRound.round_number}.`);
      setEditingRound(null);
      const res = await api.get(`/jobs/${selectedDriveForRounds.id}/rounds`);
      setDriveRounds(res.data);
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to update round logistics", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Propose Drive
  const handleProposeDrive = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: driveForm.title,
        job_type: driveForm.job_type,
        ctc_lpa: driveForm.ctc_lpa ? parseFloat(driveForm.ctc_lpa) : null,
        stipend_monthly: driveForm.stipend_monthly ? parseFloat(driveForm.stipend_monthly) : null,
        eligibility_cgpa: driveForm.eligibility_cgpa ? parseFloat(driveForm.eligibility_cgpa) : 0,
        max_backlogs: driveForm.max_backlogs ? parseInt(driveForm.max_backlogs) : 0,
        drive_date: driveForm.drive_date ? new Date(driveForm.drive_date).toISOString() : null,
        deadline: driveForm.deadline ? new Date(driveForm.deadline).toISOString() : null,
        description: driveForm.description,
        eligible_departments: driveForm.eligible_departments
      };

      const res = await api.post('/coordinator/drives', payload);
      showNotification(res.data.message);
      setDriveForm({
        title: '',
        job_type: 'Full-time',
        ctc_lpa: '',
        stipend_monthly: '',
        eligibility_cgpa: '7.0',
        max_backlogs: '0',
        drive_date: '',
        deadline: '',
        description: '',
        eligible_departments: ['CSE']
      });
      fetchDrives();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to propose drive", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Invite Recruiter
  const handleInviteRecruiter = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/coordinator/invite-recruiter', inviteForm);
      showNotification(res.data.message);
      setInviteForm({ company_name: '', email: '' });
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to invite recruiter", true);
    } finally {
      setLoading(false);
    }
  };

  // Filter students with Branch Isolation & Unplaced Radar
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Unplaced Student Radar: Unplaced with CGPA >= 7.0
    if (radarActive) {
      return !student.is_placed && (student.cgpa || 0) >= 7.0;
    }

    if (statusFilter === 'PLACED') return !!student.is_placed;
    if (statusFilter === 'UNPLACED') return !student.is_placed;

    return true;
  });

  const boundDepartment = students[0]?.department || 'Your';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title with Department Badge & Strict Isolation Banner */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Award className="w-6 h-6" />
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{boundDepartment} Department SPOC Portal</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Strict Branch Isolation Active: You have authoritative oversight exclusively for the <span className="font-semibold text-emerald-700">{boundDepartment}</span> department.
            </p>
          </div>
          <button 
            onClick={() => {
              fetchStudents();
              fetchAnalytics();
              fetchDrives();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Roster
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

        {/* Department Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{boundDepartment} Enrolled</span>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics?.total_students ?? 0}</p>
            <span className="text-xs text-gray-500 mt-1 block">Active candidates in discipline</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Branch Placement Rate</span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{analytics?.placement_percentage ?? 0}%</p>
            <span className="text-xs text-gray-500 mt-1 block">{analytics?.placed_students ?? 0} placed / {analytics?.total_students ?? 0} total</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Discipline Avg CTC</span>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">{analytics?.average_ctc ? `${analytics.average_ctc} LPA` : 'N/A'}</p>
            <span className="text-xs text-gray-500 mt-1 block">NBA review baseline</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Highest Branch Offer</span>
            <p className="text-3xl font-extrabold text-purple-600 mt-2">{analytics?.highest_ctc ? `${analytics.highest_ctc} LPA` : 'N/A'}</p>
            <span className="text-xs text-gray-500 mt-1 block">Top offer in department</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-1 sm:space-x-4 bg-white px-4 py-2 rounded-xl shadow-xs">
          {[
            { id: 'students', label: 'Department Student Supervision', icon: Users },
            { id: 'drives', label: 'Propose Campus Drive', icon: Briefcase },
            { id: 'recruiters', label: 'Invite Recruiters', icon: Mail },
            { 
              id: 'doubts', 
              label: 'Doubt Desk & Logistics', 
              icon: MessageSquare,
              badge: threads.filter(t => t.status === 'OPEN').length 
            },
            {
              id: 'broadcasts',
              label: 'Circulars & Flash Notices',
              icon: Megaphone
            }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-3.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                    isActive ? 'bg-white text-emerald-700' : 'bg-red-500 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: DEPARTMENT STUDENT SUPERVISION & RADAR */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-0">
            {/* Control Bar: Radar Toggle & Filters */}
            <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRadarActive(!radarActive)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    radarActive 
                      ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Radar className="w-4 h-4" />
                  {radarActive ? '⚡ Unplaced Radar: ACTIVE (CGPA ≥ 7.0)' : 'Activate Unplaced Radar (CGPA ≥ 7.0)'}
                </button>
                {radarActive && (
                  <span className="text-xs font-medium text-red-600">
                    Showing high-potential students with 0 placement offers
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, roll no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none w-48 sm:w-64"
                  />
                </div>
                {!radarActive && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="ALL">All Status</option>
                    <option value="UNPLACED">Unplaced Only</option>
                    <option value="PLACED">Placed Only</option>
                  </select>
                )}
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Roll Number</th>
                    <th className="px-6 py-3 text-left font-semibold">Student Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Institutional Email</th>
                    <th className="px-6 py-3 text-left font-semibold">CGPA</th>
                    <th className="px-6 py-3 text-left font-semibold">Grad Class</th>
                    <th className="px-6 py-3 text-left font-semibold">Backlogs</th>
                    <th className="px-6 py-3 text-left font-semibold">Resume PDF</th>
                    <th className="px-6 py-3 text-left font-semibold">Placement State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-mono font-medium text-gray-900">{student.roll_number}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{student.full_name}</td>
                      <td className="px-6 py-4 text-gray-600">{student.email}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{student.cgpa ?? 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-600">{student.graduation_year}</td>
                      <td className="px-6 py-4 text-gray-600">{student.active_backlogs}</td>
                      <td className="px-6 py-4">
                        {student.resume_url ? (
                          <a 
                            href={`http://localhost:8000${student.resume_url}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" /> View PDF
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Not Uploaded</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {student.is_placed ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Placed ✓
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Seeking Placement
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500">
                        {radarActive 
                          ? 'No unplaced students found with CGPA ≥ 7.0 in this branch.' 
                          : 'No student records match the criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PROPOSE CAMPUS DRIVE */}
        {activeTab === 'drives' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Propose Drive Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs h-fit">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Propose Discipline Drive</h3>
              <p className="text-xs text-gray-500 mb-4">
                Propose a new placement/internship drive tailored to {boundDepartment}. Submitted to TPO for final publication.
              </p>
              <form onSubmit={handleProposeDrive} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Drive / Role Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Associate Systems Engineer"
                    value={driveForm.title}
                    onChange={(e) => setDriveForm({ ...driveForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Job Type</label>
                    <select
                      value={driveForm.job_type}
                      onChange={(e) => setDriveForm({ ...driveForm, job_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">CTC (LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 10.5"
                      value={driveForm.ctc_lpa}
                      onChange={(e) => setDriveForm({ ...driveForm, ctc_lpa: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Min CGPA</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 7.5"
                      value={driveForm.eligibility_cgpa}
                      onChange={(e) => setDriveForm({ ...driveForm, eligibility_cgpa: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Max Backlogs</label>
                    <input
                      type="number"
                      value={driveForm.max_backlogs}
                      onChange={(e) => setDriveForm({ ...driveForm, max_backlogs: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Drive Date</label>
                  <input
                    type="date"
                    value={driveForm.drive_date}
                    onChange={(e) => setDriveForm({ ...driveForm, drive_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description & Requirements</label>
                  <textarea
                    rows="3"
                    placeholder="Details about responsibilities, rounds, tech stack..."
                    value={driveForm.description}
                    onChange={(e) => setDriveForm({ ...driveForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition shadow-xs"
                >
                  {loading ? 'Submitting Proposal...' : 'Propose Drive to TPO'}
                </button>
              </form>
            </div>

            {/* Department Active / Proposed Drives List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-base">Campus Drives for {boundDepartment}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {drives.map(drive => (
                  <div key={drive.id} className="p-5 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{drive.title}</h4>
                        {drive.is_approved ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Approved & Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            Pending TPO Approval
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Company: <span className="font-semibold text-gray-700">{drive.company_name || 'Coordinator Proposal'}</span> • 
                        Package: <span className="font-semibold text-blue-600">{drive.ctc_lpa ? `${drive.ctc_lpa} LPA` : 'Stipend'}</span>
                      </p>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="text-right text-xs text-gray-500">
                        Drive Date: <span className="font-semibold text-gray-700">{drive.drive_date ? new Date(drive.drive_date).toLocaleDateString() : 'TBD'}</span>
                      </div>
                      <button
                        onClick={() => handleOpenRounds(drive)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Manage Venues & Rounds
                      </button>
                    </div>
                  </div>
                ))}
                {drives.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No active or proposed drives for this branch. Propose one using the form.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVITE RECRUITERS */}
        {activeTab === 'recruiters' && (
          <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Company Outreach: Invite Corporate Recruiter</h3>
            <p className="text-xs text-gray-500 mb-4">
              Invite company HR directly to hire from {boundDepartment}. Automated anti-abuse blocks public domains (@gmail, @yahoo).
            </p>
            <form onSubmit={handleInviteRecruiter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cisco Systems"
                  value={inviteForm.company_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">HR Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="hr@cisco.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition shadow-xs"
              >
                {loading ? 'Sending Invitation...' : 'Send Outreach Invitation'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: DOUBT DESK & DRIVE LOGISTICS (Spec §2 & §3) */}
        {activeTab === 'doubts' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Contextual Doubt Desk & Logistics</h3>
                  <p className="text-xs text-gray-500">
                    Lane 1: Student Doubts (Relay) • Lane 2: Recruiter Drive Logistics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewLogisticsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" /> + Contact Recruiter (Lane 2)
                </button>
                <button
                  onClick={fetchThreads}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                  title="Refresh Threads"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Pane Layout (Spec §6.B) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] max-h-[750px]">
              {/* LEFT PANE: Thread List (4 cols) */}
              <div className="lg:col-span-5 border-r border-gray-200 flex flex-col h-full bg-gray-50/40">
                {/* Filters */}
                <div className="p-3 border-b border-gray-200 flex flex-wrap gap-1.5 bg-white">
                  {[
                    { id: 'ALL', label: 'All Threads' },
                    { id: 'STUDENT_COORDINATOR', label: 'Student Doubts' },
                    { id: 'COORDINATOR_RECRUITER', label: 'Recruiter Ops' },
                    { id: 'OPEN', label: 'Open' },
                    { id: 'RESOLVED', label: 'Resolved' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setThreadFilter(f.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                        threadFilter === f.id
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Threads Scroll Area */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1.5">
                  {threads
                    .filter(t => {
                      if (threadFilter === 'STUDENT_COORDINATOR') return t.thread_type === 'STUDENT_COORDINATOR';
                      if (threadFilter === 'COORDINATOR_RECRUITER') return t.thread_type === 'COORDINATOR_RECRUITER';
                      if (threadFilter === 'OPEN') return t.status === 'OPEN';
                      if (threadFilter === 'RESOLVED') return t.status === 'RESOLVED';
                      return true;
                    })
                    .map(t => {
                      const isSelected = selectedThreadId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedThreadId(t.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-200/50 shadow-xs'
                              : 'bg-white border-gray-200/80 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              t.thread_type === 'STUDENT_COORDINATOR'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {t.thread_type === 'STUDENT_COORDINATOR' ? 'Lane 1: Student Doubt' : 'Lane 2: Recruiter Ops'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {t.is_pinned_faq && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Pin className="w-2.5 h-2.5" /> FAQ
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === 'OPEN' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {t.status}
                              </span>
                              {t.unread_count > 0 && (
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Unread messages" />
                              )}
                            </div>
                          </div>

                          <h4 className="font-bold text-gray-900 text-xs line-clamp-1">{t.subject}</h4>

                          {/* Context Subtitle */}
                          {t.thread_type === 'STUDENT_COORDINATOR' ? (
                            <p className="text-[11px] text-gray-600 font-medium mt-1">
                              From: <span className="font-bold text-gray-900">{t.student_name}</span> ({t.student_dept || 'Student'})
                              {t.student_cgpa ? ` • CGPA: ${t.student_cgpa}` : ''}
                              {t.student_backlogs !== null ? ` • Backlogs: ${t.student_backlogs}` : ''}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-600 font-medium mt-1">
                              Recruiter: <span className="font-bold text-gray-900">{t.recruiter_name || t.company_name || 'HR Team'}</span>
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-1 border-t border-gray-100">
                            <span className="font-medium text-emerald-700">{t.job_title || 'General Placement'}</span>
                            <span>{t.updated_at ? new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                        </div>
                      );
                    })}

                  {threads.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-400">
                      No doubts or logistics threads logged yet.
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANE: Active Conversation & Academic Profile Card (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full bg-white">
                {threadDetail ? (
                  <>
                    {/* Header Context Card (Spec §2.A) */}
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-gray-900 text-sm">{threadDetail.subject}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              threadDetail.status === 'OPEN' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {threadDetail.status}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                            Drive: {threadDetail.job_title} {threadDetail.company_name ? `• ${threadDetail.company_name}` : ''}
                          </p>
                        </div>

                        {/* Top Action Buttons (Spec §2.B & §2.C) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {threadDetail.job_id && (
                            <button
                              onClick={handleOpenPinModal}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition cursor-pointer"
                              title="Pin this Question & Answer as a public Drive FAQ for all students"
                            >
                              <Pin className="w-3.5 h-3.5 text-amber-600" />
                              {threadDetail.is_pinned_faq ? 'FAQ Pinned ✓' : 'Pin to Drive FAQ'}
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleStatus(threadDetail.status === 'OPEN' ? 'RESOLVED' : 'OPEN')}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border shadow-2xs transition cursor-pointer ${
                              threadDetail.status === 'OPEN'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {threadDetail.status === 'OPEN' ? 'Mark Resolved' : 'Reopen Thread'}
                          </button>
                        </div>
                      </div>

                      {/* Student Academic Context Card (Spec §2.A) */}
                      {threadDetail.thread_type === 'STUDENT_COORDINATOR' && (
                        <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-blue-600 block">Student Candidate</span>
                            <span className="font-bold text-gray-900">{threadDetail.student_name || 'Anonymous'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-blue-600 block">Department</span>
                            <span className="font-bold text-gray-900">{threadDetail.student_dept || boundDepartment}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-blue-600 block">Cumulative CGPA</span>
                            <span className="font-extrabold text-blue-900">{threadDetail.student_cgpa ?? 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-blue-600 block">Active Backlogs</span>
                            <span className="font-bold text-gray-900">{threadDetail.student_backlogs ?? 0}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                      {threadDetail.messages?.map(m => {
                        const isCoordinator = m.sender_role === 'DEPT_COORDINATOR' || m.sender_role === 'TPO_ADMIN';
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isCoordinator ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span className="text-[11px] font-bold text-gray-700">{m.sender_name}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                m.sender_role === 'STUDENT' ? 'bg-blue-100 text-blue-800' :
                                m.sender_role === 'RECRUITER' ? 'bg-purple-100 text-purple-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {m.sender_role}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>

                            <div className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed shadow-2xs ${
                              isCoordinator
                                ? 'bg-emerald-700 text-white rounded-tr-xs'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'
                            }`}>
                              {m.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Reply Box */}
                    <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type reply to candidate or recruiter..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyText.trim()}
                        className="px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingReply ? 'Sending...' : 'Send Reply'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                    <MessageCircle className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">Select an inquiry or logistics thread</p>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                      Department Coordinator acts as the central relay filter between students and visiting HR teams.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: PIN TO DRIVE FAQ (Spec §2.C) */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-gray-900 text-sm">Pin Q&A to Drive FAQ</h3>
              </div>
              <button 
                onClick={() => setPinModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Automated Broadcast: This Question and Answer will be published under the 
              <strong> "Drive FAQs"</strong> tab of this job posting for all eligible students, 
              cutting incoming doubt volume by over 80%.
            </p>

            <form onSubmit={handlePublishPinFaq} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Published Question</label>
                <input
                  type="text"
                  required
                  value={pinForm.question}
                  onChange={(e) => setPinForm({ ...pinForm, question: e.target.value })}
                  placeholder="e.g. Is there negative marking in the aptitude round?"
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Official Coordinator Answer</label>
                <textarea
                  rows="3"
                  required
                  value={pinForm.answer}
                  onChange={(e) => setPinForm({ ...pinForm, answer: e.target.value })}
                  placeholder="e.g. No negative marking. 60 questions in 60 minutes."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Pin className="w-3.5 h-3.5" />
                  {loading ? 'Publishing...' : 'Publish to Drive FAQs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW RECRUITER DRIVE LOGISTICS CHAT (Lane 2) */}
      {newLogisticsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-gray-900 text-sm">New Drive Logistics Chat with Recruiter</h3>
              </div>
              <button 
                onClick={() => setNewLogisticsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Direct operational channel with visiting company HR for drive day schedules, lab seating, and candidate edge-cases.
            </p>

            <form onSubmit={handleCreateLane2Thread} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Select Campus Drive</label>
                <select
                  required
                  value={logisticsForm.job_id}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, job_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Drive --</option>
                  {drives.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.ctc_lpa ? `${d.ctc_lpa} LPA` : 'Drive'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seating arrangement for Lab 2 & Aptitude reporting"
                  value={logisticsForm.subject}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Initial Message</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Hi Team, Lab 2 has 60 workstations ready for Round 1. Please confirm test link."
                  value={logisticsForm.message}
                  onChange={(e) => setLogisticsForm({ ...logisticsForm, message: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setNewLogisticsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'Starting...' : 'Start Logistics Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: BROADCASTS & FLASH NOTICES (Spec: docs/notification_and_broadcast_spec.md) */}
      {activeTab === 'broadcasts' && (
        <BroadcastManager role="DEPT_COORDINATOR" boundDepartment={boundDepartment} />
      )}

      {/* MODAL: MANAGE CAMPUS VENUES & ROUND LOGISTICS (Spec §3.C & §6) */}
      {showRoundsModal && selectedDriveForRounds && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Campus Venues & Round Logistics — {selectedDriveForRounds.title}
                </h3>
                <p className="text-xs text-gray-500">
                  Allocate campus computer labs, interview cabins, and reporting times for visiting company drives.
                </p>
              </div>
              <button 
                onClick={() => { setShowRoundsModal(false); setEditingRound(null); }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* List of configured rounds */}
            <div className="space-y-3">
              {driveRounds.map((rnd) => (
                <div key={rnd.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Round {rnd.round_number}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm">{rnd.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rnd.round_type === 'OFFLINE_INTERVIEW' ? 'bg-emerald-100 text-emerald-800' :
                      rnd.round_type === 'ONLINE_TEST' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {rnd.round_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                    <div>
                      <span className="font-semibold text-gray-500">Campus Venue: </span>
                      <span className="font-bold text-gray-900">{rnd.venue || 'Not allocated yet'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-500">Start Time: </span>
                      <span>{rnd.start_time ? new Date(rnd.start_time).toLocaleString() : 'TBD'}</span>
                    </div>
                  </div>

                  {rnd.description && (
                    <p className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-200">
                      {rnd.description}
                    </p>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleEditRoundLogistics(rnd)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Edit Venue & Logistics →
                    </button>
                  </div>
                </div>
              ))}
              {driveRounds.length === 0 && (
                <p className="text-xs text-gray-500 p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                  No interview rounds configured yet by recruiter for this drive.
                </p>
              )}
            </div>

            {/* In-line Edit Form */}
            {editingRound && (
              <form onSubmit={handleSaveRoundLogistics} className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                  Update Logistics for Round {editingRound.round_number}: {editingRound.name}
                </h4>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    On-Campus Venue (e.g. Academic Block 2, Computer Lab 4, Cabin 3)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Academic Block 2, Computer Lab 4, Cabin 3"
                    value={roundForm.venue}
                    onChange={(e) => setRoundForm({ ...roundForm, venue: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={roundForm.start_time}
                      onChange={(e) => setRoundForm({ ...roundForm, start_time: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Access Passcode / PIN</label>
                    <input
                      type="text"
                      placeholder="PIN-4482"
                      value={roundForm.access_code}
                      onChange={(e) => setRoundForm({ ...roundForm, access_code: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Reporting Instructions & Dress Code (Spec §3.C)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Reporting Time: 09:30 AM. Formal attire required. Bring 2 hard copies of resume and college ID card."
                    value={roundForm.description}
                    onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingRound(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Save Venue & Logistics'}
                  </button>
                </div>
              </form>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setShowRoundsModal(false); setEditingRound(null); }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

