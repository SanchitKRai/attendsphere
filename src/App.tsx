import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardList, GraduationCap, LayoutDashboard, LogOut, RefreshCw, ShieldCheck, Users, XCircle } from "lucide-react";
import { useAuth, type Profile } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        setMessage(data.session
          ? "Registration submitted. Your account is awaiting admin approval."
          : "Check your email to confirm your address. Your account will remain pending until an admin approves it.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="brand-panel">
        <div className="brand-lockup"><div className="brand-mark"><GraduationCap size={23} /></div><span>Attend<span className="brand-accent">Sphere</span></span></div>
        <div className="brand-copy">
          <div className="eyebrow"><span className="pulse-dot" /> SEMESTER IV · 2027</div>
          <h1>Your semester.<br /><span>In clear view.</span></h1>
          <p>A calmer way to track classes, understand attendance and stay ahead of the semester.</p>
        </div>
        <div className="brand-footer"><ShieldCheck size={16} /> Private student records. Admin-approved access.</div>
        <div className="orb orb-one" /><div className="orb orb-two" />
      </section>

      <section className="form-panel">
        <div className="form-wrap">
          <div className="mobile-brand"><div className="brand-mark"><GraduationCap size={21} /></div> Attend<span className="brand-accent">Sphere</span></div>
          <div className="form-heading"><span className="eyebrow">WELCOME TO YOUR WORKSPACE</span><h2>{mode === "login" ? "Sign in to continue" : "Create your student account"}</h2><p>{mode === "login" ? "Your attendance overview is one step away." : "Register with your college details to request access."}</p></div>
          <div className="tabs"><button className={mode === "login" ? "tab active" : "tab"} onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button><button className={mode === "register" ? "tab active" : "tab"} onClick={() => { setMode("register"); setMessage(""); }}>Register</button></div>
          <form onSubmit={submit} className="auth-form">
            {mode === "register" && <label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" required minLength={2} /></label>}
            <label>College email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} /></label>
            <button className="primary-button" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Submit registration"} <ArrowRight size={17} /></button>
          </form>
          {message && <div className="notice" role="status">{message}</div>}
          <div className="form-note"><ShieldCheck size={15} /> Student accounts require admin approval before dashboard access.</div>
          <div className="semester-note"><BookOpen size={16} /> B.Sc. Life Sciences <span>·</span> Semester IV</div>
        </div>
      </section>
    </main>
  );
}

function WaitingScreen() {
  const { profile, signOut } = useAuth();
  return <main className="center-screen"><div className="waiting-card"><div className="success-icon"><CheckCircle2 size={28} /></div><span className="eyebrow">ACCOUNT STATUS</span><h1>{profile?.approval_status === "rejected" ? "Registration not approved" : "You're on the list."}</h1><p>{profile?.approval_status === "rejected" ? "Your registration was not approved. Please contact your administrator." : "Your email is verified and your registration is waiting for admin approval. Your dashboard will unlock once your account is approved."}</p><div className="status-pill"><span /> {profile?.approval_status ?? "pending"}</div><button className="secondary-button" onClick={() => void signOut()}>Sign out</button></div></main>;
}

function DashboardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { profile, signOut } = useAuth();
  return <header className="topbar"><div><div className="brand-lockup"><div className="brand-mark"><GraduationCap size={21} /></div><span>Attend<span className="brand-accent">Sphere</span></span></div><div className="muted" style={{ marginLeft: 50, marginTop: -8 }}>{title} · {subtitle}</div></div><div style={{ display: "flex", alignItems: "center", gap: 14 }}><span className="muted">{profile?.full_name}</span><button className="secondary-button" onClick={() => void signOut()}><LogOut size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Sign out</button></div></header>;
}

function AdminDashboard() {
  const { profile, refreshProfile } = useAuth();
  const [pending, setPending] = useState<Profile[]>([]);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAdminData() {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const [pendingResult, countResult] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, role, approval_status")
        .eq("role", "student")
        .eq("approval_status", "pending")
        .order("full_name"),
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student"),
    ]);
    if (pendingResult.error) setError(pendingResult.error.message);
    else setPending((pendingResult.data ?? []) as Profile[]);
    if (countResult.error) setError(current => current || countResult.error.message);
    else setStudentCount(countResult.count ?? 0);
    setLoading(false);
  }

  useEffect(() => { void loadAdminData(); }, []);

  async function reviewRegistration(studentId: string, decision: "approved" | "rejected") {
    if (!supabase) return;
    setActionId(studentId);
    setError("");
    setNotice("");
    const { error: rpcError } = await supabase.rpc("admin_review_registration", {
      p_student_id: studentId,
      p_decision: decision,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setNotice(decision === "approved" ? "Student registration approved." : "Student registration rejected.");
      await loadAdminData();
      await refreshProfile();
    }
    setActionId(null);
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "Admin";
  return <main className="dashboard-shell">
    <DashboardHeader title="Administration" subtitle="Super-admin workspace" />
    <section className="dashboard-content">
      <div className="eyebrow"><ShieldCheck size={14} /> SUPER-ADMIN · SEMESTER IV</div>
      <h1>Welcome back, {firstName}.</h1>
      <p className="muted">Manage student access and prepare the Semester IV attendance workspace.</p>

      <div className="admin-stats">
        <article className="admin-stat"><div className="stat-icon"><Users size={19} /></div><span className="stat-label">Registered students</span><strong>{studentCount ?? "—"}</strong><small>Includes pending and approved student accounts</small></article>
        <article className="admin-stat"><div className="stat-icon"><ClipboardList size={19} /></div><span className="stat-label">Awaiting review</span><strong>{loading ? "…" : pending.length}</strong><small>Registrations requiring your decision</small></article>
        <article className="admin-stat"><div className="stat-icon"><CalendarDays size={19} /></div><span className="stat-label">Timetable</span><strong>Not set</strong><small>Configure once the college releases it</small></article>
      </div>

      <section className="admin-section">
        <div className="section-heading"><div><span className="eyebrow">ACCESS CONTROL</span><h2>Registration requests</h2><p className="muted">Approve or reject students who have completed registration.</p></div><button className="secondary-button" onClick={() => void loadAdminData()} disabled={loading}><RefreshCw size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Refresh</button></div>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}
        {loading ? <div className="admin-empty">Loading registration requests…</div> : pending.length === 0 ? <div className="admin-empty"><CheckCircle2 size={24} /><strong>No pending registrations</strong><span>New student requests will appear here after they register and confirm their email.</span></div> : <div className="request-list">{pending.map(student => <article className="request-row" key={student.id}><div className="student-avatar">{student.full_name.slice(0, 1).toUpperCase()}</div><div className="request-info"><strong>{student.full_name}</strong><span>Student account · Pending approval</span></div><div className="request-actions"><button className="approve-button" disabled={actionId !== null} onClick={() => void reviewRegistration(student.id, "approved")}><CheckCircle2 size={15} />{actionId === student.id ? "Saving…" : "Approve"}</button><button className="reject-button" disabled={actionId !== null} onClick={() => void reviewRegistration(student.id, "rejected")}><XCircle size={15} />Reject</button></div></article>)}</div>}
      </section>

      <section className="admin-section">
        <div className="section-heading"><div><span className="eyebrow">ACADEMIC SETUP</span><h2>Semester configuration</h2><p className="muted">These sections will become configurable as we build the admin tools.</p></div></div>
        <div className="module-grid">
          <article className="module-card"><BookOpen size={20} /><strong>Subject management</strong><span>Add CORE, SEC, VAC, AEC and GE/DSE subjects for Semester IV.</span><small>Next module</small></article>
          <article className="module-card"><CalendarDays size={20} /><strong>Timetable & sessions</strong><span>Define class timings later and generate dated class sessions.</span><small>Timetable pending</small></article>
          <article className="module-card"><LayoutDashboard size={20} /><strong>Attendance oversight</strong><span>Review attendance summaries and student-reported cancellations.</span><small>Planned module</small></article>
        </div>
      </section>
    </section>
  </main>;
}

function StudentDashboard() {
  const { profile, signOut } = useAuth();
  return <main className="dashboard-shell"><DashboardHeader title="Student dashboard" subtitle="Semester IV" /><section className="dashboard-content"><div className="eyebrow"><CalendarDays size={14} /> SEMESTER IV · 2027</div><h1>Good to see you, {profile?.full_name?.split(" ")[0] ?? "student"}.</h1><p className="muted">Your attendance workspace is being prepared.</p><div className="empty-state"><BookOpen size={28} /><h2>Your timetable is not configured yet</h2><p>Once the college releases the Semester IV timetable, your classes will appear here automatically.</p></div></section></main>;
}

export default function App() {
  const { user, profile, loading, configured } = useAuth();
  if (!configured) return <main className="center-screen"><div className="waiting-card"><h1>Connect your Supabase project</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env file, then restart the development server.</p></div></main>;
  if (loading) return <main className="center-screen"><div className="loader" /></main>;
  if (!user) return <AuthScreen />;
  if (!profile || profile.approval_status !== "approved") return <WaitingScreen />;
  if (profile.role === "admin") return <AdminDashboard />;
  return <StudentDashboard />;
}
