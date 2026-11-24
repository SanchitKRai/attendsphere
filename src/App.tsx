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

type StudentSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  class_type: string;
  status: "scheduled" | "cancelled";
  subject_id: string;
  subject?: { name?: string; code?: string | null } | null;
};
type AttendanceRow = { id: string; class_session_id: string; status: "present" | "absent"; marked_at: string };

function StudentDashboard() {
  const { profile, user, signOut } = useAuth();
  const [page, setPage] = useState("Overview");
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [subjects, setSubjects] = useState<Array<{id:string;name:string;code:string|null;category:string}>>([]);
  const [target, setTarget] = useState(75);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<string|null>(null);

  async function loadWorkspace() {
    if (!supabase || !user) return;
    setBusy(true); setError("");
    const [sessionResult, attendanceResult, subjectResult] = await Promise.all([
      supabase.from("class_sessions").select("id,session_date,start_time,end_time,class_type,status,subject_id,subject:subjects(name,code)").order("session_date",{ascending:false}).limit(250),
      supabase.from("attendance_records").select("id,class_session_id,status,marked_at").eq("student_id",user.id).order("marked_at",{ascending:false}).limit(500),
      supabase.from("subjects").select("id,name,code,category").eq("is_active",true).order("name"),
    ]);
    if(sessionResult.error) setError(sessionResult.error.message);
    else setSessions((sessionResult.data ?? []) as unknown as StudentSession[]);
    if(attendanceResult.error) setError(v=>v||attendanceResult.error.message);
    else setRecords((attendanceResult.data ?? []) as AttendanceRow[]);
    if(subjectResult.error) setError(v=>v||subjectResult.error.message);
    else setSubjects(subjectResult.data ?? []);
    setBusy(false);
  }

  useEffect(() => { void loadWorkspace(); }, [user?.id]);

  const recordBySession = new Map(records.map(record=>[record.class_session_id,record]));
  const completed = records.length;
  const present = records.filter(record=>record.status==="present").length;
  const absent = records.filter(record=>record.status==="absent").length;
  const percentage = completed ? Math.round(present/completed*1000)/10 : null;
  const today = new Date().toISOString().slice(0,10);
  const todaySessions = sessions.filter(s=>s.session_date===today && s.status==="scheduled");
  const upcoming = sessions.filter(s=>s.session_date>=today && s.status==="scheduled").sort((a,b)=>a.session_date.localeCompare(b.session_date)||a.start_time.localeCompare(b.start_time)).slice(0,5);
  const needs = percentage===null ? null : Math.max(0,Math.ceil((target*completed/100-present)/(1-target/100)));

  async function mark(sessionId:string,status:"present"|"absent") {
    if(!supabase) return;
    setSaving(sessionId); setError(""); setNotice("");
    const {error:rpcError}=await supabase.rpc("mark_my_attendance",{p_class_session_id:sessionId,p_status:status});
    if(rpcError) setError(rpcError.message);
    else { setNotice("Attendance saved to your private record."); await loadWorkspace(); }
    setSaving(null);
  }

  const nav=[["Overview","grid"],["My subjects","book"],["Timetable","calendar"],["Attendance history","history"],["Analytics","chart"],["Prediction","target"],["Profile & settings","settings"]];
  return <main className="student-app">
    <aside className="student-sidebar">
      <div className="student-brand"><div className="student-logo"><GraduationCap size={21}/></div><span>Attend<span>Sphere</span></span></div>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="student-nav">{nav.map(([label,icon])=><button key={label} className={page===label?"selected":""} onClick={()=>setPage(label)}><span className="nav-glyph">{icon==="grid"?"▦":icon==="book"?"▤":icon==="calendar"?"▦":icon==="history"?"◷":icon==="chart"?"⌁":icon==="target"?"◎":"⚙"}</span>{label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={17}/><strong>Your space is private</strong><span>Only you can view your personal attendance records.</span></div><div className="student-user"><div className="user-avatar">{(profile?.full_name||"S").slice(0,1).toUpperCase()}</div><div><strong>{profile?.full_name}</strong><span>Student account</span></div><button aria-label="Sign out" onClick={()=>void signOut()}><LogOut size={16}/></button></div></div>
    </aside>
    <section className="student-main">
      <header className="student-topbar"><div><span>AttendSphere</span><b>/</b>{page}</div><div className="topbar-right"><span className="semester-chip">Semester IV · 2027</span><button onClick={()=>void loadWorkspace()} aria-label="Refresh"><RefreshCw size={16}/></button></div></header>
      <div className="student-content">
        {error&&<div className="student-alert error-notice" role="alert">{error}</div>}
        {notice&&<div className="student-alert" role="status">{notice}</div>}
        {busy&&<div className="loading-line">Updating your private workspace…</div>}
        {page==="Overview"&&<>
          <div className="welcome-row"><div><div className="student-eyebrow">YOUR SEMESTER AT A GLANCE</div><h1>Good to see you, {profile?.full_name?.split(" ")[0]??"student"}.</h1><p>Small steps, consistent attendance. Keep your semester on track.</p></div><button className="student-primary" onClick={()=>setPage("Timetable")}>View timetable <ArrowRight size={16}/></button></div>
          <div className="student-stats">
            <article><span>Overall attendance</span><strong>{percentage===null?"—":percentage+"%"}</strong><small>{percentage===null?"No attendance marked yet":percentage>=target?"You're meeting your target":"Below your personal target"}</small></article>
            <article><span>Classes attended</span><strong>{present}</strong><small>Present records</small></article>
            <article><span>Classes missed</span><strong>{absent}</strong><small>Absent records</small></article>
            <article><span>Today's classes</span><strong>{todaySessions.length}</strong><small>Scheduled for today</small></article>
          </div>
          {percentage!==null&&<div className={percentage<target?"student-alert warning":"student-alert"}><div><strong>{percentage<target?"A little consistency goes a long way":"You're on track"}</strong><span>Your personal target is {target}%. {percentage<target?"Use Prediction to estimate how many consecutive classes you need to attend.":"Keep showing up and maintain the momentum."}</span></div><button onClick={()=>setPage("Prediction")}>View prediction <ArrowRight size={15}/></button></div>}
          <div className="student-columns"><section className="student-panel"><div className="panel-heading"><div><h2>Upcoming classes</h2><p>Your next scheduled sessions</p></div><button onClick={()=>setPage("Timetable")}>Full timetable <ArrowRight size={14}/></button></div>{upcoming.length===0?<div className="student-empty"><CalendarDays size={24}/><strong>No upcoming classes yet</strong><span>Your classes will appear here after the timetable is configured.</span></div>:upcoming.map(s=><div className="class-row" key={s.id}><div className="date-block"><strong>{new Date(s.session_date+"T00:00:00").toLocaleDateString("en",{day:"2-digit"})}</strong><span>{new Date(s.session_date+"T00:00:00").toLocaleDateString("en",{month:"short"})}</span></div><div className="class-info"><strong>{s.subject?.name??"Class session"}</strong><span>{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)} · {s.class_type}</span></div><span className="class-status">{recordBySession.get(s.id)?.status??"Not marked"}</span></div>)}</section>
          <section className="student-panel"><div className="panel-heading"><div><h2>Subject overview</h2><p>Attendance by subject</p></div><button onClick={()=>setPage("My subjects")}>All subjects <ArrowRight size={14}/></button></div>{subjects.length===0?<div className="student-empty"><BookOpen size={24}/><strong>Subjects are being prepared</strong><span>Your admin will publish the semester subject list here.</span></div>:subjects.slice(0,5).map(subject=>{const ids=new Set(sessions.filter(s=>s.subject_id===subject.id).map(s=>s.id));const rows=records.filter(r=>ids.has(r.class_session_id));const pct=rows.length?Math.round(rows.filter(r=>r.status==="present").length/rows.length*100):null;return <div className="subject-progress" key={subject.id}><div><strong>{subject.name}</strong><span>{subject.code||subject.category}</span></div><b>{pct===null?"—":pct+"%"}</b><div className="progress-track"><i style={{width:(pct??0)+"%"}}/></div></div>})}</section></div>
        </>}
        {page==="My subjects"&&<><div className="welcome-row"><div><div className="student-eyebrow">YOUR ACADEMIC LOAD</div><h1>My subjects</h1><p>Track how you're doing across each subject.</p></div></div><div className="subject-grid">{subjects.map(subject=>{const ids=new Set(sessions.filter(s=>s.subject_id===subject.id).map(s=>s.id));const rows=records.filter(r=>ids.has(r.class_session_id));const pct=rows.length?Math.round(rows.filter(r=>r.status==="present").length/rows.length*100):null;return <article className="subject-card" key={subject.id}><span>{subject.category}</span><h2>{subject.name}</h2><small>{subject.code||"Semester IV"}</small><strong>{pct===null?"—":pct+"%"}</strong><div className="progress-track"><i style={{width:(pct??0)+"%"}}/></div><p>{rows.filter(r=>r.status==="present").length} present · {rows.filter(r=>r.status==="absent").length} absent</p></article>})}{subjects.length===0&&<div className="student-empty">No active subjects have been published yet.</div>}</div></>}
        {page==="Timetable"&&<><div className="welcome-row"><div><div className="student-eyebrow">PLAN YOUR WEEK</div><h1>Personal timetable</h1><p>Your scheduled classes and attendance status.</p></div></div><section className="student-panel">{sessions.filter(s=>s.status==="scheduled").sort((a,b)=>a.session_date.localeCompare(b.session_date)||a.start_time.localeCompare(b.start_time)).map(s=><div className="class-row" key={s.id}><div className="date-block"><strong>{new Date(s.session_date+"T00:00:00").toLocaleDateString("en",{day:"2-digit"})}</strong><span>{new Date(s.session_date+"T00:00:00").toLocaleDateString("en",{month:"short"})}</span></div><div className="class-info"><strong>{s.subject?.name??"Class session"}</strong><span>{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)} · {s.class_type}</span></div>{recordBySession.has(s.id)?<span className={"attendance-chip "+recordBySession.get(s.id)?.status}>{recordBySession.get(s.id)?.status}</span>:s.session_date<=today?<div className="attendance-actions"><button disabled={saving===s.id} onClick={()=>void mark(s.id,"present")}>Present</button><button disabled={saving===s.id} onClick={()=>void mark(s.id,"absent")}>Absent</button></div>:<span className="class-status">Upcoming</span>}</div>)}{sessions.length===0&&<div className="student-empty"><CalendarDays size={24}/><strong>Your timetable is not configured yet</strong><span>Once the academic timetable is added, dated sessions will appear here.</span></div>}</section></>}
        {page==="Attendance history"&&<><div className="welcome-row"><div><div className="student-eyebrow">YOUR PERSONAL RECORD</div><h1>Attendance history</h1><p>Only your own attendance entries are shown here.</p></div></div><section className="student-panel"><div className="history-head"><span>CLASS</span><span>DATE</span><span>MARKED</span><span>STATUS</span></div>{records.map(r=>{const s=sessions.find(item=>item.id===r.class_session_id);return <div className="history-row" key={r.id}><strong>{s?.subject?.name??"Class session"}</strong><span>{s?.session_date??"—"}</span><span>{new Date(r.marked_at).toLocaleDateString()}</span><span className={"attendance-chip "+r.status}>{r.status}</span></div>})}{records.length===0&&<div className="student-empty">Your attendance history will appear after you mark a class.</div>}</section></>}
        {page==="Analytics"&&<><div className="welcome-row"><div><div className="student-eyebrow">UNDERSTAND YOUR PROGRESS</div><h1>Attendance analytics</h1><p>A clear picture of your attendance, based on finalized records.</p></div></div><div className="analytics-highlight"><span>Overall attendance</span><strong>{percentage===null?"—":percentage+"%"}</strong><small>{present} present out of {completed} finalized classes</small></div><div className="student-stats"><article><span>Present</span><strong>{present}</strong></article><article><span>Absent</span><strong>{absent}</strong></article><article><span>Unmarked scheduled</span><strong>{sessions.filter(s=>s.status==="scheduled"&&!recordBySession.has(s.id)&&s.session_date<=today).length}</strong></article><article><span>Cancelled sessions</span><strong>{sessions.filter(s=>s.status==="cancelled").length}</strong></article></div><section className="student-panel"><div className="panel-heading"><div><h2>Subject comparison</h2><p>Finalized attendance only</p></div></div>{subjects.map(subject=>{const ids=new Set(sessions.filter(s=>s.subject_id===subject.id).map(s=>s.id));const rows=records.filter(r=>ids.has(r.class_session_id));const pct=rows.length?Math.round(rows.filter(r=>r.status==="present").length/rows.length*100):0;return <div className="subject-progress" key={subject.id}><div><strong>{subject.name}</strong><span>{rows.length} finalized classes</span></div><b>{rows.length?pct+"%":"—"}</b><div className="progress-track"><i style={{width:pct+"%"}}/></div></div>})}</section></>}
        {page==="Prediction"&&<><div className="welcome-row"><div><div className="student-eyebrow">PLAN AHEAD</div><h1>Attendance prediction</h1><p>Estimate the classes you need to attend to reach your target.</p></div></div><section className="prediction-card"><label htmlFor="target">Your attendance target <strong>{target}%</strong></label><input id="target" type="range" min="50" max="100" step="1" value={target} onChange={e=>setTarget(Number(e.target.value))}/><div className="prediction-result"><span>Consecutive classes to attend</span><strong>{needs===null?"—":needs}</strong><small>Based on {present} present and {absent} absent finalized records. Assumes you attend every next class.</small></div><p className="prediction-disclaimer">This is an estimate, not a guarantee. Cancelled and unmarked sessions are excluded from the current percentage.</p></section></>}
        {page==="Profile & settings"&&<><div className="welcome-row"><div><div className="student-eyebrow">YOUR ACCOUNT</div><h1>Profile & settings</h1><p>Manage your account preferences and privacy.</p></div></div><section className="student-panel profile-panel"><div className="profile-avatar">{(profile?.full_name||"S").slice(0,1).toUpperCase()}</div><div><h2>{profile?.full_name}</h2><p>{user?.email}</p><span>Approved student · Semester IV</span></div></section><section className="student-panel privacy-panel"><ShieldCheck size={22}/><div><h2>Your attendance belongs to you.</h2><p>Your personal attendance records, history and analytics are private. The admin manages academic setup and cohort-wide class sessions, but cannot view or export your individual attendance data.</p></div></section></>}
      </div>
    </section>
  </main>;
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
