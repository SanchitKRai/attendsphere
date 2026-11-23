import { useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, GraduationCap, ShieldCheck } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
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

function DashboardPlaceholder() {
  const { profile, signOut } = useAuth();
  return <main className="dashboard-shell"><header className="topbar"><div className="brand-lockup"><div className="brand-mark"><GraduationCap size={21} /></div><span>Attend<span className="brand-accent">Sphere</span></span></div><button className="secondary-button" onClick={() => void signOut()}>Sign out</button></header><section className="dashboard-content"><div className="eyebrow"><CalendarDays size={14} /> SEMESTER IV · 2027</div><h1>Good to see you, {profile?.full_name?.split(" ")[0] ?? "student"}.</h1><p className="muted">Your attendance workspace is being prepared.</p><div className="empty-state"><BookOpen size={28} /><h2>Your timetable is not configured yet</h2><p>Once the college releases the Semester IV timetable, your classes will appear here automatically.</p></div></section></main>;
}

export default function App() {
  const { user, profile, loading, configured } = useAuth();
  if (!configured) return <main className="center-screen"><div className="waiting-card"><h1>Connect your Supabase project</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env file, then restart the development server.</p></div></main>;
  if (loading) return <main className="center-screen"><div className="loader" /></main>;
  if (!user) return <AuthScreen />;
  if (!profile || profile.approval_status !== "approved") return <WaitingScreen />;
  return <DashboardPlaceholder />;
}