
import React, { useState, useEffect } from 'react';
import { DELHI_WARDS, MOCK_COMPLAINTS } from '../constants';
import { WardData } from '../types';
import { getHealthAdvice, getWardExplainer } from '../services/geminiService';
import cacService from '../services/cacService';
import { getStoredWard } from '../services/locationService';
import LeafletAQIMap from './LeafletAQIMap';
import HealthRiskDashboard from './HealthRiskDashboard';
import { getOrCreateGuestSession } from '../services/sessionStore';
import { submitComplaint } from '../services/complaintService';
import { useWardData } from '../contexts/WardDataContext';

interface CitizenDashboardProps {
  onNavigateMap: () => void;
  detectedWard?: WardData;
}

const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ onNavigateMap, detectedWard }) => {
  const { wards, loading: dataLoading } = useWardData();
  const [isReporting, setIsReporting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [reportData, setReportData] = useState({
    image: null as string | null,
    imageFileName: '' as string,
    location: null as { lat: number; lng: number } | null,
    description: '',
    type: 'Waste Burning' as 'Waste Burning' | 'Construction Dust' | 'Industrial Violation',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ id?: string; hash?: string } | null>(null);
  const [joinedMission, setJoinedMission] = useState<boolean>(false);
  const [showHealthRisks, setShowHealthRisks] = useState(false);

  // Current session (set at login)
  const session = getOrCreateGuestSession();

  // Use detected ward or stored ward, fallback to first ward from context
  const userWard = detectedWard || getStoredWard() || (wards.length > 0 ? wards[0] : DELHI_WARDS[0]);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReportData(prev => ({ ...prev, image: ev.target?.result as string, imageFileName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationDetect = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setReportData(prev => ({
          ...prev,
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        })),
        () => alert('Location access denied. Please enable location permissions.')
      );
    } else {
      alert('Geolocation not supported in this browser.');
    }
  };

  const handleSubmit = async () => {
    if (!reportData.description.trim()) {
      alert('Please add a description before submitting.');
      return;
    }
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const result = await submitComplaint({
        type: reportData.type,
        location: reportData.location
          ? `${reportData.location.lat.toFixed(4)}, ${reportData.location.lng.toFixed(4)}`
          : userWard.name,
        ward: userWard.name,
        intensity: userWard.aqi > 300 ? 'High' : userWard.aqi > 150 ? 'Medium' : 'Low',
        description: reportData.description,
        reporter: {
          userId: session.userId,
          authMethod: session.authMethod,
          trustScore: session.trustScore,
        },
        coordinates: reportData.location ?? undefined,
        evidence: reportData.imageFileName ? [reportData.imageFileName] : [],
        aqiAtSubmission: userWard.aqi,
      });

      setSubmitResult(result);

      if (result.ok) {
        // Award CAC for report
        try {
          const id = `report_${result.id ?? Date.now()}`;
          const res = cacService.awardCAC(3, { id, note: 'Report submitted' });
          if (res?.ok) {
            // CAC awarded silently; result modal shows the confirmation
          }
        } catch {}
      }
    } catch (err) {
      console.error('Submit error', err);
      setSubmitResult({ ok: false } as any);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseReport = () => {
    setIsReporting(false);
    setSubmitResult(null);
    setReportData({ image: null, imageFileName: '', location: null, description: '', type: 'Waste Burning' });
  };

  const [advice, setAdvice] = useState<string>('');
  const [explainer, setExplainer] = useState<string>('');

  // Fetch real AI insights when ward changes
  useEffect(() => {
    const fetchContext = async () => {
      // Use ward's own explanation as immediate fallback
      setAdvice(userWard.aqi > 200 ? 'Serious health impact for all. Avoid outdoors.' : 'Sensitive groups should reduce outdoor exercise.');
      setExplainer(userWard.whyToday || 'Analyzing local emission patterns...');

      try {
        const [hMsg, eMsg] = await Promise.all([
          getHealthAdvice(userWard.aqi),
          getWardExplainer(userWard)
        ]);
        if (hMsg) setAdvice(hMsg);
        if (eMsg) setExplainer(eMsg);
      } catch (e) {
        console.error('AI Fetch failed', e);
      }
    };
    
    if (userWard) {
      fetchContext();
    }
  }, [userWard.id, userWard.aqi]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-700">

      {/* Full-Width Header Status */}
      <section className="bg-white dark:bg-[#2D525A] rounded-xl p-8 shadow-xl border border-white/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#00bdd6] uppercase tracking-widest text-xs font-bold">
              <span className="material-symbols-outlined text-xs">location_on</span>
              {userWard.name} • Live Status
            </div>
            <h2 className="text-4xl font-black">Current Atmospheric Status</h2>
            <p className="text-slate-500 dark:text-slate-300 max-w-md">
              Environmental sensors updated 4 minutes ago. Data sourced from CPCB & DPCC Network.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-10">
            <div className="flex items-baseline gap-4">
              <span className={`text-7xl font-black tracking-tighter ${userWard.aqi > 200 ? 'text-red-500' : userWard.aqi > 100 ? 'text-orange-500' : userWard.aqi > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                {userWard.aqi}
              </span>
              <div className="flex flex-col">
                <span className={`text-xl font-bold uppercase tracking-wide ${userWard.aqi > 200 ? 'text-red-500' : userWard.aqi > 100 ? 'text-orange-500' : userWard.aqi > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {userWard.status}
                </span>
                <span className="text-xs opacity-60">Indian AQI Index</span>
              </div>
            </div>
            <div className="h-16 w-px bg-white/10 hidden xl:block"></div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-red-400">
                <span className="material-symbols-outlined font-bold">trending_up</span>
                <span className="text-lg font-bold">+12% Higher</span>
              </div>
              <p className="text-sm opacity-60">Compared to 24h average</p>
            </div>
            <button
              onClick={onNavigateMap}
              className="bg-[#00bdd6] hover:bg-[#00bdd6]/90 text-[#1b3f46] font-extrabold px-6 py-3 rounded-lg flex items-center gap-2 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined">map</span>
              Ward Heatmap
            </button>
          </div>
        </div>
      </section>

      {/* Main Body Split */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* Left Column (60%) */}
        <div className="lg:col-span-6 space-y-6">

          {/* Health Advisory Guide */}
          <div className="bg-white dark:bg-[#2D525A] rounded-xl p-6 shadow-md border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#00bdd6]">medical_services</span>
                <h3 className="text-xl font-bold">Health Advisory Guide</h3>
              </div>
              <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">
                Active Warning
              </span>
            </div>

            {/* Health Risk Dashboard Integration */}
            <div className="mb-6">
              <button
                onClick={() => setShowHealthRisks(true)}
                className="w-full bg-[#00bdd6]/10 hover:bg-[#00bdd6]/20 border border-[#00bdd6]/30 text-[#00bdd6] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined">health_and_safety</span>
                View Detailed Health Risks & Precautions
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1b3f46]/50 border border-white/5 flex flex-col items-center text-center gap-3">
                <span className="material-symbols-outlined text-3xl text-[#00bdd6]">masks</span>
                <p className="text-sm font-bold">Wear N95 Outdoors</p>
                <p className="text-xs opacity-60">Essential for exposure over 15 mins</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1b3f46]/50 border border-white/5 flex flex-col items-center text-center gap-3">
                <span className="material-symbols-outlined text-3xl text-[#00bdd6]">window_closed</span>
                <p className="text-sm font-bold">Seal Windows</p>
                <p className="text-xs opacity-60">Keep indoor filtration active</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1b3f46]/50 border border-white/5 flex flex-col items-center text-center gap-3">
                <span className="material-symbols-outlined text-3xl text-[#00bdd6]">directions_run</span>
                <p className="text-sm font-bold">No High Activity</p>
                <p className="text-xs opacity-60">Avoid cardio in public spaces</p>
              </div>
            </div>

            {/* Medical Details */}
            <div className="border-t border-white/10 pt-6">
              <p className="text-sm font-semibold mb-4 opacity-80 uppercase tracking-widest">
                Medical Details & Vulnerability
              </p>
              <div className="space-y-3">
                <div className="flex gap-4 p-4 rounded-lg bg-[#00bdd6]/5 border border-[#00bdd6]/10">
                  <span className="material-symbols-outlined text-[#00bdd6] mt-1">info</span>
                  <div>
                    <p className="font-bold text-sm">Sensitive Groups at Elevated Risk</p>
                    <p className="text-sm opacity-70 leading-relaxed">
                      {advice || "Loading personalized health recommendations..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Environmental Context */}
          <div className="bg-white dark:bg-[#2D525A] rounded-xl p-6 shadow-md border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 size-48 bg-[#00bdd6]/5 rounded-full blur-3xl group-hover:bg-[#00bdd6]/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#00bdd6]">psychology</span>
              <h3 className="text-xl font-bold">AI Environmental Context</h3>
            </div>
            <div className="space-y-4 relative z-10">
              <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-100 italic">
                "{explainer || "Analyzing local sensor pulse and emission patterns..."}"
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-bold uppercase py-1 px-2 bg-white/5 rounded border border-white/10">
                  Industrial: {userWard.sourceDistribution.industrial}%
                </span>
                <span className="text-[10px] font-bold uppercase py-1 px-2 bg-white/5 rounded border border-white/10">
                  Vehicular: {userWard.sourceDistribution.vehicular}%
                </span>
                <span className="text-[10px] font-bold uppercase py-1 px-2 bg-white/5 rounded border border-white/10">
                  Construction: {userWard.sourceDistribution.construction}%
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (40%) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Civic Response Tracker */}
          <div className="bg-white dark:bg-[#2D525A] rounded-xl p-6 shadow-md border border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#00bdd6]">account_balance</span>
                <h3 className="text-xl font-bold">Civic Response</h3>
              </div>
              <span className="text-xs opacity-60">Live Updates</span>
            </div>
            <div className="space-y-4">
              {MOCK_COMPLAINTS.slice(0, 3).map((c, idx) => (
                <div key={c.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`size-2 rounded-full ${idx === 0 ? 'bg-[#00bdd6] ring-4 ring-[#00bdd6]/20' : idx === 1 ? 'bg-slate-400' : 'bg-green-400'}`}></div>
                    {idx < 2 && <div className="w-0.5 h-12 bg-white/10 mt-1"></div>}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm">{c.type}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${c.status === 'Resolved' ? 'bg-green-500/20 text-green-400' :
                        c.status === 'Actioned' ? 'bg-[#00bdd6]/20 text-[#00bdd6]' :
                          'bg-white/10 opacity-60'
                        }`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs opacity-60 mt-1">{c.location}</p>
                    <p className="text-[10px] opacity-40 mt-2">SLA: {c.slaRemaining}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setReportData(d => ({ ...d, type: 'Fire Incident' })); setIsReporting(true); }}
              className="bg-white dark:bg-[#2D525A] p-5 rounded-xl border border-white/5 hover:border-[#00bdd6]/50 transition-all text-left flex flex-col gap-3 group"
            >
              <div className="size-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">local_fire_department</span>
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Report Burning</p>
                <p className="text-[10px] opacity-50 mt-1">Illegal waste or debris</p>
              </div>
            </button>

            <button
              onClick={() => setIsAuditing(true)}
              className="bg-white dark:bg-[#2D525A] p-5 rounded-xl border border-white/5 hover:border-[#00bdd6]/50 transition-all text-left flex flex-col gap-3 group"
            >
              <div className="size-10 rounded-lg bg-[#00bdd6]/10 text-[#00bdd6] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">volunteer_activism</span>
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Join Mission</p>
                <p className="text-[10px] opacity-50 mt-1">Clean-air taskforce</p>
              </div>
            </button>

            <button
              onClick={onNavigateMap}
              className="bg-white dark:bg-[#2D525A] p-5 rounded-xl border border-white/5 hover:border-[#00bdd6]/50 transition-all text-left flex flex-col gap-3 group"
            >
              <div className="size-10 rounded-lg bg-[#00bdd6]/10 text-[#00bdd6] flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">map</span>
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Ward Heatmap</p>
                <p className="text-[10px] opacity-50 mt-1">Real-time density</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/clean-air-credits'}
              className="bg-white dark:bg-[#2D525A] p-5 rounded-xl border border-white/5 hover:border-[#00bdd6]/50 transition-all text-left flex flex-col gap-3 group"
            >
              <div className="size-10 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">eco</span>
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">Clean Air Credits</p>
                <p className="text-[10px] opacity-50 mt-1">Earn CAC rewards</p>
              </div>
            </button>
          </div>

          {/* Ward Map Snapshot */}
          <div className="bg-white dark:bg-[#2D525A] rounded-xl p-4 shadow-md border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">Ward Map View</p>
              <span className="material-symbols-outlined text-sm opacity-60">map</span>
            </div>
            <div className="w-full h-48 rounded-lg overflow-hidden border border-white/5 relative">
              <LeafletAQIMap showChrome={false} />
              <button
                onClick={onNavigateMap}
                className="absolute top-2 right-2 bg-background-dark/70 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/10 hover:border-primary/60 hover:text-primary transition-colors"
              >
                Open Full Map
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-[10px] opacity-60">Sensor Hotspot: {userWard.name}</p>
              <button onClick={onNavigateMap} className="text-[10px] font-bold text-[#00bdd6] hover:underline">
                Launch Map →
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Metric Bar */}
      <footer className="bg-white dark:bg-[#2D525A]/40 rounded-xl p-4 flex flex-wrap gap-8 justify-between items-center text-xs border border-white/5">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#00bdd6]"></span>
            <span className="opacity-60">Population: {userWard.populationDensity}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-red-400"></span>
            <span className="opacity-60">Priority: {userWard.priorityScore}/100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-yellow-400"></span>
            <span className="opacity-60">Complaints: {userWard.complaints}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-green-400"></span>
            <span className="opacity-60">Response Time: {userWard.responseTime}</span>
          </div>
        </div>
        <p className="opacity-40 font-medium">Last synced: Today at {new Date().toLocaleTimeString()} • System Status: Stable</p>
      </footer>
      {/* Incident Reporting Overlay */}
      {isReporting && (
        <div className="fixed inset-0 z-50 bg-background-dark/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0f0f] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-7 shadow-2xl relative animate-in zoom-in-95 duration-300 my-4">
            <button onClick={handleCloseReport} className="absolute top-5 right-5 size-9 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            {/* ── Success state ── */}
            {submitResult ? (
              <div className="py-4 text-center space-y-6">
                <div className={`size-16 rounded-full flex items-center justify-center mx-auto ${(submitResult as any).ok !== false ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <span className={`material-symbols-outlined text-3xl ${(submitResult as any).ok !== false ? 'text-green-400' : 'text-red-400'}`}>
                    {(submitResult as any).ok !== false ? 'check_circle' : 'error'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">
                    {(submitResult as any).ok !== false ? 'Report Submitted' : 'Submission Failed'}
                  </h3>
                  <p className="text-sm text-white/50">
                    {(submitResult as any).ok !== false
                      ? 'Your report has been cryptographically anchored and dispatched to the ward authority.'
                      : 'Could not reach the server. Your report was logged locally.'}
                  </p>
                </div>
                {submitResult.id && (
                  <div className="bg-white/5 rounded-2xl p-4 text-left">
                    <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">Complaint ID</p>
                    <p className="font-mono text-sm font-bold text-primary">{submitResult.id}</p>
                  </div>
                )}
                {submitResult.hash && (
                  <div className="bg-white/5 rounded-2xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[13px] text-green-400">verified_user</span>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest">Integrity Hash (SHA-256)</p>
                    </div>
                    <p className="font-mono text-[10px] text-white/60 break-all">{submitResult.hash}</p>
                  </div>
                )}
                {(submitResult as any).ok !== false && (
                  <p className="text-[10px] text-green-400 font-bold">+3 CAC awarded to your account</p>
                )}
                <button onClick={handleCloseReport} className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-bold text-sm transition-all">
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-black uppercase tracking-tighter mb-0.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-2xl">report</span>
                  Lodge Complaint
                </h2>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-5">Verified report to ward authority</p>

                {/* ── Credibility Preview Strip ── */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-3">Your Credibility Profile</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[8px] text-white/30 mb-1">User ID</p>
                      <p className="font-mono text-[11px] font-bold text-white/80">{session.userId}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/30 mb-1">Auth</p>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px] text-green-400">verified</span>
                        <p className="text-[10px] text-white/70">{session.authMethod}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] text-white/30 mb-1">Trust Score</p>
                      <p className={`font-mono text-sm font-black ${session.trustScore >= 0.85 ? 'text-green-400' : session.trustScore >= 0.65 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {Math.round(session.trustScore * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-white/10 rounded-full">
                    <div className={`h-full rounded-full ${session.trustScore >= 0.85 ? 'bg-green-500' : session.trustScore >= 0.65 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${session.trustScore * 100}%` }}></div>
                  </div>
                  <div className="mt-2 flex justify-between text-[8px] text-white/30">
                    <span>📍 AQI at report: <strong className="text-orange-400">{userWard.aqi}</strong></span>
                    <span>Ward: <strong className="text-white/60">{userWard.name}</strong></span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Incident Type */}
                  <div>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest mb-2">Incident Type</p>
                    <div className="flex gap-2">
                      {(['Waste Burning', 'Construction Dust', 'Industrial Violation'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => setReportData(p => ({ ...p, type }))}
                          className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            reportData.type === type
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                          }`}
                        >
                          {type.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Evidence + GPS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                      <input type="file" accept="image/*" capture="environment"
                        onChange={handleImageCapture}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${reportData.image ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5 group-hover:border-white/30'}`}>
                        {reportData.image ? (
                          <img src={reportData.image} alt="Evidence" className="h-full w-full object-cover rounded-xl" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-2xl mb-1 text-white/50">photo_camera</span>
                            <span className="text-[9px] font-bold uppercase text-white/30">Add Photo Evidence</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button onClick={handleLocationDetect}
                      className={`h-28 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${reportData.location ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
                      {reportData.location ? (
                        <>
                          <span className="material-symbols-outlined text-2xl mb-1 text-green-400">my_location</span>
                          <span className="text-[9px] font-bold text-green-400">
                            {reportData.location.lat.toFixed(4)}°N
                          </span>
                          <span className="text-[9px] font-bold text-green-400">
                            {reportData.location.lng.toFixed(4)}°E
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-2xl mb-1 text-white/50">add_location_alt</span>
                          <span className="text-[9px] font-bold uppercase text-white/30">Tag GPS Location</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Description */}
                  <textarea
                    value={reportData.description}
                    onChange={(e) => setReportData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe what you see — specifics help the authority respond faster (e.g. 'Large smoke plume near ISBT gate 3...')"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-all min-h-[90px] resize-none"
                  />

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !reportData.description.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                        Submitting & Hashing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        Submit Verified Report
                      </>
                    )}
                  </button>
                  <p className="text-center text-[9px] text-white/25 font-bold uppercase">
                    Report is SHA-256 anchored at submission · False reporting is a punishable offense under Section 182 IPC
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Citizen Audits Modal */}
      {isAuditing && (
        <div className="fixed inset-0 z-50 bg-background-dark/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-[#0a0f0f] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsAuditing(false)} className="absolute top-6 right-6 size-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">volunteer_activism</span>
              Audit Squad
            </h2>
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-8">Civic Oversight Taskforce</p>

            <div className="space-y-6">
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20">
                <h3 className="text-lg font-bold text-white mb-2">Upcoming Mission</h3>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-primary font-black text-2xl uppercase tracking-tighter">Waste Segregation</div>
                    <div className="text-xs text-white/50 font-bold uppercase mt-1">Saturday, 10:00 AM • Market Area</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => {
                        // Mark joined locally and award CAC (+2) - fixed action ID prevents duplicate awards
                        const actionId = 'join:WasteSegregation';
                        const res = cacService.awardCAC(2, { id: actionId, note: 'Joined mission: Waste Segregation' });

                        if (res && res.ok) {
                          alert(`Joined — You earned 2 CAC! New balance: ${res.newBalance} CAC`);
                          setJoinedMission(true);
                          try { localStorage.setItem('joinedWasteSegregation', 'true'); } catch { }
                        } else if (res?.error === 'already awarded') {
                          alert('You have already joined this mission and received your CAC reward.');
                          setJoinedMission(true);
                        } else {
                          alert('Joined — Unable to award CAC: ' + (res?.error || 'Unknown error'));
                          setJoinedMission(true);
                        }
                      }}
                      disabled={joinedMission}
                      className={`px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${joinedMission ? 'bg-white/10 text-white/60 cursor-default' : 'bg-primary text-background-dark hover:scale-105'}`}
                    >
                      {joinedMission ? 'Joined' : 'Join'}
                    </button>

                    {joinedMission && (
                      <div className="text-[10px] text-white/40 font-bold uppercase mt-2">You're registered for this mission — we'll send updates.</div>
                    )}

                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Past Audits</h4>
                <div className="space-y-3">
                  {[
                    { title: 'Construction Dust Check', status: 'Completed', score: '85%' },
                    { title: 'Park Maintenance', status: 'Pending Review', score: '-' }
                  ].map(audit => (
                    <div key={audit.title} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                      <div>
                        <div className="font-bold text-sm">{audit.title}</div>
                        <div className="text-[9px] font-bold text-white/30 uppercase">{audit.status}</div>
                      </div>
                      <div className="font-mono text-primary font-bold">{audit.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Health Risk Dashboard Overlay */}
      {showHealthRisks && (
        <HealthRiskDashboard onBack={() => setShowHealthRisks(false)} />
      )}
    </div >
  );
};

export default CitizenDashboard;
