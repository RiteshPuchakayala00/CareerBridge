import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api, { getAssetUrl } from '../api';
import { formatTimeString, formatDateTime, formatTimeAgo } from '../utils/date';
import { 
  GraduationCap, Lock, CheckCircle2, AlertCircle, FileText, UploadCloud, 
  Briefcase, Sparkles, ExternalLink, RefreshCw, Send, CheckCircle, Clock, 
  MapPin, DollarSign, Calendar, AlertTriangle, ShieldCheck, Tag, Plus, X,
  Video, Laptop, Copy, Check, ArrowRight, Play, Users, Award,
  HelpCircle, MessageCircle, MessageSquare, Pin, Megaphone, Key, Eye, EyeOff
} from 'lucide-react';
import StudentNoticeBoard from '../components/StudentNoticeBoard';

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('jobs');
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [launchingAppId, setLaunchingAppId] = useState(null);

  // Application Pipeline Filters
  const [appSearch, setAppSearch] = useState('');
  const [appDateFilter, setAppDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'WEEK', 'MONTH'
  const [appStatusFilter, setAppStatusFilter] = useState('ALL'); // 'ALL', 'IN_PROGRESS', 'OFFERED', 'REJECTED'

  // Live timer tick for real-time buffer countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const getBufferStatus = (currRound) => {
    if (!currRound) return null;

    if (currRound.round_started_at) {
      const startedDate = new Date(currRound.round_started_at);
      return {
        state: 'STARTED',
        badge: 'Attempt in Progress',
        color: 'blue',
        message: `Attempt started at ${startedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Re-entry permitted.`,
        canLaunch: true,
        buttonText: currRound.round_type === 'ONLINE_TEST' ? 'Re-Enter Assessment' : 'Re-Join Interview'
      };
    }

    const wStart = currRound.window_start ? new Date(currRound.window_start).getTime() : (currRound.start_time ? new Date(currRound.start_time).getTime() : null);
    const wEnd = currRound.window_end ? new Date(currRound.window_end).getTime() : (currRound.end_time ? new Date(currRound.end_time).getTime() : null);
    const now = currentTime;

    if (wStart && wEnd) {
      if (now < wStart) {
        const diffSec = Math.max(0, Math.floor((wStart - now) / 1000));
        const hours = Math.floor(diffSec / 3600);
        const mins = Math.floor((diffSec % 3600) / 60);
        const secs = diffSec % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
        const startStr = new Date(wStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endStr = new Date(wEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          state: 'UPCOMING',
          badge: 'Window Opens Soon',
          color: 'amber',
          message: `Entry window: ${startStr} to ${endStr}. Test link unlocks in ${timeStr}.`,
          canLaunch: false,
          buttonText: `Unlocks at ${startStr} (${timeStr})`
        };
      } else if (now <= wEnd) {
        const remSec = Math.max(0, Math.floor((wEnd - now) / 1000));
        const hours = Math.floor(remSec / 3600);
        const mins = Math.floor((remSec % 3600) / 60);
        const secs = remSec % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
        const endStr = new Date(wEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          state: 'ACTIVE_BUFFER',
          badge: 'Entry Buffer Open',
          color: 'emerald',
          message: `Entry buffer active! Must start before ${endStr} (${timeStr} remaining to begin).`,
          canLaunch: true,
          buttonText: currRound.round_type === 'ONLINE_TEST' ? 'Start Assessment Now' : 'Join Virtual Room'
        };
      } else {
        const endStr = new Date(wEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          state: 'EXPIRED',
          badge: 'Round Missed (Disqualified)',
          color: 'red',
          message: `The entry buffer closed at ${endStr}. You missed the round in the given time and cannot proceed further in this placement drive.`,
          canLaunch: false,
          buttonText: 'You Missed The Round — Disqualified'
        };
      }
    }

    if (wStart && !wEnd) {
      if (now < wStart) {
        const startStr = new Date(wStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          state: 'UPCOMING',
          badge: 'Opens Soon',
          color: 'amber',
          message: `Opens at ${startStr}.`,
          canLaunch: false,
          buttonText: `Unlocks at ${startStr}`
        };
      }
      return {
        state: 'ACTIVE_BUFFER',
        badge: 'Active',
        color: 'emerald',
        message: 'Assessment is currently active.',
        canLaunch: true,
        buttonText: currRound.round_type === 'ONLINE_TEST' ? 'Launch Assessment' : 'Join Interview'
      };
    }

    return {
      state: 'NO_RESTRICTION',
      badge: 'Open Access',
      color: 'emerald',
      message: 'Assessment link is available.',
      canLaunch: true,
      buttonText: currRound.button_label || (currRound.round_type === 'ONLINE_TEST' ? 'Launch Assessment' : 'Join Interview')
    };
  };

  const handleLaunchRound = async (app, currRound) => {
    const buf = getBufferStatus(currRound);
    if (!buf || !buf.canLaunch) {
      if (buf && buf.state === 'UPCOMING') {
        showNotification(buf.message || 'The start window has not opened yet.', true);
      } else if (buf && buf.state === 'EXPIRED') {
        showNotification(buf.message || 'The start buffer window has closed.', true);
      }
      return;
    }

    setLaunchingAppId(app.id);
    try {
      const res = await api.post(`/applications/${app.id}/launch`);
      const launchUrl = res.data.launch_url || currRound.launch_url || currRound.test_url || currRound.meeting_url;

      // Update state locally so UI marks attempt as started immediately
      setApplications(prev => prev.map(a => {
        if (a.id === app.id && a.current_round) {
          return {
            ...a,
            current_round: {
              ...a.current_round,
              round_started_at: res.data.round_started_at || new Date().toISOString()
            }
          };
        }
        return a;
      }));

      showNotification(res.data.message || 'Round launched successfully within entry buffer window.');

      if (launchUrl) {
        window.open(launchUrl, '_blank');
      }
    } catch (err) {
      console.error('Launch verification error:', err);
      showNotification(err.response?.data?.detail || 'Failed to start round. Please try again.', true);
    } finally {
      setLaunchingAppId(null);
    }
  };

  // Enrichment Form state
  const [enrichForm, setEnrichForm] = useState({

    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    contact_number: '',
    bio: ''
  });

  // Skills state
  const [skillInput, setSkillInput] = useState('');
  const [pendingSkills, setPendingSkills] = useState([]);

  // Resume Upload state
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  // Doubt Desk & Drive FAQ State (Spec: docs/messaging_and_inquiry_system_spec.md)
  const [studentThreads, setStudentThreads] = useState([]);
  const [selectedDoubtId, setSelectedDoubtId] = useState(null);
  const [doubtDetail, setDoubtDetail] = useState(null);
  const [doubtReply, setDoubtReply] = useState('');
  const [sendingDoubtReply, setSendingDoubtReply] = useState(false);

  // Ask Doubt Modal
  const [askDoubtOpen, setAskDoubtOpen] = useState(false);
  const [doubtForm, setDoubtForm] = useState({ job_id: null, job_title: '', subject: '', message: '' });

  // Drive FAQs Modal
  const [faqsModalOpen, setFaqsModalOpen] = useState(false);
  const [faqsJob, setFaqsJob] = useState({ id: null, title: '', faqs: [] });
  const [loadingFaqs, setLoadingFaqs] = useState(false);

  // Account Security & Password State (Hybrid Google SSO + Manual Password)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [showSecurityPwd, setShowSecurityPwd] = useState(false);

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
      const res = await api.get('/student/profile');
      setProfile(res.data);
      setEnrichForm({
        linkedin_url: res.data.linkedin_url || '',
        github_url: res.data.github_url || '',
        portfolio_url: res.data.portfolio_url || '',
        contact_number: res.data.contact_number || '',
        bio: res.data.bio || ''
      });
      if (res.data.skills_list && Array.isArray(res.data.skills_list)) {
        setPendingSkills(res.data.skills_list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await api.get('/student/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get('/student/applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudentThreads = async () => {
    try {
      const res = await api.get('/messages/threads');
      setStudentThreads(res.data);
      if (res.data.length > 0 && !selectedDoubtId) {
        setSelectedDoubtId(res.data[0].id);
      }
    } catch (err) {
      console.error("Error fetching doubts:", err);
    }
  };

  const fetchDoubtDetail = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/messages/threads/${id}`);
      setDoubtDetail(res.data);
    } catch (err) {
      console.error("Error fetching doubt detail:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchJobs();
    fetchApplications();
    fetchStudentThreads();
  }, []);

  useEffect(() => {
    if (activeTab === 'doubts') {
      fetchStudentThreads();
      const interval = setInterval(fetchStudentThreads, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedDoubtId) {
      fetchDoubtDetail(selectedDoubtId);
    }
  }, [selectedDoubtId]);

  const handleOpenAskDoubt = (job = null) => {
    setDoubtForm({
      job_id: job ? job.id : null,
      job_title: job ? job.title : 'General Placement Query',
      subject: '',
      message: ''
    });
    setAskDoubtOpen(true);
  };

  const handleOpenFaqs = async (job) => {
    setFaqsJob({ id: job.id, title: job.title, faqs: [] });
    setFaqsModalOpen(true);
    setLoadingFaqs(true);
    try {
      const res = await api.get(`/jobs/${job.id}/faqs`);
      setFaqsJob({ id: job.id, title: job.title, faqs: res.data });
    } catch (err) {
      showNotification("Failed to load drive FAQs", true);
    } finally {
      setLoadingFaqs(false);
    }
  };

  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    if (!doubtForm.subject || !doubtForm.message) {
      showNotification("Please fill out subject and question", true);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/messages/threads', {
        job_id: doubtForm.job_id,
        thread_type: 'STUDENT_COORDINATOR',
        subject: doubtForm.subject,
        initial_message: doubtForm.message
      });
      showNotification("Doubt submitted to Department Coordinator! You will receive updates here.");
      setAskDoubtOpen(false);
      setDoubtForm({ job_id: null, job_title: '', subject: '', message: '' });
      await fetchStudentThreads();
      setSelectedDoubtId(res.data.id);
      setActiveTab('doubts');
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to submit doubt", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSendDoubtReply = async (e) => {
    e.preventDefault();
    if (!doubtReply.trim() || !selectedDoubtId) return;
    setSendingDoubtReply(true);
    try {
      await api.post(`/messages/threads/${selectedDoubtId}/messages`, { content: doubtReply });
      setDoubtReply('');
      await fetchDoubtDetail(selectedDoubtId);
      await fetchStudentThreads();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Failed to send reply", true);
    } finally {
      setSendingDoubtReply(false);
    }
  };

  const handleAddSkill = (skillText) => {
    const val = (skillText || skillInput).trim();
    if (!val) return;
    if (!pendingSkills.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
      setPendingSkills([...pendingSkills, val]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setPendingSkills(pendingSkills.filter(s => s !== skillToRemove));
  };

  // Save Enrichment
  const handleSaveEnrichment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/student/profile', {
        ...enrichForm,
        skills_list: pendingSkills
      });
      showNotification("Profile enrichment details and skills saved.");
      fetchProfile();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Save failed", true);
    } finally {
      setLoading(false);
    }
  };

  // Upload Resume PDF
  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) return;
    const formData = new FormData();
    formData.append('file', resumeFile);
    setUploadingResume(true);
    try {
      const res = await api.post('/student/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showNotification("Resume PDF uploaded successfully!");
      setResumeFile(null);
      fetchProfile();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Resume upload failed", true);
    } finally {
      setUploadingResume(false);
    }
  };

  // Apply to Job
  const handleApply = async (jobId) => {
    if (!profile?.resume_url) {
      showNotification("Resume required! Please upload your resume in the 'Profile Enrichment & Resume' tab before applying for placement drives.", true);
      setActiveTab('profile');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`/student/apply/${jobId}`);
      showNotification(res.data.message);
      fetchApplications();
      fetchJobs();
    } catch (err) {
      showNotification(err.response?.data?.detail || "Application failed", true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        new_password: newPassword
      });
      setPasswordSuccess("Password updated successfully! You can now sign in using both Google SSO and email & password.");
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 6000);
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const appliedJobIds = new Set(applications.map(a => a.job_id));

  const filteredApplications = applications.filter(app => {
    if (appStatusFilter !== 'ALL') {
      if (appStatusFilter === 'IN_PROGRESS' && (app.status === 'REJECTED' || app.status === 'OFFERED')) return false;
      if (appStatusFilter === 'OFFERED' && app.status !== 'OFFERED') return false;
      if (appStatusFilter === 'REJECTED' && app.status !== 'REJECTED') return false;
    }
    if (appSearch.trim()) {
      const q = appSearch.toLowerCase();
      const matchComp = app.company_name?.toLowerCase().includes(q);
      const matchTitle = app.title?.toLowerCase().includes(q);
      const matchRole = app.role_designation?.toLowerCase().includes(q);
      if (!matchComp && !matchTitle && !matchRole) return false;
    }
    if (appDateFilter !== 'ALL' && app.applied_at) {
      const d = new Date(app.applied_at);
      const now = new Date();
      if (appDateFilter === 'TODAY') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (d < startOfToday) return false;
      } else if (appDateFilter === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (d < weekAgo) return false;
      } else if (appDateFilter === 'MONTH') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (d < monthAgo) return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

        {/* TOP SECTION: LOCKED ACADEMIC CREDENTIALS (Spec §5.C.1) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">Student Placement Record</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Institutional Verified 🔒
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Official academic credentials are synchronized directly with the university master roster and locked against unauthorized edits.
                </p>
              </div>
            </div>

            <button 
              onClick={() => { fetchProfile(); fetchJobs(); fetchApplications(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>

          {/* Locked Credential Pills */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Roll Number</span>
              <span className="font-mono font-bold text-sm text-gray-900 mt-0.5 block">{profile?.roll_number || 'N/A'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Department</span>
              <span className="font-bold text-sm text-gray-900 mt-0.5 block">{profile?.department || 'N/A'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Graduation Batch</span>
              <span className="font-bold text-sm text-gray-900 mt-0.5 block">{profile?.graduation_year || 'N/A'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Verified CGPA</span>
              <span className="font-bold text-sm text-emerald-600 mt-0.5 block">{profile?.cgpa ?? 'N/A'}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Active Backlogs</span>
              <span className="font-bold text-sm text-gray-900 mt-0.5 block">{profile?.active_backlogs ?? 0}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Placement Status</span>
              <span className={`font-bold text-sm mt-0.5 block ${profile?.is_placed ? 'text-emerald-600' : 'text-amber-600'}`}>
                {profile?.is_placed ? 'Placed ✓' : 'Seeking Drive'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto space-x-1 sm:space-x-4 bg-white px-4 py-2 rounded-xl shadow-xs">
          {[
            { id: 'jobs', label: 'Campus Placement Drives', icon: Briefcase },
            { id: 'applications', label: 'My Applications & Pipeline', icon: Clock },
            { id: 'profile', label: 'Profile Enrichment & Resume', icon: FileText },
            { 
              id: 'doubts', 
              label: 'My Inquiries & Doubt Desk', 
              icon: HelpCircle,
              badge: studentThreads.filter(t => t.unread_count > 0).length
            },
            {
              id: 'notices',
              label: 'Notices & Circulars',
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
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                    isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CAMPUS PLACEMENT DRIVES */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Active Campus Recruitment Drives</h3>
                {profile?.department && (
                  <p className="text-xs text-blue-700 font-semibold mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                    Showing drives curated for <span className="underline decoration-blue-400">{profile.department}</span> branch (other branches filtered out)
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500">Eligibility verified against your academic record</span>
            </div>

            {/* Resume Missing Pre-requisite Notice */}
            {!profile?.resume_url && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Pre-Uploaded Resume Required</h4>
                    <p className="text-xs text-amber-700">You must upload your resume PDF before applying to any campus placement drive.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition self-start sm:self-auto cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Upload Resume Now
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {jobs
                .filter(job => {
                  if (!job.eligible_departments || job.eligible_departments.length === 0) return true;
                  if (!profile?.department) return true;
                  return job.eligible_departments.some(d => d.trim().toUpperCase() === profile.department.trim().toUpperCase());
                })
                .map(job => {
                const hasApplied = appliedJobIds.has(job.id);
                const isDeadlinePassed = job.is_deadline_passed || (job.deadline && new Date(job.deadline) < new Date());

                return (
                  <div 
                    key={job.id}
                    className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                      hasApplied
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isDeadlinePassed
                        ? 'border-amber-200/80 bg-gray-50/70 opacity-85'
                        : job.is_eligible 
                        ? 'border-gray-200 hover:border-blue-300 hover:shadow-md' 
                        : 'border-gray-200 bg-gray-50/60 opacity-80'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800">
                          {job.company_name || 'Enterprise'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            🎓 {job.target_batch_year ? `${job.target_batch_year} Batch` : 'All Batches'}
                          </span>
                          {isDeadlinePassed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" /> DEADLINE PASSED
                            </span>
                          )}
                          {job.is_eligible && !isDeadlinePassed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5" /> ELIGIBLE
                            </span>
                          ) : !hasApplied && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              <AlertTriangle className="w-3.5 h-3.5" /> INELIGIBLE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & CTC */}
                      <h4 className="text-lg font-bold text-gray-900">{job.title}</h4>
                      <p className="text-sm font-semibold text-blue-600 mt-1">
                        {job.ctc_lpa ? `${job.ctc_lpa} LPA Full-Time` : `${job.stipend_monthly || 25000}/mo Internship`}
                      </p>

                      {/* Ineligibility Reason Callout */}
                      {!job.is_eligible && job.ineligibility_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                          <span className="font-semibold block mb-0.5">Eligibility Notice:</span>
                          {job.ineligibility_reason}
                        </div>
                      )}

                      {/* Job Metadata */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="text-gray-400">Min CGPA:</span> <span className="font-semibold text-gray-800">{job.eligibility_cgpa}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Max Backlogs:</span> <span className="font-semibold text-gray-800">{job.max_backlogs}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Target Depts:</span> <span className="font-semibold text-gray-800">{job.eligible_departments?.join(', ') || 'All'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Target Batch:</span>{' '}
                          <span className="font-semibold text-gray-800">
                            {job.target_batch_year ? `${job.target_batch_year} Passouts` : 'All Batches'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Drive Date:</span> <span className="font-semibold text-gray-800">{job.drive_date ? new Date(job.drive_date).toLocaleDateString() : 'TBD'}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-gray-100">
                          <span className="text-gray-400">Application Deadline:</span>{' '}
                          <span className={`font-semibold ${isDeadlinePassed ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                            {job.deadline ? new Date(job.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Open'}
                            {isDeadlinePassed ? ' (Expired)' : ''}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-gray-500 line-clamp-2">
                        {job.description || 'Full-time campus placement opportunity with competitive benefits and performance incentives.'}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                      {hasApplied ? (
                        <div className="w-full py-2.5 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                          ✓ Application Submitted
                        </div>
                      ) : isDeadlinePassed ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Clock className="w-4 h-4 text-gray-400" /> Application Deadline Closed
                        </button>
                      ) : !profile?.resume_url && job.is_eligible ? (
                        <button
                          onClick={() => {
                            showNotification("Please upload your resume in the 'Profile Enrichment & Resume' tab before applying.", true);
                            setActiveTab('profile');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-xs bg-amber-500 hover:bg-amber-600 text-white cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <UploadCloud className="w-4 h-4" /> Upload Resume to Apply
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApply(job.id)}
                          disabled={!job.is_eligible || loading}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                        >
                          {job.is_eligible ? '1-Click Apply with Verified Resume' : 'Ineligible for this Opening'}
                        </button>
                      )}

                      {/* Contextual Inquiries & Drive FAQs (Spec §6.A.1) */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenAskDoubt(job)}
                          className="py-1.5 px-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600" /> Ask Coordinator
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenFaqs(job)}
                          className="py-1.5 px-2.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Pin className="w-3.5 h-3.5 text-amber-600" /> Drive FAQs
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {jobs.length === 0 && (
                <div className="col-span-2 bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-500">
                  No approved recruitment drives available at this time. Please check back soon.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY APPLICATIONS & DYNAMIC ROUND PIPELINE (Spec §3 & §4) */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            {profile?.is_placed ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-950 flex items-center gap-2">
                      Placement Secured & Verified 🔒
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Congratulations! You have secured an official campus placement offer. Under the university One-Offer Policy, participation in other drives has been gracefully concluded to open opportunities for your batchmates.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">My Recruitment Drives & Round Pipeline</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Real-time interview stage tracking, test links, Google Meet virtual rooms, and instant rejection transparency.
                </p>
              </div>
              <button
                onClick={() => fetchApplications()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync Rounds
              </button>
            </div>

            {/* Filter and Date Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-5 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by company or role..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {appSearch && (
                    <button 
                      onClick={() => setAppSearch('')} 
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="md:col-span-4 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={appDateFilter}
                    onChange={(e) => setAppDateFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="ALL">All Application Dates</option>
                    <option value="TODAY">Applied Today</option>
                    <option value="WEEK">Past 7 Days</option>
                    <option value="MONTH">Past 30 Days</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={appStatusFilter}
                    onChange={(e) => setAppStatusFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="ALL">All Stages ({applications.length})</option>
                    <option value="IN_PROGRESS">Active Pipeline</option>
                    <option value="OFFERED">Offers Secured</option>
                    <option value="REJECTED">Archived / Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {filteredApplications.map(app => {
                const currRound = app.current_round;
                const buffer = getBufferStatus(currRound);
                const isRejected = app.status === 'REJECTED';
                const isOffered = app.status === 'OFFERED';
                const hasRounds = app.all_rounds && app.all_rounds.length > 0;

                return (
                  <div 
                    key={app.id} 
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:border-gray-300 transition space-y-6 p-6"
                  >
                    {/* Top Job Banner */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            {app.company_name}
                          </span>
                          {app.location && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              • <MapPin className="w-3 h-3" /> {app.location}
                            </span>
                          )}
                          {app.ctc_lpa && (
                            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                              {app.ctc_lpa} LPA
                            </span>
                          )}
                        </div>
                        <h4 className="text-xl font-black text-gray-900 mt-1">{app.job_title}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                          <span>Applied on {app.applied_at ? formatDateTime(app.applied_at, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                          {app.ai_match_score && (
                            <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              <Sparkles className="w-3 h-3 text-purple-600" /> Match: {app.ai_match_score}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isOffered ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                            <Award className="w-4 h-4 text-emerald-600" /> Official Offer Extended 🎉
                          </span>
                        ) : isRejected ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-2xs ${
                            app.rejection_reason && app.rejection_reason.includes('One-Offer')
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-red-100 text-red-900 border border-red-300'
                          }`}>
                            {app.rejection_reason && app.rejection_reason.includes('One-Offer') ? (
                              <>
                                <Lock className="w-4 h-4 text-amber-600" /> Concluded (One-Offer Policy)
                              </>
                            ) : app.rejection_reason && (app.rejection_reason.includes('missed') || app.rejection_reason.includes('Missed')) ? (
                              <>
                                <X className="w-4 h-4 text-red-600" /> Disqualified — Missed Round {app.rejection_round_number || 1}
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 text-red-600" /> Eliminated at Round {app.rejection_round_number || 1}
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" /> Shortlisted for Round {currRound?.round_number || 1} ⚡
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DYNAMIC ROUND PIPELINE STEPPER (Spec §2) */}
                    {hasRounds && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          Recruitment Drive Pipeline Progress
                        </span>
                        <div className="flex items-center overflow-x-auto py-2">
                          {app.all_rounds.map((rnd, idx) => {
                            const isCleared = !isRejected && (
                              isOffered || 
                              (currRound && rnd.round_number < currRound.round_number)
                            );
                            const isCurrent = !isRejected && !isOffered && currRound?.round_number === rnd.round_number;
                            const isFailed = isRejected && rnd.round_number === (app.rejection_round_number || 1);

                            return (
                              <React.Fragment key={rnd.id || idx}>
                                <div className="flex flex-col items-center flex-shrink-0 min-w-[110px]">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                    isCleared 
                                      ? 'bg-emerald-600 text-white shadow-2xs' 
                                      : isCurrent 
                                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-xs' 
                                      : isFailed 
                                      ? 'bg-red-600 text-white ring-4 ring-red-100' 
                                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                                  }`}>
                                    {isCleared ? '✓' : isFailed ? '✕' : rnd.round_number}
                                  </div>
                                  <span className={`text-[11px] font-bold mt-1 text-center max-w-[120px] truncate ${
                                    isCurrent ? 'text-blue-700' : isCleared ? 'text-emerald-700' : isFailed ? 'text-red-700' : 'text-gray-400'
                                  }`}>
                                    {rnd.name}
                                  </span>
                                  <span className="text-[9px] font-semibold text-gray-400 uppercase">
                                    {rnd.round_type.replace('_', ' ')}
                                  </span>
                                </div>
                                {idx < app.all_rounds.length - 1 && (
                                  <div className={`flex-1 h-1 min-w-[20px] rounded transition ${
                                    isCleared && (!currRound || rnd.round_number < currRound.round_number) 
                                      ? 'bg-emerald-500' 
                                      : 'bg-gray-200'
                                  }`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TRANSPARENT REJECTION CLOSURE CARD (Spec §1.3 & §4 & Missed Round Enforcement) */}
                    {isRejected && (
                      <div className={`p-5 rounded-xl border space-y-3 ${
                        app.rejection_reason && app.rejection_reason.includes('One-Offer')
                          ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200 text-amber-900'
                          : app.rejection_reason && (app.rejection_reason.includes('missed') || app.rejection_reason.includes('Missed'))
                          ? 'bg-gradient-to-br from-red-50 via-white to-red-50/40 border-2 border-red-300 text-red-950 shadow-xs'
                          : 'bg-gradient-to-br from-red-50 to-white border-red-200'
                      }`}>
                        <div className={`flex items-center gap-2 font-black text-sm ${
                          app.rejection_reason && app.rejection_reason.includes('One-Offer')
                            ? 'text-amber-900'
                            : 'text-red-900'
                        }`}>
                          {app.rejection_reason && app.rejection_reason.includes('One-Offer') ? (
                            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )}
                          <span>
                            {app.rejection_reason && app.rejection_reason.includes('One-Offer')
                              ? 'Drive Concluded — University One-Offer Policy'
                              : app.rejection_reason && (app.rejection_reason.includes('missed') || app.rejection_reason.includes('Missed'))
                              ? 'Drive Disqualification — Missed Round'
                              : 'Drive Participation Closure Notice'}
                          </span>
                        </div>

                        {app.rejection_reason && (app.rejection_reason.includes('missed') || app.rejection_reason.includes('Missed')) ? (
                          <div className="p-3.5 bg-red-100/90 rounded-xl border border-red-200 space-y-1.5">
                            <h6 className="text-sm font-black text-red-900 flex items-center gap-2">
                              ⛔ You missed the round in the given time. You cannot proceed further.
                            </h6>
                            <p className="text-xs text-red-800 font-medium leading-relaxed">
                              {app.rejection_reason}
                            </p>
                          </div>
                        ) : (
                          <p className={`text-xs leading-relaxed font-medium ${
                            app.rejection_reason && app.rejection_reason.includes('One-Offer')
                              ? 'text-amber-800'
                              : 'text-red-800'
                          }`}>
                            {app.rejection_reason || `You were not shortlisted for Round ${app.rejection_round_number || 1}.`}
                          </p>
                        )}

                        <p className="text-xs text-gray-600 pt-0.5">
                          {app.rejection_reason && app.rejection_reason.includes('One-Offer')
                            ? 'Under university policy, securing an official placement offer locks your placement and automatically withdraws active participation in other drives to ensure equal opportunities for all graduating peers.'
                            : app.rejection_reason && (app.rejection_reason.includes('missed') || app.rejection_reason.includes('Missed'))
                            ? 'Drive regulations require attending assessments and interviews within the recruiter buffer window. Since this round was not entered within the given timeframe, participation in this drive is closed.'
                            : 'In accordance with campus placement transparency policy, unselected candidates are notified immediately so you have full clarity and can direct all energy toward upcoming placement drives.'}
                        </p>
                      </div>
                    )}

                    {/* ACTIVE ROUND CARD & LINK DELIVERY (Spec §3 & Buffer Window Feature) */}
                    {!isRejected && !isOffered && currRound && (
                      <div className="p-5 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 rounded-xl border-2 border-blue-200 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                              {currRound.round_type === 'ONLINE_TEST' ? (
                                <Laptop className="w-5 h-5" />
                              ) : currRound.round_type === 'VIRTUAL_INTERVIEW' ? (
                                <Video className="w-5 h-5" />
                              ) : currRound.round_type === 'OFFLINE_INTERVIEW' ? (
                                <MapPin className="w-5 h-5" />
                              ) : (
                                <Users className="w-5 h-5" />
                              )}
                            </span>
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                                Round {currRound.round_number} Assessment Card
                              </span>
                              <h5 className="text-base font-extrabold text-gray-900">
                                {currRound.name}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Live Buffer Status Badge */}
                            {buffer && (
                              <span className={`text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs ${
                                buffer.state === 'ACTIVE_BUFFER'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : buffer.state === 'UPCOMING'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : buffer.state === 'STARTED'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : buffer.state === 'EXPIRED'
                                  ? 'bg-red-100 text-red-900 border border-red-300'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {buffer.state === 'ACTIVE_BUFFER' && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                                )}
                                {buffer.state === 'UPCOMING' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                                {buffer.state === 'STARTED' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                                {buffer.state === 'EXPIRED' && <Lock className="w-3.5 h-3.5 text-red-600" />}
                                {buffer.badge}
                              </span>
                            )}

                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                              currRound.round_type === 'ONLINE_TEST' ? 'bg-purple-100 text-purple-800' :
                              currRound.round_type === 'VIRTUAL_INTERVIEW' ? 'bg-blue-100 text-blue-800' :
                              currRound.round_type === 'OFFLINE_INTERVIEW' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {currRound.round_type === 'ONLINE_TEST' ? 'Online Coding Assessment' :
                               currRound.round_type === 'VIRTUAL_INTERVIEW' ? 'Virtual Video Interview' :
                               currRound.round_type === 'OFFLINE_INTERVIEW' ? 'On-Campus Face-to-Face' : 'Group Assessment'}
                            </span>
                          </div>
                        </div>

                        {/* BUFFER WINDOW CALLOUT BANNER */}
                        {buffer && (
                          <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            buffer.state === 'ACTIVE_BUFFER'
                              ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-emerald-200 text-emerald-950'
                              : buffer.state === 'UPCOMING'
                              ? 'bg-gradient-to-r from-amber-50 to-white border-amber-200 text-amber-950'
                              : buffer.state === 'STARTED'
                              ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200 text-blue-950'
                              : buffer.state === 'EXPIRED'
                              ? 'bg-gradient-to-r from-red-500/10 via-red-50 to-white border-2 border-red-300 text-red-950'
                              : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}>
                            <div className="flex items-start gap-2.5">
                              <span className={`p-1.5 rounded-lg text-white mt-0.5 flex-shrink-0 ${
                                buffer.state === 'ACTIVE_BUFFER' ? 'bg-emerald-600' :
                                buffer.state === 'UPCOMING' ? 'bg-amber-600' :
                                buffer.state === 'STARTED' ? 'bg-blue-600' :
                                buffer.state === 'EXPIRED' ? 'bg-red-600' : 'bg-gray-600'
                              }`}>
                                {buffer.state === 'ACTIVE_BUFFER' && <Clock className="w-4 h-4" />}
                                {buffer.state === 'UPCOMING' && <Lock className="w-4 h-4" />}
                                {buffer.state === 'STARTED' && <CheckCircle2 className="w-4 h-4" />}
                                {buffer.state === 'EXPIRED' && <AlertTriangle className="w-4 h-4" />}
                              </span>
                              <div>
                                <p className="text-xs font-black">
                                  {buffer.state === 'ACTIVE_BUFFER' ? '⏱️ Entry Buffer Active — Start Assessment' :
                                   buffer.state === 'UPCOMING' ? '🔒 Assessment Locked — Window Opens Soon' :
                                   buffer.state === 'STARTED' ? '✅ Assessment Session In Progress' :
                                   buffer.state === 'EXPIRED' ? '⛔ You missed the round in the given time. You cannot proceed further.' : 'Assessment Logistics'}
                                </p>
                                <p className="text-[11px] leading-relaxed mt-0.5 opacity-90 font-medium">
                                  {buffer.message}
                                </p>
                              </div>
                            </div>
                            {currRound.window_start && currRound.window_end && (
                              <div className="text-[11px] font-mono font-bold bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200/80 shadow-2xs self-start sm:self-auto flex items-center gap-1.5 text-gray-700">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                Buffer: {new Date(currRound.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(currRound.window_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Logistics Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                          {/* Scheduled Time / Slot */}
                          <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Scheduled Time / Slot
                            </span>
                            <p className="font-bold text-xs text-gray-900">
                              {currRound.scheduled_slot ? (
                                new Date(currRound.scheduled_slot).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                              ) : currRound.start_time ? (
                                new Date(currRound.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                              ) : 'Schedule announced soon'}
                            </p>
                          </div>

                          {/* Access Code / Passkey */}
                          {currRound.access_code && (
                            <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block flex items-center gap-1">
                                <Key className="w-3 h-3" /> Passkey / Access PIN
                              </span>
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-gray-900">{currRound.access_code}</span>
                                <button
                                  onClick={() => handleCopyCode(currRound.access_code)}
                                  className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Copy Passkey"
                                >
                                  {copiedCode === currRound.access_code ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" /> Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> Copy
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Campus Venue if Offline */}
                          {currRound.venue && (
                            <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-1 sm:col-span-2 lg:col-span-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Campus Venue
                              </span>
                              <p className="font-bold text-xs text-gray-900">{currRound.venue}</p>
                            </div>
                          )}
                        </div>

                        {/* Instructions & Guidelines */}
                        {currRound.description && (
                          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-900">
                            <span className="font-bold">Instructions & Syllabus: </span>
                            {currRound.description}
                          </div>
                        )}

                        {/* Action Buttons for Link Launching */}
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs text-gray-500">
                            {currRound.round_type === 'VIRTUAL_INTERVIEW' ? (
                              '⚠️ Video link activates 10 minutes prior to your allocated interview slot.'
                            ) : currRound.round_type === 'ONLINE_TEST' ? (
                              '⚠️ Please launch within your specified buffer window. Once started, you have full allocated test time.'
                            ) : (
                              '⚠️ Please report 15 minutes before slot with printed resumes and College ID.'
                            )}
                          </p>

                          {currRound.launch_url ? (
                            buffer && !buffer.canLaunch ? (
                              <button
                                type="button"
                                onClick={() => handleLaunchRound(app, currRound)}
                                disabled={buffer.state === 'EXPIRED'}
                                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs border transition ${
                                  buffer.state === 'UPCOMING'
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 cursor-pointer'
                                    : 'bg-red-100 text-red-900 border border-red-300 opacity-90 cursor-not-allowed shadow-2xs'
                                }`}
                                title={buffer.message}
                              >
                                <Lock className={`w-4 h-4 ${buffer.state === 'EXPIRED' ? 'text-red-600' : 'text-amber-600'}`} />
                                {buffer.state === 'EXPIRED' ? 'You Missed The Round — Disqualified' : buffer.buttonText}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleLaunchRound(app, currRound)}
                                disabled={launchingAppId === app.id}
                                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer text-white ${
                                  currRound.round_type === 'ONLINE_TEST' 
                                    ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                }`}
                              >
                                {launchingAppId === app.id ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Entry Window...
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="w-4 h-4" />
                                    {buffer?.buttonText || currRound.button_label || 'Launch Assessment / Interview'}
                                  </>
                                )}
                              </button>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-100 px-4 py-2 rounded-xl">
                              <Clock className="w-3.5 h-3.5" /> Awaiting link publication
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredApplications.length === 0 && applications.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 space-y-2">
                  <Briefcase className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">No applications match your filter.</p>
                  <button
                    onClick={() => { setAppSearch(''); setAppDateFilter('ALL'); setAppStatusFilter('ALL'); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}

              {applications.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                  <Briefcase className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">You haven't applied to any campus drives yet.</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Browse open placement and internship opportunities under "Campus Placement Drives" and apply to start your interview pipeline.
                  </p>
                  <button
                    onClick={() => setActiveTab('jobs')}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    View Campus Placement Drives <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* TAB 3: PROFILE ENRICHMENT & RESUME */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume Upload Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs h-fit space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Resume PDF Document</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Upload your latest PDF resume. Recruiters and the Gemini AI screening engine analyze this document during drive shortlisting.
                </p>
              </div>

              {profile?.resume_url ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Official Resume Active</p>
                      <span className="text-xs text-blue-700">Stored on CareerBridge Cloud</span>
                    </div>
                  </div>
                  <a
                    href={getAssetUrl(profile.resume_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    View PDF
                  </a>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  ⚠️ No resume uploaded yet. You cannot apply to campus drives without an uploaded PDF resume.
                </div>
              )}

              <form onSubmit={handleResumeUpload} className="space-y-3">
                <input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg p-1"
                />
                <button
                  type="submit"
                  disabled={!resumeFile || uploadingResume}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-xs transition shadow-xs"
                >
                  {uploadingResume ? 'Uploading Document...' : 'Upload & Set Active Resume'}
                </button>
              </form>
            </div>

            {/* Technical Skills & AI Match Tags Card (Spec §3.B & §5.C.2) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs h-fit space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-blue-600" /> Technical Skills & Tags
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-parsed by Gemini AI & manually added skill tags. Used by AI matching algorithms for job recommendations.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600" /> AI-Indexed
                </span>
              </div>

              {/* Skills Tag Cloud */}
              <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-gray-50 rounded-xl border border-gray-200">
                {pendingSkills.map(skill => (
                  <span 
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white text-blue-800 border border-blue-200 shadow-2xs group"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-gray-400 hover:text-red-500 rounded-full transition"
                      title="Remove skill"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                {pendingSkills.length === 0 && (
                  <span className="text-xs text-gray-400 italic">No skill tags added yet. Type below or pick suggested skills.</span>
                )}
              </div>

              {/* Add Skill Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add skill (e.g., Python, React, Docker)..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Quick Suggestion Pills */}
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">Suggested Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Python', 'React', 'JavaScript', 'Node.js', 'SQL', 'FastAPI', 'Docker', 'Machine Learning', 'AWS', 'Java', 'Git'].map(sug => {
                    const isAdded = pendingSkills.map(s => s.toLowerCase()).includes(sug.toLowerCase());
                    return (
                      <button
                        key={sug}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddSkill(sug)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition ${
                          isAdded 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default' 
                            : 'bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 border-gray-200'
                        }`}
                      >
                        + {sug}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Profile Enrichment Form */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs h-fit">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Candidate Profile Enrichment</h3>
              <p className="text-xs text-gray-500 mb-4">
                Enrich your profile with online portfolios and personal contact info.
              </p>
              <form onSubmit={handleSaveEnrichment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={enrichForm.linkedin_url}
                    onChange={(e) => setEnrichForm({ ...enrichForm, linkedin_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">GitHub Profile URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={enrichForm.github_url}
                    onChange={(e) => setEnrichForm({ ...enrichForm, github_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Portfolio / Personal Website</label>
                  <input
                    type="url"
                    placeholder="https://myportfolio.dev"
                    value={enrichForm.portfolio_url}
                    onChange={(e) => setEnrichForm({ ...enrichForm, portfolio_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Contact Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={enrichForm.contact_number}
                    onChange={(e) => setEnrichForm({ ...enrichForm, contact_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Short Professional Bio</label>
                  <textarea
                    rows="3"
                    placeholder="Computer Science undergraduate passionate about full-stack systems, distributed computing, and machine learning..."
                    value={enrichForm.bio}
                    onChange={(e) => setEnrichForm({ ...enrichForm, bio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition shadow-xs cursor-pointer"
                >
                  {loading ? 'Saving Profile...' : 'Save Profile Enrichment'}
                </button>
              </form>
            </div>

            {/* Account Security & Password Setup Card (Option 2: Hybrid Login Support) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs h-fit space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" /> Account Security & Password
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Set or update your personal password. This allows you to log in via either Google SSO or your email & password.
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showSecurityPwd ? "text" : "password"}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecurityPwd(!showSecurityPwd)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                    >
                      {showSecurityPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Confirm New Password</label>
                  <input
                    type={showSecurityPwd ? "text" : "password"}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[11px] text-blue-800">
                  💡 <strong>Dual Login:</strong> Setting a password lets you sign in manually with email + password, while retaining instant Google SSO access.
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition shadow-xs cursor-pointer"
                >
                  {savingPassword ? 'Updating Password...' : 'Save Account Password'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: MY INQUIRIES & DOUBT DESK (Spec §2 & §6.A) */}
        {activeTab === 'doubts' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Student Doubt Desk & Coordinator Inquiries</h3>
                  <p className="text-xs text-gray-500">
                    Direct confidential questions to Department Staff. The Shield Principle protects candidates from recruiter bias.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAskDoubt()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition"
                >
                  <Plus className="w-3.5 h-3.5" /> + Ask a Doubt
                </button>
                <button
                  onClick={fetchStudentThreads}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                  title="Refresh Doubts"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px] max-h-[700px]">
              {/* Left Pane: Inquiries List (4 cols) */}
              <div className="lg:col-span-5 border-r border-gray-200 flex flex-col h-full bg-gray-50/40">
                <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">My Question Threads</span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {studentThreads.length} Total
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1.5">
                  {studentThreads.map(t => {
                    const isSelected = selectedDoubtId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedDoubtId(t.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-200/50 shadow-xs'
                            : 'bg-white border-gray-200/80 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-800 bg-blue-100 truncate max-w-[180px]">
                            {t.job_title || 'General Placement'}
                          </span>

                          <div className="flex items-center gap-1">
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
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Unread response" />
                            )}
                          </div>
                        </div>

                        <h4 className="font-bold text-gray-900 text-xs line-clamp-2">{t.subject}</h4>

                        {t.last_message && (
                          <p className="text-[11px] text-gray-500 line-clamp-1 mt-1">
                            {t.last_message}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-1 border-t border-gray-100">
                          <span>Coordinator: {t.coordinator_name || 'Department Staff'}</span>
                          <span>{t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    );
                  })}

                  {studentThreads.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                      <p>You haven't asked any placement doubts yet.</p>
                      <button
                        onClick={() => handleOpenAskDoubt()}
                        className="text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        + Submit your first question now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: Thread Conversation (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full bg-white">
                {doubtDetail ? (
                  <>
                    {/* Thread Header */}
                    <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-gray-900 text-sm">{doubtDetail.subject}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doubtDetail.status === 'OPEN' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {doubtDetail.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Drive: <span className="font-semibold text-blue-700">{doubtDetail.job_title}</span>
                          {doubtDetail.company_name ? ` • ${doubtDetail.company_name}` : ''}
                        </p>
                      </div>

                      {doubtDetail.is_pinned_faq && (
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-900">
                          <Pin className="w-3.5 h-3.5 text-amber-600" /> Published to Drive FAQ
                        </div>
                      )}
                    </div>

                    {/* Messages Feed */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                      {doubtDetail.messages?.map(m => {
                        const isStudent = m.sender_role === 'STUDENT';
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span className="text-[11px] font-bold text-gray-700">{m.sender_name}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                isStudent ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {m.sender_role}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {m.created_at ? formatTimeString(m.created_at) : ''}
                              </span>
                            </div>

                            <div className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed shadow-2xs ${
                              isStudent
                                ? 'bg-blue-600 text-white rounded-tr-xs'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'
                            }`}>
                              {m.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Input */}
                    <form onSubmit={handleSendDoubtReply} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reply to coordinator..."
                        value={doubtReply}
                        onChange={(e) => setDoubtReply(e.target.value)}
                        className="flex-1 px-4 py-2.5 text-xs border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
                      />
                      <button
                        type="submit"
                        disabled={sendingDoubtReply || !doubtReply.trim()}
                        className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingDoubtReply ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                    <MessageCircle className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">Select an inquiry from the left</p>
                    <p className="text-xs text-gray-400 max-w-sm mt-1">
                      Have questions regarding syllabus, test links, dress codes, or backlogs? Ask your Department Coordinator!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NOTICES & CIRCULARS (Spec: docs/notification_and_broadcast_spec.md) */}
        {activeTab === 'notices' && (
          <StudentNoticeBoard />
        )}
      </main>

      {/* MODAL: ASK A DOUBT TO COORDINATOR (Spec §2.A & §6.A.1) */}
      {askDoubtOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-gray-900 text-sm">Ask a Doubt to Coordinator</h3>
              </div>
              <button 
                onClick={() => setAskDoubtOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Your inquiry will be answered directly by your Department Placement Coordinator. 
              Recruiters do not see student inquiries (Shield Principle).
            </p>

            <form onSubmit={handleSubmitDoubt} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Context Drive / Topic</label>
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800">
                  {doubtForm.job_title || 'General Placement Query'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subject / Question Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Is Python allowed in the Round 1 coding round?"
                  value={doubtForm.subject}
                  onChange={(e) => setDoubtForm({ ...doubtForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Detailed Explanation</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Sir, could you clarify whether standard library packages are allowed or if external modules can be used?"
                  value={doubtForm.message}
                  onChange={(e) => setDoubtForm({ ...doubtForm, message: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAskDoubtOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'Submitting...' : 'Submit to Coordinator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DRIVE FREQUENTLY ASKED QUESTIONS (Spec §2.C & §6.A.1) */}
      {faqsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-extrabold text-gray-900 text-sm">Drive Frequently Asked Questions</h3>
                  <p className="text-xs text-gray-500">{faqsJob.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setFaqsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingFaqs ? (
                <div className="p-8 text-center text-xs text-gray-500">Loading published FAQs...</div>
              ) : faqsJob.faqs.length > 0 ? (
                faqsJob.faqs.map(faq => (
                  <div key={faq.id} className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                      <h4 className="font-bold text-gray-900 text-xs">{faq.question}</h4>
                    </div>
                    <p className="text-xs text-gray-700 pl-6 leading-relaxed">
                      {faq.answer}
                    </p>
                    <div className="text-[10px] text-gray-400 pl-6">
                      Resolved & Pinned by Department Coordinator
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 space-y-2">
                  <p>No pinned FAQs yet for this recruitment drive.</p>
                  <p className="text-gray-400">Have a doubt? Click "Ask Coordinator" to receive official clarification.</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setFaqsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800 cursor-pointer"
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
