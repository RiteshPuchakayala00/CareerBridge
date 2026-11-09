import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api, { getAssetUrl } from '../api';
import { formatTimeString, formatDateTime, formatTimeAgo } from '../utils/date';
import { 
  Briefcase, Building2, Users, CheckCircle2, AlertCircle, FileText, 
  ExternalLink, Sparkles, ChevronRight, RefreshCw, Send, PlusCircle,
  Calendar, Clock, MapPin, Link2, Key, Video, Laptop, CheckSquare, 
  Square, Filter, Search, Settings, ArrowRight, ShieldCheck, UserCheck, 
  UserX, Copy, Check, ChevronDown,
  MessageSquare, MessageCircle, HelpCircle, Plus
} from 'lucide-react';

export default function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Shortlisting selection
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [roundFilter, setRoundFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [applicantDateFilter, setApplicantDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'
  const [applicantStartDate, setApplicantStartDate] = useState('');
  const [applicantEndDate, setApplicantEndDate] = useState('');
  const [applicantSortOrder, setApplicantSortOrder] = useState('NEWEST'); // 'NEWEST', 'OLDEST'

  // Modals state
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [showRoundsConfigModal, setShowRoundsConfigModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [selectedRoundForLogistics, setSelectedRoundForLogistics] = useState(null);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [newDeadlineDate, setNewDeadlineDate] = useState('');
  const [updatingDeadline, setUpdatingDeadline] = useState(false);

  // Next round logistics inside shortlist modal
  const [nextRoundLogistics, setNextRoundLogistics] = useState({
    meeting_url: '',
    test_url: '',
    venue: '',
    access_code: '',
    start_time: '',
    end_time: '',
    description: ''
  });

  // Lane 2 Drive Logistics Chat State (Spec: docs/messaging_and_inquiry_system_spec.md §3)
  const [recruiterThreads, setRecruiterThreads] = useState([]);
  const [selectedRecruiterThreadId, setSelectedRecruiterThreadId] = useState(null);
  const [recruiterThreadDetail, setRecruiterThreadDetail] = useState(null);
  const [chatReply, setChatReply] = useState('');
  const [sendingChatReply, setSendingChatReply] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatForm, setNewChatForm] = useState({ job_id: '', subject: '', message: '' });

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    company_name: '',
    industry: '',
    website: '',
    description: ''
  });

  // Post Job Form state
  const [jobForm, setJobForm] = useState({
    title: '',
    job_type: 'Full-time',
    ctc_lpa: '',
    stipend_monthly: '',
    eligibility_cgpa: '7.0',
    max_backlogs: '0',
    target_batch_year: '',
    drive_date: '',
    deadline: '',
    description: '',
    eligible_departments: ['CSE', 'IT', 'ECE']
  });

  // Configurable pipeline rounds form state
  const [pipelineRounds, setPipelineRounds] = useState([
    {
      round_number: 1,
      name: 'Online Coding Assessment',
      round_type: 'ONLINE_TEST',
      description: '60-minute DSA & problem solving assessment on external platform.',
      test_url: 'https://assessment.hackerearth.com/college-drive-2026',
      access_code: 'CB@2026',
      start_time: '',
      end_time: ''
    },
    {
      round_number: 2,
      name: 'Technical Interview 1',
      round_type: 'VIRTUAL_INTERVIEW',
      description: 'Live coding and system design review via Google Meet.',
      meeting_url: 'https://meet.google.com/abc-defg-hij',
      access_code: 'PIN-2026',
      start_time: '',
      end_time: ''
    },
    {
      round_number: 3,
      name: 'HR & Leadership Round',
      round_type: 'OFFLINE_INTERVIEW',
      description: 'On-campus interview in designated placement cabin.',
      venue: 'Academic Block 2, Room 402, Cabin B',
      access_code: 'Formal attire required. Carry 2 printed resumes.',
      start_time: '',
      end_time: ''
    }
  ]);

  const availableDepts = ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL', 'EE'];

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setMessage(msg);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/recruiter/profile');
      setProfile(res.data);
      setProfileForm({
        company_name: res.data.company_name || '',
        industry: res.data.industry || '',
        website: res.data.website || '',
        description: res.data.description || ''
      });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/recruiter/jobs');
      setJobs(res.data);
      if (res.data.length > 0 && !selectedJobId) {
        setSelectedJobId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplicants = async (jobId) => {
    if (!jobId) return;
    try {
      const res = await api.get(`/recruiter/applicants/${jobId}`);
      setApplicants(res.data);
      setSelectedAppIds([]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRounds = async (jobId) => {
    if (!jobId) return;
    try {
      const res = await api.get(`/jobs/${jobId}/rounds`);
      setRounds(res.data);
      if (res.data.length > 0) {
        setPipelineRounds(res.data.map(r => ({
          round_number: r.round_number,
          name: r.name,
          round_type: r.round_type,
          description: r.description || '',
          test_url: r.test_url || '',
          meeting_url: r.meeting_url || '',
          venue: r.venue || '',
          access_code: r.access_code || '',
          start_time: r.start_time ? r.start_time.slice(0, 16) : '',
          end_time: r.end_time ? r.end_time.slice(0, 16) : ''
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecruiterThreads = async () => {
    try {
      const res = await api.get('/messages/threads?thread_type=COORDINATOR_RECRUITER');
      setRecruiterThreads(res.data);
      if (res.data.length > 0 && !selectedRecruiterThreadId) {
        setSelectedRecruiterThreadId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching recruiter threads:", err);
    }
  };

  const fetchRecruiterThreadDetail = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/messages/threads/${id}`);
      setRecruiterThreadDetail(res.data);
    } catch (err) {
      console.error("Error fetching thread detail:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchJobs();
    fetchRecruiterThreads();
  }, []);

  useEffect(() => {
    if (activeTab === 'logistics_chat') {
      fetchRecruiterThreads();
      const interval = setInterval(fetchRecruiterThreads, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedRecruiterThreadId) {
      fetchRecruiterThreadDetail(selectedRecruiterThreadId);
    }
  }, [selectedRecruiterThreadId]);

  const handleSendChatReply = async (e) => {
    e.preventDefault();
    if (!chatReply.trim() || !selectedRecruiterThreadId) return;
    setSendingChatReply(true);
    try {
      await api.post(`/messages/threads/${selectedRecruiterThreadId}/messages`, { content: chatReply });
      setChatReply('');
      await fetchRecruiterThreadDetail(selectedRecruiterThreadId);
      await fetchRecruiterThreads();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to send message", true);
    } finally {
      setSendingChatReply(false);
    }
  };

  const handleCreateRecruiterChat = async (e) => {
    e.preventDefault();
    if (!newChatForm.subject?.trim() || !newChatForm.message?.trim()) {
      showNotification("Please enter a subject and message", true);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/messages/threads', {
        job_id: newChatForm.job_id ? parseInt(newChatForm.job_id) : null,
        thread_type: 'COORDINATOR_RECRUITER',
        subject: newChatForm.subject.trim(),
        initial_message: newChatForm.message.trim()
      });
      showNotification("Operational message dispatched to College Placement Coordinator!");
      setNewChatModalOpen(false);
      setNewChatForm({ job_id: '', subject: '', message: '' });
      await fetchRecruiterThreads();
      setSelectedRecruiterThreadId(res.data.id);
      setActiveTab('logistics_chat');
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to initiate coordinator chat", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      fetchApplicants(selectedJobId);
      fetchRounds(selectedJobId);
    }
  }, [selectedJobId]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/recruiter/profile', profileForm);
      showNotification("Company profile updated successfully.");
      fetchProfile();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Profile update failed", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Job
  const handleCreateJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: jobForm.title,
        job_type: jobForm.job_type,
        ctc_lpa: jobForm.ctc_lpa ? parseFloat(jobForm.ctc_lpa) : null,
        stipend_monthly: jobForm.stipend_monthly ? parseFloat(jobForm.stipend_monthly) : null,
        eligibility_cgpa: jobForm.eligibility_cgpa ? parseFloat(jobForm.eligibility_cgpa) : 0,
        max_backlogs: jobForm.max_backlogs ? parseInt(jobForm.max_backlogs) : 0,
        target_batch_year: jobForm.target_batch_year ? parseInt(jobForm.target_batch_year) : null,
        drive_date: jobForm.drive_date ? new Date(jobForm.drive_date).toISOString() : null,
        deadline: jobForm.deadline ? new Date(jobForm.deadline).toISOString() : null,
        description: jobForm.description,
        eligible_departments: jobForm.eligible_departments
      };

      const res = await api.post('/recruiter/jobs', payload);
      showNotification(res.data.message);
      fetchJobs();
      setActiveTab('jobs');
      if (res.data.job_id) {
        setSelectedJobId(res.data.job_id);
      }
      setJobForm({
        title: '',
        job_type: 'Full-time',
        ctc_lpa: '',
        stipend_monthly: '',
        eligibility_cgpa: '7.0',
        max_backlogs: '0',
        target_batch_year: '',
        drive_date: '',
        deadline: '',
        description: '',
        eligible_departments: ['CSE', 'IT', 'ECE']
      });
    } catch (err) {
      showNotification(err.response?.data?.detail || "Job creation failed", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Pipeline Rounds
  const handleSaveRoundsConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formatted = pipelineRounds.map((r, idx) => ({
        round_number: idx + 1,
        name: r.name,
        round_type: r.round_type,
        description: r.description || null,
        test_url: r.test_url || null,
        meeting_url: r.meeting_url || null,
        venue: r.venue || null,
        access_code: r.access_code || null,
        start_time: r.start_time ? new Date(r.start_time).toISOString() : null,
        end_time: r.end_time ? new Date(r.end_time).toISOString() : null
      }));

      await api.post(`/jobs/${selectedJobId}/rounds`, { rounds: formatted });
      showNotification(`Dynamic round pipeline configured with ${formatted.length} sequential rounds.`);
      setShowRoundsConfigModal(false);
      fetchRounds(selectedJobId);
      fetchApplicants(selectedJobId);
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to configure rounds", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Edit Logistics of a single round
  const handleSaveLogistics = async (e) => {
    e.preventDefault();
    if (!selectedRoundForLogistics) return;
    setLoading(true);
    try {
      const payload = {
        name: selectedRoundForLogistics.name,
        round_type: selectedRoundForLogistics.round_type,
        description: selectedRoundForLogistics.description,
        test_url: selectedRoundForLogistics.test_url || null,
        meeting_url: selectedRoundForLogistics.meeting_url || null,
        venue: selectedRoundForLogistics.venue || null,
        access_code: selectedRoundForLogistics.access_code || null,
        start_time: selectedRoundForLogistics.start_time ? new Date(selectedRoundForLogistics.start_time).toISOString() : null,
        end_time: selectedRoundForLogistics.end_time ? new Date(selectedRoundForLogistics.end_time).toISOString() : null
      };

      await api.patch(`/jobs/${selectedJobId}/rounds/${selectedRoundForLogistics.id}/logistics`, payload);
      showNotification(`Logistics updated for Round ${selectedRoundForLogistics.round_number}.`);
      setShowLogisticsModal(false);
      fetchRounds(selectedJobId);
    } catch (err) {
      showNotification(err.response?.data?.detail || "Logistics update failed", true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Update / Extend Application Deadline
  const handleSaveDeadline = async (e) => {
    e.preventDefault();
    if (!selectedJobId || !newDeadlineDate) return;
    setUpdatingDeadline(true);
    try {
      const res = await api.patch(`/jobs/${selectedJobId}/deadline`, {
        deadline: new Date(newDeadlineDate).toISOString()
      });
      showNotification(res.data.message || "Application deadline updated successfully");
      setShowDeadlineModal(false);
      fetchJobs();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to update deadline", true);
    } finally {
      setUpdatingDeadline(false);
    }
  };

  // Determine current active round for publishing
  const selectedApplicants = applicants.filter(a => selectedAppIds.includes(a.application_id));
  const candidateRoundNumber = selectedApplicants.length > 0 
    ? (selectedApplicants[0].current_round_number || 1) 
    : null;

  const activeRoundForShortlist = rounds.find(r => {
    if (roundFilter !== 'ALL') return r.round_number === parseInt(roundFilter);
    if (candidateRoundNumber) return r.round_number === candidateRoundNumber;
    return true;
  }) || (rounds.length > 0 ? rounds[0] : null);

  const nextRoundAfterCurrent = activeRoundForShortlist 
    ? rounds.find(r => r.round_number === activeRoundForShortlist.round_number + 1)
    : null;

  // Handle Shortlist Publishing
  const handlePublishShortlist = async () => {
    if (!activeRoundForShortlist) {
      showNotification("No active round found for shortlisting. Please configure rounds first.", true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shortlisted_application_ids: selectedAppIds,
        next_round_logistics: nextRoundLogistics.meeting_url || nextRoundLogistics.test_url || nextRoundLogistics.venue ? {
          meeting_url: nextRoundLogistics.meeting_url || null,
          test_url: nextRoundLogistics.test_url || null,
          venue: nextRoundLogistics.venue || null,
          access_code: nextRoundLogistics.access_code || null,
          description: nextRoundLogistics.description || null,
          start_time: nextRoundLogistics.start_time ? new Date(nextRoundLogistics.start_time).toISOString() : null,
          end_time: nextRoundLogistics.end_time ? new Date(nextRoundLogistics.end_time).toISOString() : null
        } : null
      };

      const res = await api.post(`/jobs/${selectedJobId}/rounds/${activeRoundForShortlist.id}/shortlist`, payload);
      showNotification(res.data.message);
      setShowShortlistModal(false);
      setSelectedAppIds([]);
      fetchApplicants(selectedJobId);
      fetchRounds(selectedJobId);
    } catch (err) {
      showNotification(err.response?.data?.detail || "Shortlisting publication failed", true);
    } finally {
      setLoading(false);
    }
  };

  // Candidate selection helpers
  const handleToggleCandidate = (appId) => {
    if (selectedAppIds.includes(appId)) {
      setSelectedAppIds(selectedAppIds.filter(id => id !== appId));
    } else {
      setSelectedAppIds([...selectedAppIds, appId]);
    }
  };

  const handleSelectAllFiltered = () => {
    const selectable = filteredApplicants
      .filter(a => a.status !== 'REJECTED' && a.status !== 'OFFERED')
      .map(a => a.application_id);

    if (selectedAppIds.length === selectable.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(selectable);
    }
  };

  // Filtered applicants
  const filteredApplicants = applicants.filter(app => {
    // Round filter
    if (roundFilter !== 'ALL') {
      const targetRNum = parseInt(roundFilter);
      if (app.current_round_number !== targetRNum) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.student_name?.toLowerCase().includes(q);
      const matchEmail = app.email?.toLowerCase().includes(q);
      const matchRoll = app.roll_number?.toLowerCase().includes(q);
      const matchDept = app.department?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll && !matchDept) return false;
    }
    // Date filter
    if (applicantDateFilter !== 'ALL' && app.applied_at) {
      const appDate = new Date(app.applied_at);
      const now = new Date();
      if (applicantDateFilter === 'TODAY') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (appDate < startOfToday) return false;
      } else if (applicantDateFilter === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (appDate < weekAgo) return false;
      } else if (applicantDateFilter === 'MONTH') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (appDate < monthAgo) return false;
      } else if (applicantDateFilter === 'CUSTOM') {
        if (applicantStartDate && appDate < new Date(applicantStartDate)) return false;
        if (applicantEndDate) {
          const end = new Date(applicantEndDate);
          end.setHours(23, 59, 59, 999);
          if (appDate > end) return false;
        }
      }
    }
    return true;
  }).sort((a, b) => {
    const da = a.applied_at ? new Date(a.applied_at).getTime() : 0;
    const db = b.applied_at ? new Date(b.applied_at).getTime() : 0;
    return applicantSortOrder === 'OLDEST' ? da - db : db - da;
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title with Company Info */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl shadow-xs">
                <Building2 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{profile?.company_name || 'Corporate Talent Portal'}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Visiting Recruiter
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">Dynamic Pipeline & Automated Shortlisting Active</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              fetchProfile();
              fetchJobs();
              if (selectedJobId) {
                fetchApplicants(selectedJobId);
                fetchRounds(selectedJobId);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Portal
          </button>
        </div>

        {/* Global Notifications */}
        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold">{message}</p>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-3 shadow-xs animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-1 sm:space-x-4 bg-white px-4 py-2 rounded-xl shadow-xs">
          {[
            { id: 'jobs', label: 'Drives & Shortlisting Pipeline', icon: Users },
            { id: 'new_job', label: 'Post New Campus Drive', icon: PlusCircle },
            { id: 'profile', label: 'Company Profile', icon: Building2 },
            { 
              id: 'logistics_chat', 
              label: 'Coordinator Chat (Drive Logistics)', 
              icon: MessageSquare,
              badge: recruiterThreads.filter(t => t.unread_count > 0).length
            }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                    isActive ? 'bg-white text-amber-700' : 'bg-red-500 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: DRIVES & CANDIDATE PIPELINE */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Job Select Sidebar */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3 h-fit">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">Active Openings</h3>
                  <span className="text-xs font-semibold text-gray-500">{jobs.length} Total</span>
                </div>
                <div className="space-y-2">
                  {jobs.map(j => (
                    <button
                      key={j.id}
                      onClick={() => setSelectedJobId(j.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedJobId === j.id 
                          ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300/40 shadow-xs'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-gray-900 text-sm leading-snug">{j.title}</p>
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                          j.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {j.status || 'PENDING'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-2.5">
                        <span className="font-medium">{j.job_type}</span>
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                          🎓 {j.target_batch_year ? `${j.target_batch_year} Batch` : 'All Batches'}
                        </span>
                        <span className="font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                          {j.applicant_count} Applicants
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Deadline:</span>
                        <span className={`font-semibold ${j.deadline && new Date(j.deadline) < new Date() ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                          {j.deadline ? new Date(j.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'None'}
                          {j.deadline && new Date(j.deadline) < new Date() ? ' (Expired)' : ''}
                        </span>
                      </div>
                    </button>
                  ))}
                  {jobs.length === 0 && (
                    <p className="text-xs text-gray-500 p-4 text-center">No openings posted yet. Click "Post New Campus Drive" to start.</p>
                  )}
                </div>
              </div>

              {/* Main Content Area: Pipeline & Applicants */}
              <div className="lg:col-span-3 space-y-6">
                {/* DYNAMIC ROUND PIPELINE DISPLAY (Spec §2) */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-gray-900 text-base">Dynamic Recruitment Pipeline</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {rounds.length} Configured Rounds
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Recruiter-configured sequence of rounds. Candidates advance sequential round by round.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <button
                        onClick={() => {
                          const currentJob = jobs.find(j => j.id === selectedJobId);
                          if (currentJob?.deadline) {
                            const d = new Date(currentJob.deadline);
                            const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            setNewDeadlineDate(localIso);
                          } else {
                            setNewDeadlineDate('');
                          }
                          setShowDeadlineModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Deadline: {jobs.find(j => j.id === selectedJobId)?.deadline ? new Date(jobs.find(j => j.id === selectedJobId).deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Set'}
                        {jobs.find(j => j.id === selectedJobId)?.deadline && new Date(jobs.find(j => j.id === selectedJobId).deadline) < new Date() && (
                          <span className="text-[10px] text-red-600 font-extrabold ml-1">Expired</span>
                        )}
                      </button>

                      <button
                        onClick={() => setShowRoundsConfigModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-amber-600" /> Configure Round Pipeline
                      </button>
                    </div>
                  </div>

                  {/* Sequential Rounds Pills */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {rounds.map((r, idx) => (
                      <div 
                        key={r.id} 
                        className="p-3.5 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:border-amber-300 transition shadow-2xs relative group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Round {r.round_number}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.round_type === 'ONLINE_TEST' ? 'bg-purple-100 text-purple-800' :
                            r.round_type === 'VIRTUAL_INTERVIEW' ? 'bg-blue-100 text-blue-800' :
                            r.round_type === 'OFFLINE_INTERVIEW' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {r.round_type}
                          </span>
                        </div>

                        <h4 className="font-bold text-gray-900 text-sm mt-2">{r.name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{r.description || 'No instructions provided.'}</p>

                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-600">
                            {r.candidate_count || 0} In Round
                          </span>
                          <button
                            onClick={() => {
                              setSelectedRoundForLogistics(r);
                              setShowLogisticsModal(true);
                            }}
                            className="text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer"
                          >
                            Edit Delivery Links →
                          </button>
                        </div>
                      </div>
                    ))}
                    {rounds.length === 0 && (
                      <div className="md:col-span-3 p-6 text-center border-2 border-dashed border-gray-200 rounded-xl">
                        <p className="text-xs font-semibold text-gray-500">No rounds configured yet for this job posting.</p>
                        <button
                          onClick={() => setShowRoundsConfigModal(true)}
                          className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                        >
                          + Configure sequential rounds now
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* APPLICANTS TABLE & SHORTLIST PUBLISHING (Spec §4) */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                  {/* Table Toolbar & Filters */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">Candidate Evaluation & Shortlisting</h3>
                        <p className="text-xs text-gray-500">
                          Select candidates to advance to the next round. Unselected candidates receive transparent rejection notices.
                        </p>
                      </div>

                      {/* Sticky Publish Shortlist Button */}
                      {selectedAppIds.length > 0 && (
                        <button
                          onClick={() => {
                            if (nextRoundAfterCurrent) {
                              setNextRoundLogistics({
                                meeting_url: nextRoundAfterCurrent.meeting_url || '',
                                test_url: nextRoundAfterCurrent.test_url || '',
                                venue: nextRoundAfterCurrent.venue || '',
                                access_code: nextRoundAfterCurrent.access_code || '',
                                start_time: nextRoundAfterCurrent.start_time ? nextRoundAfterCurrent.start_time.slice(0, 16) : '',
                                end_time: nextRoundAfterCurrent.end_time ? nextRoundAfterCurrent.end_time.slice(0, 16) : '',
                                description: nextRoundAfterCurrent.description || ''
                              });
                            }
                            setShowShortlistModal(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition animate-pulse cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {nextRoundAfterCurrent 
                            ? `Advance Shortlist to Round ${nextRoundAfterCurrent.round_number} (${selectedAppIds.length} Selected)`
                            : `Extend Official Job Offers (${selectedAppIds.length} Selected)`}
                        </button>
                      )}
                    </div>

                    {/* Filter Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search candidate name, roll, branch..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </div>

                      {/* Filter by Round */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Round:</span>
                        <select
                          value={roundFilter}
                          onChange={(e) => setRoundFilter(e.target.value)}
                          className="w-full py-1.5 px-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                        >
                          <option value="ALL">All Candidates ({applicants.length})</option>
                          {rounds.map(r => (
                            <option key={r.id} value={r.round_number}>
                              Round {r.round_number}: {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Filter by Application Date */}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select
                          value={applicantDateFilter}
                          onChange={(e) => setApplicantDateFilter(e.target.value)}
                          className="w-full py-1.5 px-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                        >
                          <option value="ALL">All Application Dates</option>
                          <option value="TODAY">Applied Today</option>
                          <option value="WEEK">Past 7 Days</option>
                          <option value="MONTH">Past 30 Days</option>
                          <option value="CUSTOM">Custom Range...</option>
                        </select>
                      </div>

                      {/* Sort Order */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select
                          value={applicantSortOrder}
                          onChange={(e) => setApplicantSortOrder(e.target.value)}
                          className="w-full py-1.5 px-2.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                        >
                          <option value="NEWEST">Newest Applied First</option>
                          <option value="OLDEST">Oldest Applied First</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Date Range Picker */}
                    {applicantDateFilter === 'CUSTOM' && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
                        <span className="font-semibold text-gray-500">From:</span>
                        <input
                          type="date"
                          value={applicantStartDate}
                          onChange={(e) => setApplicantStartDate(e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="font-semibold text-gray-500">To:</span>
                        <input
                          type="date"
                          value={applicantEndDate}
                          onChange={(e) => setApplicantEndDate(e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        {(applicantStartDate || applicantEndDate) && (
                          <button
                            onClick={() => { setApplicantStartDate(''); setApplicantEndDate(''); }}
                            className="text-xs text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Applicants Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50/80 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left w-10">
                            <button
                              onClick={handleSelectAllFiltered}
                              className="text-gray-400 hover:text-amber-600 transition cursor-pointer"
                              title="Toggle Select All"
                            >
                              {selectedAppIds.length > 0 && selectedAppIds.length === filteredApplicants.filter(a => a.status !== 'REJECTED' && a.status !== 'OFFERED').length ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Candidate</th>
                          <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Branch & Roll</th>
                          <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">CGPA</th>
                          <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Applied Date</th>
                          <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Current Round</th>
                          <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Resume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredApplicants.map(app => {
                          const isSelected = selectedAppIds.includes(app.application_id);
                          const isRejected = app.status === 'REJECTED';
                          const isOffered = app.status === 'OFFERED';

                          return (
                            <tr 
                              key={app.application_id} 
                              className={`transition ${isSelected ? 'bg-amber-50/40' : 'hover:bg-gray-50/70'} ${isRejected ? 'opacity-65' : ''}`}
                            >
                              <td className="px-4 py-3.5">
                                <button
                                  disabled={isRejected || isOffered}
                                  onClick={() => handleToggleCandidate(app.application_id)}
                                  className={`transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3.5">
                                <p className="font-bold text-gray-900 leading-snug">{app.student_name}</p>
                                <p className="text-xs text-gray-500">{app.email}</p>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="font-semibold text-gray-800 text-xs">{app.department}</span>
                                <p className="text-[11px] font-mono text-gray-500">{app.roll_number || 'N/A'}</p>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-gray-900 text-xs">
                                {app.cgpa ?? 'N/A'}
                              </td>
                              <td className="px-4 py-3.5 text-xs text-gray-700">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span>{app.applied_at ? formatDateTime(app.applied_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                                </div>
                                {app.applied_at && (
                                  <p className="text-[10px] text-gray-400 pl-5">
                                    {formatTimeAgo(app.applied_at)}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                {isRejected ? (
                                  <span className="text-xs font-semibold text-red-600">
                                    Rejected at R{app.rejection_round_number || 1}
                                  </span>
                                ) : isOffered ? (
                                  <span className="text-xs font-bold text-emerald-600">
                                    Final Offer Extended
                                  </span>
                                ) : (
                                  <div>
                                    <span className="text-xs font-bold text-gray-900">
                                      {app.current_round_name || `Round ${app.current_round_number || 1}`}
                                    </span>
                                    {app.scheduled_slot && (
                                      <p className="text-[10px] text-blue-600 font-medium">
                                        Slot: {new Date(app.scheduled_slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                  app.status === 'OFFERED' ? 'bg-emerald-100 text-emerald-800' :
                                  app.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {app.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {app.resume_url ? (
                                  <a 
                                    href={getAssetUrl(app.resume_url)} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
                                  >
                                    <FileText className="w-3.5 h-3.5" /> PDF
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-400">No PDF</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredApplicants.length === 0 && (
                          <tr>
                            <td colSpan="8" className="text-center py-12 text-gray-500 text-xs">
                              No applicants found matching the selected filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POST NEW CAMPUS DRIVE */}
        {activeTab === 'new_job' && (
          <div className="max-w-3xl mx-auto bg-white p-7 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Post New Campus Recruitment Drive</h3>
              <p className="text-xs text-gray-500 mt-1">
                Establish academic criteria. The 5-rule engine enforces gates automatically across student batches.
              </p>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Development Engineer (SDE-1)"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Job Type</label>
                  <select
                    value={jobForm.job_type}
                    onChange={(e) => setJobForm({ ...jobForm, job_type: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CTC (LPA) / Stipend</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="14.5"
                    value={jobForm.ctc_lpa}
                    onChange={(e) => setJobForm({ ...jobForm, ctc_lpa: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Min CGPA Cutoff</label>
                  <input
                    type="number"
                    step="0.1"
                    value={jobForm.eligibility_cgpa}
                    onChange={(e) => setJobForm({ ...jobForm, eligibility_cgpa: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Max Backlogs Allowed</label>
                  <input
                    type="number"
                    value={jobForm.max_backlogs}
                    onChange={(e) => setJobForm({ ...jobForm, max_backlogs: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Target Graduation / Passout Year (Batch)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2026 (Leave empty for All Batches)"
                  value={jobForm.target_batch_year}
                  onChange={(e) => setJobForm({ ...jobForm, target_batch_year: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Only students graduating in this passout year will be eligible to apply.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Application Deadline</label>
                  <input
                    type="datetime-local"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm({ ...jobForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tentative Drive Date</label>
                  <input
                    type="date"
                    value={jobForm.drive_date}
                    onChange={(e) => setJobForm({ ...jobForm, drive_date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Eligible Academic Branches</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableDepts.map(dept => {
                    const isSelected = jobForm.eligible_departments.includes(dept);
                    return (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => {
                          if (isSelected) {
                            setJobForm({
                              ...jobForm,
                              eligible_departments: jobForm.eligible_departments.filter(d => d !== dept)
                            });
                          } else {
                            setJobForm({
                              ...jobForm,
                              eligible_departments: [...jobForm.eligible_departments, dept]
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {dept} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Job Description & Requirements</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Detail responsibilities, tech stacks, expectations..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition shadow-xs cursor-pointer"
              >
                {loading ? 'Submitting Drive...' : 'Submit Campus Drive for Approval'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: COMPANY PROFILE */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white p-7 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Corporate Recruiter Profile</h3>
            <p className="text-xs text-gray-500">
              Manage your company's official information visible to students and TPO administrators.
            </p>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.company_name}
                  onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Industry Sector</label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Software / FinTech"
                    value={profileForm.industry}
                    onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company Website</label>
                  <input
                    type="url"
                    placeholder="https://company.com"
                    value={profileForm.website}
                    onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">About Company</label>
                <textarea
                  rows="4"
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition shadow-xs cursor-pointer"
              >
                {loading ? 'Saving...' : 'Update Corporate Profile'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: COORDINATOR CHAT / DRIVE LOGISTICS (Spec §3 & §6.C) */}
        {activeTab === 'logistics_chat' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Drive Logistics & College Coordination</h3>
                  <p className="text-xs text-gray-500">
                    Real-time operational channel with Department Placement Coordinators & TPO staff (Spec §3).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewChatModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" /> + Contact College Staff
                </button>
                <button
                  onClick={fetchRecruiterThreads}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                  title="Refresh Conversations"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px] max-h-[700px]">
              {/* Left Pane: Conversations List (4 cols) */}
              <div className="lg:col-span-5 border-r border-gray-200 flex flex-col h-full bg-gray-50/40">
                <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Active Logistics Threads</span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    {recruiterThreads.length} Total
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1.5">
                  {recruiterThreads.map(t => {
                    const isSelected = selectedRecruiterThreadId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedRecruiterThreadId(t.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200/50 shadow-xs'
                            : 'bg-white border-gray-200/80 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-amber-900 bg-amber-100 truncate max-w-[200px]">
                            {t.job_title}
                          </span>

                          <div className="flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'OPEN' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {t.status}
                            </span>
                            {t.unread_count > 0 && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Unread updates" />
                            )}
                          </div>
                        </div>

                        <h4 className="font-bold text-gray-900 text-xs line-clamp-1">{t.subject}</h4>

                        {t.last_message && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-1">
                            {t.last_message}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-1 border-t border-gray-100">
                          <span>Staff: {t.coordinator_name || 'Placement Staff'}</span>
                          <span>{t.updated_at ? new Date(t.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                      </div>
                    );
                  })}

                  {recruiterThreads.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                      <p>No logistics coordination threads active.</p>
                      <button
                        onClick={() => setNewChatModalOpen(true)}
                        className="text-amber-600 font-bold hover:underline cursor-pointer"
                      >
                        + Message placement coordinator now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: Live Logistics Chat (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full bg-white">
                {recruiterThreadDetail ? (
                  <>
                    {/* Header */}
                    <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-gray-900 text-sm">{recruiterThreadDetail.subject}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            recruiterThreadDetail.status === 'OPEN' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {recruiterThreadDetail.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Drive: <span className="font-semibold text-amber-800">{recruiterThreadDetail.job_title}</span>
                          {recruiterThreadDetail.coordinator_name ? ` • Coordinator: ${recruiterThreadDetail.coordinator_name}` : ''}
                          {recruiterThreadDetail.company_name ? ` • Enterprise: ${recruiterThreadDetail.company_name}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Chat Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                      {recruiterThreadDetail.messages?.map(m => {
                        const isRecruiter = m.sender_role === 'RECRUITER';
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isRecruiter ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span className="text-[11px] font-bold text-gray-700">{m.sender_name}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                isRecruiter ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {m.sender_role}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {m.created_at ? formatTimeString(m.created_at) : ''}
                              </span>
                            </div>

                            <div className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed shadow-2xs ${
                              isRecruiter
                                ? 'bg-amber-600 text-white rounded-tr-xs'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'
                            }`}>
                              {m.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Input Box */}
                    <form onSubmit={handleSendChatReply} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type operational update to college staff..."
                        value={chatReply}
                        onChange={(e) => setChatReply(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                      />
                      <button
                        type="submit"
                        disabled={sendingChatReply || !chatReply.trim()}
                        className="px-4 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingChatReply ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                    <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">Select a logistics thread</p>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                      Coordinate with Department Coordinators for student dispatch, lab status, test links, or eligibility edge-cases.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NEW RECRUITER TO COORDINATOR LOGISTICS CHAT (Spec §3) */}
      {newChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-gray-900 text-sm">Contact College Placement Coordinator</h3>
              </div>
              <button 
                onClick={() => setNewChatModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Use this private lane to communicate drive logistics, student seating in labs, or schedule changes with college staff.
            </p>

            <form onSubmit={handleCreateRecruiterChat} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Campus Drive <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={newChatForm.job_id}
                  onChange={(e) => setNewChatForm({ ...newChatForm, job_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- General Inquiry / No Specific Drive --</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.job_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Operational Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Round 1 Aptitude finalized: Dispatch first 15 candidates to Lab 3"
                  value={newChatForm.subject}
                  onChange={(e) => setNewChatForm({ ...newChatForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Message to Coordinator / TPO</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Hi Team, please send candidates Alice and Bob to interview cabin 2 immediately for technical round 2."
                  value={newChatForm.message}
                  onChange={(e) => setNewChatForm({ ...newChatForm, message: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setNewChatModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: PUBLISH SHORTLIST FOR NEXT ROUND (Spec §4) */}
      {showShortlistModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    {nextRoundAfterCurrent 
                      ? `Publish Shortlist for Round ${nextRoundAfterCurrent.round_number}: ${nextRoundAfterCurrent.name}`
                      : 'Final Round Evaluation: Extend Official Job Offers'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Evaluating Round {activeRoundForShortlist?.round_number}: {activeRoundForShortlist?.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowShortlistModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Candidate Impact Summary */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {nextRoundAfterCurrent ? 'Shortlisted & Advancing' : 'Selected for Official Offer'}
                </span>
                <p className="text-2xl font-black text-emerald-800">{selectedAppIds.length} Students</p>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  {nextRoundAfterCurrent 
                    ? `Advancing to Round ${nextRoundAfterCurrent.round_number} (${nextRoundAfterCurrent.name})` 
                    : '🎉 Final Round Cleared → Official Job Offer Extended!'}
                </p>
              </div>
              <div className="space-y-1 border-l border-gray-200 pl-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Instant Transparent Rejection</span>
                <p className="text-2xl font-black text-red-800">
                  {Math.max(0, applicants.filter(a => a.status !== 'REJECTED' && a.status !== 'OFFERED' && (a.current_round_number === activeRoundForShortlist?.round_number || (activeRoundForShortlist?.round_number === 1 && !a.current_round_number))).length - selectedAppIds.length)} Students
                </p>
                <p className="text-[11px] text-gray-500">
                  Immediately marked as <span className="font-bold text-red-600">REJECTED</span> with transparent closure notice for Round {activeRoundForShortlist?.round_number}.
                </p>
              </div>
            </div>

            {/* Next Round Logistics Config (Optional fast-edit) */}
            {nextRoundAfterCurrent && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                    Next Round Delivery Details (Round {nextRoundAfterCurrent.round_number}: {nextRoundAfterCurrent.name})
                  </h4>
                </div>

                {nextRoundAfterCurrent.round_type === 'VIRTUAL_INTERVIEW' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Virtual Interview URL (Google Meet / Zoom)</label>
                      <input
                        type="url"
                        placeholder="https://meet.google.com/abc-defg-hij"
                        value={nextRoundLogistics.meeting_url}
                        onChange={(e) => setNextRoundLogistics({ ...nextRoundLogistics, meeting_url: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {nextRoundAfterCurrent.round_type === 'ONLINE_TEST' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Online Test Assessment Link</label>
                      <input
                        type="url"
                        placeholder="https://assessment.hackerearth.com/..."
                        value={nextRoundLogistics.test_url}
                        onChange={(e) => setNextRoundLogistics({ ...nextRoundLogistics, test_url: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {nextRoundAfterCurrent.round_type === 'OFFLINE_INTERVIEW' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Campus Venue & Room</label>
                    <input
                      type="text"
                      placeholder="e.g. Academic Block 2, Computer Lab 4, Cabin 3"
                      value={nextRoundLogistics.venue}
                      onChange={(e) => setNextRoundLogistics({ ...nextRoundLogistics, venue: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={nextRoundLogistics.start_time}
                      onChange={(e) => setNextRoundLogistics({ ...nextRoundLogistics, start_time: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Access Passcode / PIN</label>
                    <input
                      type="text"
                      placeholder="e.g. PIN-4482 or CB@2026"
                      value={nextRoundLogistics.access_code}
                      onChange={(e) => setNextRoundLogistics({ ...nextRoundLogistics, access_code: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowShortlistModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handlePublishShortlist}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition cursor-pointer"
              >
                {loading ? 'Publishing...' : nextRoundAfterCurrent ? 'Confirm & Publish Shortlist' : 'Confirm & Extend Official Offers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURE ROUND PIPELINE (Spec §2) */}
      {showRoundsConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Settings className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Configure Dynamic Round Pipeline</h3>
                  <p className="text-xs text-gray-500">Design any number of sequential rounds per campus drive.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRoundsConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRoundsConfig} className="space-y-4">
              <div className="space-y-3">
                {pipelineRounds.map((rnd, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Round {idx + 1}
                      </span>
                      {pipelineRounds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPipelineRounds(pipelineRounds.filter((_, i) => i !== idx))}
                          className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          Remove Round
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Round Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Online Coding Assessment"
                          value={rnd.name}
                          onChange={(e) => {
                            const updated = [...pipelineRounds];
                            updated[idx].name = e.target.value;
                            setPipelineRounds(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Round Type</label>
                        <select
                          value={rnd.round_type}
                          onChange={(e) => {
                            const updated = [...pipelineRounds];
                            updated[idx].round_type = e.target.value;
                            setPipelineRounds(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
                        >
                          <option value="ONLINE_TEST">ONLINE_TEST (HackerRank, HackerEarth)</option>
                          <option value="VIRTUAL_INTERVIEW">VIRTUAL_INTERVIEW (Google Meet, Zoom)</option>
                          <option value="OFFLINE_INTERVIEW">OFFLINE_INTERVIEW (On-Campus Face-to-Face)</option>
                          <option value="GROUP_DISCUSSION">GROUP_DISCUSSION</option>
                        </select>
                      </div>
                    </div>

                    {rnd.round_type === 'ONLINE_TEST' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Assessment Test URL</label>
                          <input
                            type="url"
                            placeholder="https://assessment.hackerearth.com/..."
                            value={rnd.test_url}
                            onChange={(e) => {
                              const updated = [...pipelineRounds];
                              updated[idx].test_url = e.target.value;
                              setPipelineRounds(updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Passkey / Access PIN</label>
                          <input
                            type="text"
                            placeholder="CB@2026"
                            value={rnd.access_code}
                            onChange={(e) => {
                              const updated = [...pipelineRounds];
                              updated[idx].access_code = e.target.value;
                              setPipelineRounds(updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none font-mono bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {rnd.round_type === 'VIRTUAL_INTERVIEW' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Google Meet / Video Link</label>
                          <input
                            type="url"
                            placeholder="https://meet.google.com/..."
                            value={rnd.meeting_url}
                            onChange={(e) => {
                              const updated = [...pipelineRounds];
                              updated[idx].meeting_url = e.target.value;
                              setPipelineRounds(updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Meeting PIN / Host Key</label>
                          <input
                            type="text"
                            placeholder="PIN-4482"
                            value={rnd.access_code}
                            onChange={(e) => {
                              const updated = [...pipelineRounds];
                              updated[idx].access_code = e.target.value;
                              setPipelineRounds(updated);
                            }}
                            className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none font-mono bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {rnd.round_type === 'OFFLINE_INTERVIEW' && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Campus Venue (Lab/Room/Cabin)</label>
                        <input
                          type="text"
                          placeholder="Academic Block 2, Computer Lab 4, Cabin 3"
                          value={rnd.venue}
                          onChange={(e) => {
                            const updated = [...pipelineRounds];
                            updated[idx].venue = e.target.value;
                            setPipelineRounds(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white"
                        />
                      </div>
                    )}

                    {/* Buffer Window Settings */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Buffer Start (Window Opens)
                        </label>
                        <input
                          type="datetime-local"
                          value={rnd.start_time || ''}
                          onChange={(e) => {
                            const updated = [...pipelineRounds];
                            updated[idx].start_time = e.target.value;
                            setPipelineRounds(updated);
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">
                          Buffer Deadline (Window Closes)
                        </label>
                        <input
                          type="datetime-local"
                          value={rnd.end_time || ''}
                          onChange={(e) => {
                            const updated = [...pipelineRounds];
                            updated[idx].end_time = e.target.value;
                            setPipelineRounds(updated);
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">Instructions / Description</label>
                      <input
                        type="text"
                        placeholder="Instructions, syllabus, or preparation materials..."
                        value={rnd.description}
                        onChange={(e) => {
                          const updated = [...pipelineRounds];
                          updated[idx].description = e.target.value;
                          setPipelineRounds(updated);
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPipelineRounds([
                    ...pipelineRounds,
                    {
                      round_number: pipelineRounds.length + 1,
                      name: `Round ${pipelineRounds.length + 1}`,
                      round_type: 'VIRTUAL_INTERVIEW',
                      description: '',
                      test_url: '',
                      meeting_url: '',
                      venue: '',
                      access_code: '',
                      start_time: '',
                      end_time: ''
                    }
                  ])}
                  className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 cursor-pointer"
                >
                  + Add Next Sequential Round
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRoundsConfigModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs transition cursor-pointer"
                  >
                    {loading ? 'Saving Pipeline...' : 'Save Dynamic Pipeline'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ROUND LOGISTICS (Spec §3 & §6) */}
      {showLogisticsModal && selectedRoundForLogistics && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Update Logistics for Round {selectedRoundForLogistics.round_number}
                </h3>
                <p className="text-xs text-gray-500">{selectedRoundForLogistics.name} ({selectedRoundForLogistics.round_type})</p>
              </div>
              <button 
                onClick={() => setShowLogisticsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLogistics} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Round Title</label>
                <input
                  type="text"
                  value={selectedRoundForLogistics.name}
                  onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {selectedRoundForLogistics.round_type === 'VIRTUAL_INTERVIEW' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Meeting URL (Google Meet / Zoom)</label>
                  <input
                    type="url"
                    value={selectedRoundForLogistics.meeting_url || ''}
                    onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, meeting_url: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none font-mono"
                  />
                </div>
              )}

              {selectedRoundForLogistics.round_type === 'ONLINE_TEST' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Assessment Test URL</label>
                  <input
                    type="url"
                    value={selectedRoundForLogistics.test_url || ''}
                    onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, test_url: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none font-mono"
                  />
                </div>
              )}

              {selectedRoundForLogistics.round_type === 'OFFLINE_INTERVIEW' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Campus Venue & Cabin</label>
                  <input
                    type="text"
                    value={selectedRoundForLogistics.venue || ''}
                    onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, venue: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none"
                  />
                </div>
              )}

              {/* Buffer Window Settings */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-900 font-extrabold text-xs">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Candidate Start Buffer Window
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Define the time range (e.g. 1:00 PM to 2:00 PM). Candidates must start the test/interview during this buffer. Once started, they are granted full test time to finish.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Window Opens (Buffer Start)</label>
                    <input
                      type="datetime-local"
                      value={selectedRoundForLogistics.start_time ? selectedRoundForLogistics.start_time.slice(0, 16) : ''}
                      onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, start_time: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Window Closes (Entry Deadline)</label>
                    <input
                      type="datetime-local"
                      value={selectedRoundForLogistics.end_time ? selectedRoundForLogistics.end_time.slice(0, 16) : ''}
                      onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, end_time: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Passkey / Access PIN</label>
                <input
                  type="text"
                  value={selectedRoundForLogistics.access_code || ''}
                  onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, access_code: e.target.value })}
                  placeholder="e.g. CB@2026 or PIN-4482"
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Instructions / Description</label>
                <textarea
                  rows="3"
                  value={selectedRoundForLogistics.description || ''}
                  onChange={(e) => setSelectedRoundForLogistics({ ...selectedRoundForLogistics, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogisticsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Logistics'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Application Deadline */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-gray-900">Manage Application Deadline</h3>
              </div>
              <button
                onClick={() => setShowDeadlineModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Set or extend the application cutoff deadline for{' '}
              <strong className="text-gray-900">{jobs.find(j => j.id === selectedJobId)?.title}</strong>.
              Students viewing this job will be marked as ineligible if this deadline has expired.
            </p>

            <form onSubmit={handleSaveDeadline} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Cutoff Date & Time (Deadline)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newDeadlineDate}
                  onChange={(e) => setNewDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Automated Enforcement:
                </p>
                <p className="text-[11px] text-blue-800">
                  Once this deadline is reached, students will be automatically marked as ineligible with a "Deadline Expired" badge, and 1-Click Apply will be locked.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeadlineModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingDeadline || !newDeadlineDate}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updatingDeadline ? 'Saving...' : 'Save Deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
