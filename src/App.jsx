import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  supabase: {
    url: "https://ttnztozwxhoxqlalhyts.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bnp0b3p3eGhveHFsYWxoeXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NTg1MjEsImV4cCI6MjA4ODAzNDUyMX0.Hb7JJxtitpSzf6YHm7a8UfGFSFXyUwMAdqMBkcOuW18",
  },
  treasurer: { email: "treasurer@yourgroup.org", phone: "254700000000" },
  group: {
    name: "Community Welfare Group",
    tagline: "For each other. Always.",
    description: "A student-led welfare circle. We show up when it matters.",
    membershipFee: 50,
    monthlyFee: 200,
    whatsapp: "https://chat.whatsapp.com/KPQUvYLxOtT30lTTsNbrlx?mode=hq1tcli",
    regPrefix: "COM",
  },
  mpesa: { till: "3346425" },
  executives: [
    { name: "Isaac Kipngetich", title: "Chairperson",     bio: "Leads with clarity. Keeps the group moving forward.",    photo: "/chair.jpg" },
    { name: "Daisy Sakwa",      title: "Vice Chairperson", bio: "Bridges ideas and action. Always present when needed.", photo: "/vice.jpg" },
    { name: "Kelvin Simiyu",    title: "Secretary",        bio: "Keeps records sharp. Nothing falls through the cracks.", photo: "/secretary.jpg" },
    { name: "Brevian Emmanuel", title: "Treasurer",        bio: "Manages every shilling with precision and care.",        photo: "/treasurer.jpg" },
  ],
  developer: { name: "Brevian Emmanuel", description: "Designed and built with intention.", portfolio: "https://brevian.online" },
};

const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = {
  currency: (n) => `KSh ${Number(n).toLocaleString()}`,
  date: (d) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
  phone: (p) => (p ?? "").replace(/\D/g, "").replace(/^0/, "254"),
  monthKey: (offset = 0) => { const n = new Date(); n.setMonth(n.getMonth() + offset); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; },
  monthLabel: (key) => { const d = key ? new Date(key+"-01") : new Date(); return d.toLocaleDateString("en-KE", { month: "long", year: "numeric" }); },
  shortMonth: (key) => new Date(key+"-01").toLocaleDateString("en-KE", { month: "short" }),
  initials: (name) => name.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase(),
};

const isSafaricom = (phone) => /^254(7[0-9]{8}|1[01][0-9]{7})$/.test(fmt.phone(phone));
const STATUS_LABEL = { pending: "Pending", approved: "Approved", declined: "Declined" };

// ─── Router ───────────────────────────────────────────────────────────────────
const getHash = () => window.location.hash.replace("#","") || "/";
const navigate = (path) => { window.location.hash = path; };

function useRoute() {
  const [route, setRoute] = useState(getHash);
  useEffect(() => {
    const h = () => setRoute(getHash());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return route;
}

function useAuthSession() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  return { session, authLoading };
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem("theme");
    return s ? s === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}

function useLoans(memberId) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const refetch = useCallback(() => {
    if (!memberId) return;
    setLoading(true);
    supabase.from("loan_requests").select("*").eq("member_id", memberId).order("created_at", { ascending: false })
      .then(({ data }) => { setLoans(data ?? []); setLoading(false); });
  }, [memberId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { loans, loading, refetch };
}

function useAllLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(() => {
    setLoading(true);
    supabase.from("loan_requests").select("*, members(full_name, phone)").order("created_at", { ascending: false })
      .then(({ data }) => { setLoans(data ?? []); setLoading(false); });
  }, []);
  useEffect(() => { refetch(); }, [refetch]);
  return { loans, loading, refetch };
}

function useContributions(memberId) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const refetch = useCallback(() => {
    if (!memberId) return;
    setLoading(true);
    supabase.from("contributions").select("*").eq("member_id", memberId).order("created_at", { ascending: false })
      .then(({ data }) => { setContributions(data ?? []); setLoading(false); });
  }, [memberId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { contributions, loading, refetch };
}

function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("members").select("id,full_name,phone,paid,avatar_url,email").order("full_name")
      .then(({ data }) => { setMembers(data ?? []); setLoading(false); });
  }, []);
  return { members, loading };
}

function useAnnouncement() {
  const [ann, setAnn] = useState(null);
  useEffect(() => {
    supabase.from("announcements").select("*").eq("active",true).order("created_at",{ascending:false}).limit(1).single()
      .then(({ data }) => { if (data) setAnn(data); });
  }, []);
  return ann;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function DarkToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} aria-label="Toggle theme" className="theme-toggle">
      <span className="theme-toggle-knob" style={{ marginLeft: dark ? "1.35rem" : "0.17rem" }} />
    </button>
  );
}

function Spinner() {
  return <div className="spinner-wrap"><span className="spinner" /></div>;
}

function NeuCard({ children, className = "", style = {}, pressed = false }) {
  return <div className={`neu-card ${pressed ? "neu-card-pressed" : ""} ${className}`} style={style}>{children}</div>;
}

function NeuInput({ label, hint, error, ...props }) {
  return (
    <div className="neu-field">
      {label && <label className="neu-label">{label}{hint && <span className="neu-hint">{hint}</span>}</label>}
      {props.type === "textarea"
        ? <textarea className="neu-input neu-textarea" {...props} />
        : <input className="neu-input" {...props} />}
      {error && <p className="neu-error">{error}</p>}
    </div>
  );
}

function NeuBtn({ children, loading, variant = "primary", full, small, ...props }) {
  return (
    <button className={`neu-btn neu-btn-${variant}${full?" neu-btn-full":""}${small?" neu-btn-small":""}`}
      disabled={loading || props.disabled} {...props}>
      {loading ? <span className="btn-spinner" /> : children}
    </button>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

function ActivePill({ active }) {
  return (
    <span className={`active-pill ${active ? "active-pill-on" : "active-pill-off"}`}>
      <span className="active-pip" />{active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Announcement ─────────────────────────────────────────────────────────────
function AnnouncementBanner({ ann }) {
  const [gone, setGone] = useState(() => sessionStorage.getItem(`ann-${ann?.id}`) === "1");
  if (!ann || gone) return null;
  return (
    <div className="ann-bar">
      <span className="ann-dot" />
      <div className="ann-text">
        <span className="ann-title">{ann.title}</span>
        {ann.body && <span className="ann-body">{ann.body}</span>}
      </div>
      <button className="ann-close" onClick={() => { sessionStorage.setItem(`ann-${ann.id}`,"1"); setGone(true); }}>
        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
      </button>
    </div>
  );
}

// ─── Streak ───────────────────────────────────────────────────────────────────
function ContributionStreak({ contributions }) {
  const months = useMemo(() => Array.from({length:6},(_,i) => {
    const key = fmt.monthKey(i-5);
    return { key, label: fmt.shortMonth(key), paid: contributions.some(c => c.month_key===key && c.status==="confirmed") };
  }), [contributions]);

  const streak = useMemo(() => {
    let n = 0;
    for (let i = months.length-1; i >= 0; i--) { if (months[i].paid) n++; else break; }
    return n;
  }, [months]);

  return (
    <NeuCard className="streak-card">
      <p className="section-label" style={{marginBottom:"0.9rem"}}>6-month streak</p>
      <div className="streak-row">
        {months.map(m => (
          <div key={m.key} className="streak-item">
            <div className={`streak-pip ${m.paid ? "streak-pip-paid" : "streak-pip-empty"}`}>
              {m.paid && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>}
            </div>
            <span className="streak-lbl">{m.label}</span>
          </div>
        ))}
      </div>
      {streak > 1 && <p className="streak-msg">{streak}-month streak. Keep it going.</p>}
    </NeuCard>
  );
}

// ─── Contribution Module ──────────────────────────────────────────────────────
function ContributionModule({ member, onPhoneAdded }) {
  const { contributions, loading, refetch } = useContributions(member.id);
  const [step, setStep] = useState("idle");
  const [paying, setPaying] = useState(false);
  const [notSafaricom, setNotSafaricom] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const currentKey = fmt.monthKey();
  const paidThisMonth = useMemo(() => contributions.some(c => c.month_key===currentKey && c.status==="confirmed"), [contributions, currentKey]);
  const totalPaid = useMemo(() => contributions.filter(c => c.status==="confirmed").reduce((s,c) => s+Number(c.amount), 0), [contributions]);
  const hasPhone = !!(member.phone);

  useEffect(() => {
    if (step !== "waiting") return;
    const iv = setInterval(async () => {
      const { data } = await supabase.from("contributions").select("status").eq("member_id",member.id).eq("month_key",currentKey).single();
      if (data?.status === "confirmed") { clearInterval(iv); refetch(); setStep("done"); }
      setPollCount(n => n+1);
    }, 4000);
    return () => clearInterval(iv);
  }, [step, member.id, currentKey, refetch]);

  const savePhone = useCallback(async () => {
    const cleaned = fmt.phone(phoneInput);
    if (cleaned.length < 12) return;
    setSavingPhone(true);
    await supabase.from("members").update({ phone: cleaned }).eq("id", member.id);
    setSavingPhone(false);
    if (onPhoneAdded) onPhoneAdded(cleaned);
  }, [phoneInput, member.id, onPhoneAdded]);

  const handlePay = useCallback(async () => {
    if (!isSafaricom(member.phone)) { setNotSafaricom(true); return; }
    setNotSafaricom(false); setPaying(true);
    const { data: contrib } = await supabase.from("contributions")
      .upsert({ member_id: member.id, amount: CONFIG.group.monthlyFee, month_key: currentKey, status: "pending" }, { onConflict: "member_id,month_key" })
      .select("id").single();
    try {
      await supabase.functions.invoke("mpesa-stk-push", {
        body: { phone: fmt.phone(member.phone), amount: CONFIG.group.monthlyFee, till: CONFIG.mpesa.till, contributionId: contrib?.id },
      });
      setStep("waiting");
    } catch (e) { console.error(e); setStep("waiting"); }
    setPaying(false);
  }, [member, currentKey]);

  if (loading) return <Spinner />;

  return (
    <div className="section-stack">
      {/* Status hero */}
      <div className={`contrib-hero ${paidThisMonth ? "contrib-hero-paid" : "contrib-hero-due"}`}>
        <div className="contrib-hero-inner">
          <div>
            <p className="contrib-month">{fmt.monthLabel()}</p>
            <h2 className="contrib-heading">{paidThisMonth ? "You're covered." : "Monthly contribution."}</h2>
            <p className="contrib-sub">
              {paidThisMonth
                ? `${fmt.currency(totalPaid)} total contributed.`
                : `Contribute ${fmt.currency(CONFIG.group.monthlyFee)} to stay active this month.`}
            </p>
          </div>
          <ActivePill active={paidThisMonth} />
        </div>
        {paidThisMonth && (
          <div className="contrib-check">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Paid for {fmt.monthLabel()}
          </div>
        )}
      </div>

      {contributions.length > 0 && <ContributionStreak contributions={contributions} />}

      {/* No phone — ask them to add one */}
      {!hasPhone && !paidThisMonth && (
        <NeuCard>
          <p className="waiting-title" style={{marginBottom:"0.25rem"}}>Add your M-Pesa number</p>
          <p className="waiting-sub" style={{marginBottom:"1rem"}}>Required to contribute via M-Pesa.</p>
          <div style={{display:"flex",gap:"0.6rem"}}>
            <input className="neu-input" type="tel" placeholder="07XX XXX XXX" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} style={{flex:1}} />
            <NeuBtn loading={savingPhone} onClick={savePhone}>Save</NeuBtn>
          </div>
        </NeuCard>
      )}

      {/* Pay block — only if they have a phone and haven't paid */}
      {hasPhone && !paidThisMonth && step === "idle" && (
        <NeuCard>
          {notSafaricom && (
            <div className="inline-notice inline-warn" style={{marginBottom:"1rem"}}>
              <strong>Safaricom only.</strong> Pay manually — Till <strong>{CONFIG.mpesa.till}</strong>.
            </div>
          )}
          <NeuBtn full loading={paying} onClick={handlePay}>
            Contribute {fmt.currency(CONFIG.group.monthlyFee)} · M-Pesa
          </NeuBtn>
          <p className="pay-hint">Prompt sent to <strong>{member.phone}</strong>. Enter your PIN.</p>
        </NeuCard>
      )}

      {step === "waiting" && !paidThisMonth && (
        <NeuCard>
          <div className="waiting-row">
            <span className="pulse-dot" />
            <div>
              <p className="waiting-title">Waiting for your PIN.</p>
              <p className="waiting-sub">Enter M-PESA PIN on {member.phone}. Auto-updates.</p>
            </div>
          </div>
          {pollCount > 6 && (
            <button className="text-link" style={{marginTop:"0.75rem"}} onClick={() => { refetch(); setStep("idle"); }}>
              Didn't receive a prompt? Try again
            </button>
          )}
        </NeuCard>
      )}

      {(step === "done" || (step === "waiting" && paidThisMonth)) && (
        <div className="inline-notice inline-success">
          <strong>Confirmed.</strong> Your account is active for {fmt.monthLabel()}.
        </div>
      )}

      {contributions.length > 0 && (
        <div>
          <p className="section-label">Payment history</p>
          <div className="neu-list">
            {contributions.slice(0,8).map(c => (
              <div key={c.id} className="neu-list-row">
                <div className="row-info">
                  <span className="row-title">{new Date(c.month_key+"-01").toLocaleDateString("en-KE",{month:"long",year:"numeric"})}</span>
                  <span className="row-meta">{fmt.date(c.created_at)}</span>
                </div>
                <div className="row-right">
                  <span className="row-amount">{fmt.currency(c.amount)}</span>
                  <StatusBadge status={c.status==="confirmed"?"approved":"pending"} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loan Module ──────────────────────────────────────────────────────────────
function LoanModule({ member, isActive }) {
  const [form, setForm] = useState({ full_name:"", reg_number:"", phone: member.phone??"", amount:"", description:"" });
  const [status, setStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const set = k => e => {
    const v = k==="reg_number" ? e.target.value.toUpperCase() : e.target.value;
    setForm(f => ({...f,[k]:v}));
    if (errors[k]) setErrors(p => ({...p,[k]:null}));
    if (status==="denied") setStatus(null);
  };

  if (!isActive) return (
    <div className="section-stack">
      <NeuCard className="gate-card">
        <div className="gate-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <p className="gate-title">Account inactive.</p>
        <p className="gate-sub">Contribute {fmt.currency(CONFIG.group.monthlyFee)} for {fmt.monthLabel()} to unlock loan requests.</p>
      </NeuCard>
    </div>
  );

  if (status === "submitted") return (
    <div className="section-stack">
      <div className="inline-notice inline-success">
        <strong>Request received.</strong> The treasurer will review and reach out.
      </div>
      <button className="text-link" onClick={() => { setStatus(null); setForm({full_name:"",reg_number:"",phone:member.phone??"",amount:"",description:""}); }}>
        Submit another
      </button>
    </div>
  );

  const handleSubmit = async () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Required.";
    if (!form.reg_number.trim()) e.reg_number = "Required.";
    if (!form.phone.trim()) e.phone = "Required.";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = "Enter a valid amount.";
    if (!form.description.trim()) e.description = "Required.";
    if (form.description.length > 100) e.description = "Max 100 chars.";
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!form.reg_number.startsWith(CONFIG.group.regPrefix)) { setStatus("denied"); return; }
    setStatus("loading");
    const { error } = await supabase.from("loan_requests").insert({
      member_id: member.id,
      description: form.description,
      reg_number: form.reg_number,
      amount: Number(form.amount),
      status: "pending",
    });
    if (!error) {
      await supabase.functions.invoke("send-loan-email", { body: { to: CONFIG.treasurer.email, subject:`Loan — ${form.full_name}`, member:{name:form.full_name,phone:form.phone,reg:form.reg_number}, loan:{amount:form.amount,description:form.description} } });
      setStatus("submitted");
    } else setStatus(null);
  };

  return (
    <div className="section-stack">
      {status==="denied" && (
        <div className="inline-notice inline-warn">
          <strong>Not eligible.</strong> This group supports {CONFIG.group.regPrefix} students.
        </div>
      )}
      <NeuCard>
        <div className="form-stack">
          <NeuInput label="Full name" placeholder="As per your ID" value={form.full_name} onChange={set("full_name")} error={errors.full_name} />
          <NeuInput label="Registration number" placeholder={`${CONFIG.group.regPrefix}/XXX/XXXX`} value={form.reg_number} onChange={set("reg_number")} style={{textTransform:"uppercase"}} error={errors.reg_number} />
          <NeuInput label="Phone number" type="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={set("phone")} error={errors.phone} />
          <NeuInput label="Amount (KSh)" type="number" placeholder="e.g. 2000" min="1" value={form.amount} onChange={set("amount")} error={errors.amount} />
          <NeuInput label="Description" hint={`  ·  ${100-form.description.length} left`} type="textarea" placeholder="What do you need this loan for?" value={form.description} maxLength={100} rows={3} onChange={set("description")} error={errors.description} />
          <NeuBtn full loading={status==="loading"} onClick={handleSubmit}>Submit request</NeuBtn>
        </div>
      </NeuCard>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage() {
  const [mode, setMode] = useState("choice"); // choice | email | code | reset | reset-sent
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  const handleGoogle = useCallback(async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) { setError("Could not connect to Google. Try again."); setLoading(false); }
  }, []);

  const handleSendCode = useCallback(async (isResend = false) => {
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    setLoading(true); setError(""); setResent(false);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    if (error) { setError("Couldn't send code. Try again."); setLoading(false); return; }
    setLoading(false);
    if (isResend) { setResent(true); setTimeout(() => setResent(false), 3000); }
    else setMode("code");
  }, [email]);

  const handleVerifyCode = useCallback(async () => {
    const cleaned = code.trim().replace(/\D/g, "");
    if (cleaned.length < 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: cleaned,
      type: "email",
    });
    if (error) { setError("Invalid or expired code. Try again."); setLoading(false); return; }
    // onAuthStateChange fires — App handles routing automatically
    // New users go to RegisterPage, existing users go to dashboard
  }, [email, code]);

  const handleResetRequest = useCallback(async () => {
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email address."); return; }
    setLoading(true); setError("");
    // Check if email exists in members table first
    const { data: member } = await supabase.from("members").select("id").eq("email", email.trim()).single();
    if (!member) {
      setError("No account found with that email address.");
      setLoading(false); return;
    }
    // Send OTP — they use it to sign back in (passwordless = no separate reset needed)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    if (error) { setError("Couldn't send code. Try again."); setLoading(false); return; }
    setLoading(false); setMode("reset-sent");
  }, [email]);

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  const EmailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
    </svg>
  );

  return (
    <div className="splash-page">
      <div className="splash-center">
        {mode === "choice" && (
          <div className="splash-brand">
            <p className="splash-eyebrow">Student Welfare</p>
            <h1 className="splash-title">{CONFIG.group.name}</h1>
            <p className="splash-tagline">{CONFIG.group.tagline}</p>
          </div>
        )}

        <NeuCard className="auth-panel">
          {error && <p className="neu-error" style={{textAlign:"center"}}>{error}</p>}

          {/* ── Choice ── */}
          {mode === "choice" && (
            <>
              <NeuBtn full variant="google" onClick={handleGoogle} loading={loading}>
                <GoogleIcon /> Continue with Google
              </NeuBtn>
              <div className="auth-divider"><span>or</span></div>
              <NeuBtn full variant="ghost" onClick={() => { setMode("email"); setError(""); }}>
                <EmailIcon /> Continue with Email
              </NeuBtn>
              <p className="auth-hint">Sign in or create an account — free, no password.</p>
            </>
          )}

          {/* ── Email entry ── */}
          {mode === "email" && (
            <>
              <p className="auth-step-label">Enter your email</p>
              <p className="auth-step-sub">We'll send a 6-digit code. No password needed.</p>
              <NeuInput
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSendCode()}
                autoFocus
              />
              <NeuBtn full loading={loading} onClick={() => handleSendCode(false)}>Send code</NeuBtn>
              <div className="auth-row-links">
                <button className="text-link" onClick={() => { setMode("choice"); setError(""); }}>← Back</button>
                <button className="text-link" onClick={() => { setMode("reset"); setError(""); }}>Forgot access?</button>
              </div>
            </>
          )}

          {/* ── OTP entry ── */}
          {mode === "code" && (
            <>
              <p className="auth-step-label">Check your inbox</p>
              <p className="auth-step-sub">6-digit code sent to <strong style={{color:"var(--fg)"}}>{email}</strong>. Expires in 10 min.</p>
              <NeuInput
                type="tel"
                inputMode="numeric"
                placeholder="· · · · · ·"
                maxLength={6}
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g,"")); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleVerifyCode()}
                autoFocus
                style={{letterSpacing:"0.25em", fontWeight:700, fontSize:"1.2rem", textAlign:"center"}}
              />
              <NeuBtn full loading={loading} onClick={handleVerifyCode}>Verify &amp; sign in</NeuBtn>
              <div className="auth-row-links">
                <button className="text-link" onClick={() => handleSendCode(true)}>
                  {resent ? "✓ Resent" : "Resend code"}
                </button>
                <button className="text-link" onClick={() => { setMode("email"); setCode(""); setError(""); }}>Change email</button>
              </div>
            </>
          )}

          {/* ── Reset / recover access ── */}
          {mode === "reset" && (
            <>
              <p className="auth-step-label">Recover access</p>
              <p className="auth-step-sub">Enter the email linked to your account. We'll send a sign-in code if it exists.</p>
              <NeuInput
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleResetRequest()}
                autoFocus
              />
              <NeuBtn full loading={loading} onClick={handleResetRequest}>Send sign-in code</NeuBtn>
              <button className="text-link" style={{textAlign:"center"}} onClick={() => { setMode("choice"); setError(""); }}>← Back to sign in</button>
            </>
          )}

          {/* ── Reset sent ── */}
          {mode === "reset-sent" && (
            <>
              <div className="auth-sent-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>
              </div>
              <p className="auth-step-label" style={{textAlign:"center"}}>Code sent.</p>
              <p className="auth-step-sub" style={{textAlign:"center"}}>Check <strong style={{color:"var(--fg)"}}>{email}</strong> for a 6-digit code to sign back in.</p>
              <NeuBtn full onClick={() => { setMode("code"); setError(""); }}>Enter code</NeuBtn>
              <button className="text-link" style={{textAlign:"center"}} onClick={() => { setMode("choice"); setEmail(""); setError(""); }}>← Back</button>
            </>
          )}
        </NeuCard>
      </div>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
// Shown when a signed-in user has no member record yet.
// Just collect their name and phone — no payment gate.
function RegisterPage({ session }) {
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailName  = session?.user?.user_metadata?.full_name ?? "";
  const userEmail  = session?.user?.email ?? "";
  const userAvatar = session?.user?.user_metadata?.avatar_url ?? "";

  // Pre-fill name from Google if available
  useEffect(() => {
    if (emailName && !form.full_name) setForm(f => ({...f, full_name: emailName}));
  }, [emailName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = useCallback(async () => {
    if (!form.full_name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.from("members").insert({
      full_name: form.full_name.trim(),
      email: userEmail,
      phone: form.phone.trim() ? fmt.phone(form.phone) : null,
      avatar_url: session?.user?.user_metadata?.avatar_url ?? null,
      paid: false,
    });
    if (err) { setError("Could not save. Try again."); setLoading(false); return; }
    window.location.href = window.location.pathname; // full reload — triggers member lookup
  }, [form, userEmail, session]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="splash-page">
      <div className="splash-center">
        <div className="splash-brand" style={{marginBottom:"1.5rem"}}>
          <h1 className="splash-title" style={{fontSize:"clamp(1.8rem,6vw,2.8rem)"}}>Almost there.</h1>
          <p className="splash-tagline">Tell us a bit about yourself.</p>
        </div>
        <NeuCard className="auth-panel">
          {userAvatar && (
            <div style={{display:"flex",justifyContent:"center",marginBottom:"0.25rem"}}>
              <img src={userAvatar} alt="" style={{width:52,height:52,borderRadius:"50%",boxShadow:"var(--neu-out-sm)"}} onError={e=>e.target.style.display="none"} />
            </div>
          )}
          <p style={{textAlign:"center",fontSize:"0.78rem",color:"var(--muted)"}}>{userEmail}</p>
          {error && <p className="neu-error" style={{textAlign:"center"}}>{error}</p>}
          <NeuInput
            label="Full name"
            placeholder="As it appears on your ID"
            value={form.full_name}
            onChange={e => { setForm(f=>({...f,full_name:e.target.value})); setError(""); }}
          />
          <NeuInput
            label="Phone number (optional)"
            type="tel"
            placeholder="07XX XXX XXX"
            value={form.phone}
            onChange={e => setForm(f=>({...f,phone:e.target.value}))}
          />
          <NeuBtn full loading={loading} onClick={handleJoin}>Join the group</NeuBtn>
          <button className="text-link" style={{textAlign:"center"}} onClick={async () => { await supabase.auth.signOut(); }}>
            Sign out
          </button>
        </NeuCard>
      </div>
    </div>
  );
}

// ─── Connect Hub ──────────────────────────────────────────────────────────────
function ConnectHub({ member }) {
  const [view, setView] = useState("group");
  const isTreasurer = member.email === CONFIG.treasurer.email;
  const VIEWS = [
    ["group", "Chat"],
    ["help", isTreasurer ? "Inbox" : "Ask"],
    ["people", "People"],
  ];
  return (
    <div className="connect-wrap">
      <div className="seg-control">
        {VIEWS.map(([key, label]) => (
          <button key={key} className={`seg-btn ${view===key?"seg-active":""}`} onClick={() => setView(key)}>{label}</button>
        ))}
      </div>
      {view==="group"  && <GroupChat member={member} isTreasurer={isTreasurer} />}
      {view==="help"   && <HelpDesk member={member} isTreasurer={isTreasurer} />}
      {view==="people" && <MembersView member={member} />}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, photo, size = 32 }) {
  const [err, setErr] = useState(false);
  if (photo && !err) return <img src={photo} alt={name} onError={() => setErr(true)} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,boxShadow:"var(--neu-out-sm)"}} />;
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:"var(--bg)",boxShadow:"var(--neu-out-sm)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:700,color:"var(--accent2)",flexShrink:0,letterSpacing:"-0.02em"}}>
      {fmt.initials(name ?? "?")}
    </div>
  );
}

// ─── Chat Composer ────────────────────────────────────────────────────────────
function ChatInput({ value, onChange, onSend, sending, placeholder="Message…", ref }) {
  return (
    <div className="chat-composer">
      <input ref={ref} className="chat-composer-input" placeholder={placeholder} value={value} onChange={onChange}
        onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} />
      <button className={`chat-send-btn ${value.trim()?"chat-send-active":""}`} onClick={onSend} disabled={sending||!value.trim()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  );
}

// ─── Group Chat ───────────────────────────────────────────────────────────────
function GroupChat({ member, isTreasurer }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [bcText, setBcText] = useState("");
  const [bcSending, setBcSending] = useState(false);
  const [bcSent, setBcSent] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);   // {id, name, content}
  const [reactions, setReactions] = useState({}); // msgId → {emoji: count}
  const [pinned, setPinned] = useState(null);
  const [selected, setSelected] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const EMOJIS = ["❤️","😂","👍","🙏","😮","😢"];

  const fetchMsgs = useCallback(async () => {
    const { data } = await supabase.from("group_messages")
      .select("*, members(full_name, avatar_url)")
      .eq("deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data ?? []);
    // Load reactions
    const { data: rxns } = await supabase.from("message_reactions").select("*");
    const map = {};
    (rxns ?? []).forEach(r => {
      if (!map[r.message_id]) map[r.message_id] = {};
      map[r.message_id][r.emoji] = (map[r.message_id][r.emoji] || 0) + 1;
    });
    setReactions(map);
    // Load pinned
    const { data: pins } = await supabase.from("group_messages").select("id,content,members(full_name)").eq("pinned", true).limit(1).single();
    if (pins) setPinned(pins);
  }, []);

  useEffect(() => { fetchMsgs(); }, [fetchMsgs]);
  useEffect(() => {
    const ch = supabase.channel("grp-v3")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_messages" }, () => fetchMsgs())
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => fetchMsgs())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchMsgs]);
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60); }, [messages]);
  useEffect(() => {
    if (!menuId && !emojiTarget) return;
    const close = (e) => {
      if (!e.target.closest(".msg-menu") && !e.target.closest(".emoji-bar") && !e.target.closest(".msg-action-dot")) {
        setMenuId(null); setEmojiTarget(null);
      }
    };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuId, emojiTarget]);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true); setText(""); setReplyTo(null);
    const { error } = await supabase.from("group_messages").insert({
      member_id: member.id, content, is_broadcast: false, deleted: false,
      reply_to_id: replyTo?.id ?? null, reply_preview: replyTo?.content?.slice(0, 60) ?? null,
      reply_sender: replyTo?.name ?? null,
    });
    if (error) { setText(content); }
    setSending(false);
    inputRef.current?.focus();
  }, [text, member.id, replyTo]);

  const broadcast = useCallback(async () => {
    const content = bcText.trim();
    if (!content) return;
    setBcSending(true); setBcText("");
    await supabase.from("group_messages").insert({ member_id: member.id, content, is_broadcast: true, deleted: false });
    setBcSending(false); setBcSent(true);
    setTimeout(() => setBcSent(false), 2500);
  }, [bcText, member.id]);

  const reactTo = useCallback(async (msgId, emoji) => {
    setEmojiTarget(null);
    const { data: existing } = await supabase.from("message_reactions").select("id")
      .eq("message_id", msgId).eq("member_id", member.id).eq("emoji", emoji).single();
    if (existing) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: msgId, member_id: member.id, emoji });
    }
    fetchMsgs();
  }, [member.id, fetchMsgs]);

  const pinMsg = useCallback(async (id) => {
    await supabase.from("group_messages").update({ pinned: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("group_messages").update({ pinned: true }).eq("id", id);
    setMenuId(null); fetchMsgs();
  }, [fetchMsgs]);

  const unpinMsg = useCallback(async () => {
    await supabase.from("group_messages").update({ pinned: false }).eq("pinned", true);
    setPinned(null); fetchMsgs();
  }, [fetchMsgs]);

  const copyMsg = (content) => { navigator.clipboard?.writeText(content); setMenuId(null); };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const deleteSelected = async () => {
    await Promise.all(selected.map(id => supabase.from("group_messages").update({ deleted: true }).eq("id", id).eq("member_id", member.id)));
    setSelected([]); setSelecting(false); fetchMsgs();
  };

  const grouped = useMemo(() => messages.map((m, i) => ({
    ...m,
    showMeta: i===0 || messages[i-1].member_id !== m.member_id || m.is_broadcast,
    showTime: i===messages.length-1 || messages[i+1].member_id !== m.member_id,
  })), [messages]);

  const formatTime = (ts) => new Date(ts).toLocaleTimeString("en-KE", { hour:"2-digit", minute:"2-digit" });

  return (
    <div className="chat-pane">
      {/* Pinned message */}
      {pinned && (
        <div className="pinned-bar">
          <span className="pinned-icon">📌</span>
          <div className="pinned-content">
            <span className="pinned-label">Pinned</span>
            <span className="pinned-text">{pinned.content}</span>
          </div>
          {isTreasurer && <button className="pinned-close" onClick={unpinMsg}>✕</button>}
        </div>
      )}

      {/* Select mode bar */}
      {selecting && (
        <div className="select-bar">
          <span>{selected.length} selected</span>
          <div style={{display:"flex",gap:"0.5rem"}}>
            <button className="neu-btn neu-btn-ghost neu-btn-small" onClick={() => { setSelecting(false); setSelected([]); }}>Cancel</button>
            {selected.length > 0 && <button className="neu-btn neu-btn-small" style={{color:"var(--danger)"}} onClick={deleteSelected}>Delete</button>}
          </div>
        </div>
      )}

      <div className="chat-feed">
        {grouped.length===0 && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <p>Group chat</p>
            <p className="chat-empty-sub">Be the first to say hello.</p>
          </div>
        )}
        {grouped.map(m => {
          const isMe = m.member_id === member.id;
          const msgReactions = reactions[m.id] ?? {};
          const isSelected = selected.includes(m.id);

          if (m.is_broadcast) return (
            <div key={m.id} className="bc-pill">
              <span className="bc-pip">📢</span>
              <span>{m.content}</span>
            </div>
          );

          return (
            <div key={m.id}
              className={`msg-wrap ${isMe?"msg-wrap-me":""} ${isSelected?"msg-selected":""}`}
              onClick={() => selecting && toggleSelect(m.id)}
              onLongPress={() => { setSelecting(true); toggleSelect(m.id); }}
            >
              {selecting && (
                <div className={`select-circle ${isSelected?"select-circle-on":""}`} />
              )}
              {!isMe && m.showMeta && <Avatar name={m.members?.full_name} photo={m.members?.avatar_url} size={26} />}
              {!isMe && !m.showMeta && <div style={{width:26,flexShrink:0}} />}

              <div className="msg-col">
                {m.showMeta && !isMe && <span className="msg-name">{m.members?.full_name ?? "Member"}</span>}

                <div className="msg-line">
                  {/* Context menu trigger — appears on hover */}
                  <div className="msg-actions" onClick={e => { e.stopPropagation(); setMenuId(menuId===m.id?null:m.id); setEmojiTarget(null); }}>
                    <span className="msg-action-dot">•••</span>
                    {menuId===m.id && (
                      <div className={`msg-menu ${isMe?"msg-menu-right":""}`}>
                        <button className="msg-menu-item" onClick={() => { setReplyTo({id:m.id, name: m.members?.full_name ?? "them", content: m.content}); setMenuId(null); inputRef.current?.focus(); }}>↩ Reply</button>
                        <button className="msg-menu-item" onClick={() => copyMsg(m.content)}>Copy</button>
                        <button className="msg-menu-item" onClick={() => { setEmojiTarget(emojiTarget===m.id?null:m.id); setMenuId(null); }}>React</button>
                        {isTreasurer && <button className="msg-menu-item" onClick={() => pinMsg(m.id)}>📌 Pin</button>}
                        {!selecting && <button className="msg-menu-item" onClick={() => { setSelecting(true); toggleSelect(m.id); setMenuId(null); }}>Select</button>}
                        {isMe && <button className="msg-menu-item msg-menu-danger" onClick={() => { setMessages(prev=>prev.filter(x=>x.id!==m.id)); setMenuId(null); }}>Delete for me</button>}
                        {isMe && <button className="msg-menu-item msg-menu-danger" onClick={async()=>{await supabase.from("group_messages").update({deleted:true,content:""}).eq("id",m.id);setMenuId(null);}}>Delete for everyone</button>}
                      </div>
                    )}
                  </div>

                  <div className="msg-bubble-wrap">
                    {/* Reply preview */}
                    {m.reply_preview && (
                      <div className={`reply-preview ${isMe?"reply-me":""}`}>
                        <span className="reply-sender">{m.reply_sender}</span>
                        <span className="reply-text">{m.reply_preview}</span>
                      </div>
                    )}
                    <div className={`msg-bubble ${isMe?"bubble-me":"bubble-them"}`}>{m.content}</div>
                  </div>
                </div>

                {/* Emoji picker */}
                {emojiTarget===m.id && (
                  <div className={`emoji-bar ${isMe?"emoji-bar-me":""}`} onClick={e=>e.stopPropagation()}>
                    {EMOJIS.map(emoji => (
                      <button key={emoji} className="emoji-btn" onClick={() => reactTo(m.id, emoji)}>{emoji}</button>
                    ))}
                  </div>
                )}

                {/* Reaction pills */}
                {Object.keys(msgReactions).length > 0 && (
                  <div className={`reaction-row ${isMe?"reaction-row-me":""}`}>
                    {Object.entries(msgReactions).map(([emoji, count]) => (
                      <button key={emoji} className="reaction-pill" onClick={() => reactTo(m.id, emoji)}>
                        {emoji} {count > 1 && <span>{count}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {m.showTime && <span className="msg-time">{formatTime(m.created_at)}</span>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <span className="reply-bar-sender">Replying to {replyTo.name}</span>
            <span className="reply-bar-text">{replyTo.content.slice(0, 80)}</span>
          </div>
          <button className="reply-bar-close" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {isTreasurer && (
        <div className="bc-composer">
          <span style={{fontSize:"14px",flexShrink:0}}>📢</span>
          <input className="chat-composer-input" placeholder="Broadcast to everyone…" value={bcText} onChange={e=>setBcText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&broadcast()} />
          <button className={`chat-send-btn ${bcText.trim()?"chat-send-active":""}`} onClick={broadcast} disabled={bcSending||!bcText.trim()}>
            {bcSent ? "✓" : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>}
          </button>
        </div>
      )}

      <ChatInput ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onSend={send} sending={sending} />
    </div>
  );
}

// ─── Help Desk + AI Assistant ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Stahili — the friendly assistant for the Stahili Welfare Group, a student welfare community at Kibabii University for Computer Science students.

You are warm, human, and genuinely helpful. You talk like a supportive friend who happens to know everything about the welfare group.

CRITICAL RULES:
1. For casual messages ("hi", "hello", "ok", "thanks", "cool", "great") — just respond warmly and naturally. NEVER say "I'll flag this for the admin". Just chat.
2. Only say you'll escalate to admin for SPECIFIC personal account problems (e.g. "my payment didn't reflect", "I was wrongly declined") that genuinely need human intervention.
3. Keep replies SHORT — 1-3 sentences. Don't over-explain.
4. Use a warm, youthful, friendly tone. Light emoji is fine.

KEY FACTS (answer these directly, don't escalate):
- Group name: Stahili Welfare Group
- Joining fee: KSh 50 (one-time, M-Pesa)
- Monthly contribution: KSh 200 (keeps account active)
- Till number: ${CONFIG.mpesa.till}
- Loans: need active account, approved within 24hrs by treasurer
- Registration must start with "COM" to apply for loans
- Executives: Chairperson Isaac Kipngetich, Vice Chair Daisy Sakwa, Secretary Kelvin Simiyu, Treasurer Brevian Emmanuel
- WhatsApp group in the About tab

CONVERSATION EXAMPLES:
User: "hi" → "Hey! 👋 How can I help you today?"
User: "ok thanks" → "Anytime! 😊 Anything else?"
User: "how do I contribute?" → "Go to the Contribute tab and tap 'Pay KSh 200 · M-Pesa'. A prompt goes to your phone — enter your PIN and you're done! ✓"
User: "my account shows inactive" → "Your account goes active once you contribute KSh 200 for the current month. Head to the Contribute tab to pay. Takes less than a minute! 😊"`;


function HelpDesk({ member, isTreasurer }) {
  const [threads, setThreads] = useState({});
  const [activeThread, setActiveThread] = useState(null);
  const [myMessages, setMyMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const bottomRef = useRef(null);
  const chatHistory = useRef([]); // tracks conversation for Claude context

  const fetchAll = useCallback(async () => {
    if (isTreasurer) {
      const { data } = await supabase.from("help_messages")
        .select("*, members(full_name, avatar_url)")
        .eq("deleted", false)
        .order("created_at", { ascending: true })
        .limit(500);
      const map = {};
      (data ?? []).forEach(m => {
        const key = m.member_id;
        if (!map[key]) map[key] = { name: m.members?.full_name ?? "Member", avatar: m.members?.avatar_url, msgs: [], lastAt: m.created_at };
        map[key].msgs.push(m);
        map[key].lastAt = m.created_at;
      });
      setThreads(map);
      if (!activeThread && Object.keys(map).length > 0) setActiveThread(Object.keys(map)[0]);
    } else {
      const { data } = await supabase.from("help_messages")
        .select("*")
        .eq("member_id", member.id)
        .eq("deleted", false)
        .order("created_at", { ascending: true });
      const msgs = data ?? [];
      setMyMessages(msgs);
      // Build Claude conversation history
      chatHistory.current = msgs.map(m => ({
        role: m.is_admin_reply ? "assistant" : "user",
        content: m.content,
      }));
    }
  }, [member.id, isTreasurer, activeThread]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = supabase.channel("help-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "help_messages" }, () => fetchAll())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [myMessages, aiTyping, activeThread]);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuId]);

  const deleteMsg = useCallback(async (id, everyone) => {
    if (everyone) {
      await supabase.from("help_messages").update({ deleted: true, content: "" }).eq("id", id);
    } else {
      setMyMessages(prev => prev.filter(m => m.id !== id));
    }
    setMenuId(null);
  }, []);

  // Call Claude via Supabase Edge Function (keeps API key server-side)
  const getAIReply = useCallback(async (userMessage) => {
    const history = [
      ...chatHistory.current,
      { role: "user", content: userMessage },
    ];
    try {
      const { data, error } = await supabase.functions.invoke("chat-assistant", {
        body: { messages: history, system: SYSTEM_PROMPT },
      });
      if (error) throw error;
      return data?.reply ?? "I'm not sure about that — let me flag it for the admin team!";
    } catch (e) {
      console.error("AI error:", e);
      return "I'm not sure about that — let me flag it for the admin team!";
    }
  }, []);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true); setText("");

    if (isTreasurer) {
      await supabase.from("help_messages").insert({ member_id: activeThread, content, is_admin_reply: true, is_bot: false, deleted: false });
      setSending(false); return;
    }

    // Save member message
    await supabase.from("help_messages").insert({ member_id: member.id, content, is_admin_reply: false, is_bot: false, deleted: false });
    setSending(false);

    // Get AI reply
    setAiTyping(true);
    const reply = await getAIReply(content);
    setAiTyping(false);

    await supabase.from("help_messages").insert({
      member_id: member.id,
      content: reply,
      is_admin_reply: true,
      is_bot: true,
      deleted: false,
    });
  }, [text, member.id, isTreasurer, activeThread, getAIReply]);

  const formatTime = (ts) => new Date(ts).toLocaleTimeString("en-KE", { hour:"2-digit", minute:"2-digit" });

  // ── Admin view ──
  if (isTreasurer) {
    const threadList = Object.entries(threads).sort((a,b) => new Date(b[1].lastAt)-new Date(a[1].lastAt));
    const activeMsgs = activeThread ? (threads[activeThread]?.msgs ?? []) : [];
    return (
      <div className="help-admin-wrap">
        <div className="thread-list">
          {threadList.length===0 && <p className="empty-msg" style={{padding:"1.25rem"}}>No messages yet.</p>}
          {threadList.map(([id,{name,avatar,msgs}]) => (
            <button key={id} className={`thread-item ${activeThread===id?"thread-item-active":""}`} onClick={() => setActiveThread(id)}>
              <Avatar name={name} photo={avatar} size={38} />
              <div className="thread-item-info">
                <span className="thread-item-name">{name}</span>
                <span className="thread-item-preview">{msgs[msgs.length-1]?.content ?? ""}</span>
              </div>
            </button>
          ))}
        </div>
        {activeThread && (
          <div className="chat-pane" style={{marginTop:"1rem"}}>
            <p className="help-thread-label">↳ {threads[activeThread]?.name}</p>
            <div className="chat-feed" style={{maxHeight:"260px"}}>
              {activeMsgs.map(m => (
                <div key={m.id} className={`msg-wrap ${m.is_admin_reply?"msg-wrap-me":""}`}>
                  <div className="msg-col">
                    {m.is_admin_reply && <span className="msg-name" style={{textAlign:"right"}}>{m.is_bot?"🤖 Assistant":"You (Admin)"}</span>}
                    <div className={`msg-bubble ${m.is_admin_reply?"bubble-me":"bubble-them"}`}>{m.content}</div>
                    <span className="msg-time">{formatTime(m.created_at)}</span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <ChatInput value={text} onChange={e=>setText(e.target.value)} onSend={send} sending={sending} placeholder={`Reply to ${threads[activeThread]?.name}…`} />
          </div>
        )}
      </div>
    );
  }

  // ── Member view ──
  return (
    <div className="chat-pane">
      <div className="chat-feed">
        {myMessages.length===0 && !aiTyping && (
          <div className="chat-empty-state">
            <div className="help-bot-avatar">🤖</div>
            <p style={{fontWeight:600,fontSize:"0.9rem"}}>Stahili Assistant</p>
            <p className="chat-empty-sub" style={{maxWidth:"220px",textAlign:"center"}}>Hi {member.full_name?.split(" ")[0]} 👋<br/>Ask me anything about the welfare group.</p>
          </div>
        )}
        {myMessages.map(m => {
          const isMe = !m.is_admin_reply;
          return (
            <div key={m.id} className={`msg-wrap ${isMe?"msg-wrap-me":""}`}>
              {!isMe && (
                <div className="help-bot-icon">{m.is_bot?"🤖":"👤"}</div>
              )}
              <div className="msg-col">
                {!isMe && <span className="msg-name">{m.is_bot?"Assistant":"Admin"}</span>}
                <div className="msg-line">
                  {isMe && (
                    <div className="msg-actions" onClick={e=>{e.stopPropagation();setMenuId(menuId===m.id?null:m.id);}}>
                      <span className="msg-action-dot">···</span>
                      {menuId===m.id && (
                        <div className="msg-menu">
                          <button className="msg-menu-item" onClick={()=>deleteMsg(m.id,false)}>Delete for me</button>
                          <button className="msg-menu-item msg-menu-danger" onClick={()=>deleteMsg(m.id,true)}>Delete for everyone</button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`msg-bubble ${isMe?"bubble-me":"bubble-them"}`}>{m.content}</div>
                </div>
                <span className="msg-time">{formatTime(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        {aiTyping && (
          <div className="msg-wrap">
            <div className="help-bot-icon">🤖</div>
            <div className="msg-col">
              <span className="msg-name">Assistant</span>
              <div className="msg-bubble bubble-them typing-dots"><span/><span/><span/></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput value={text} onChange={e=>setText(e.target.value)} onSend={send} sending={sending} placeholder="Ask anything…" />
    </div>
  );
}

// ─── Members View ─────────────────────────────────────────────────────────────
function MembersView() {
  const { members, loading } = useMembers();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return s ? members.filter(m => m.full_name?.toLowerCase().includes(s) || m.phone?.includes(s)) : members;
  }, [members, q]);
  const activeCount = useMemo(() => members.filter(m => m.paid).length, [members]);

  if (loading) return <Spinner />;
  return (
    <div className="section-stack">
      <div className="members-header">
        <div>
          <p className="section-label" style={{marginBottom:"0.1rem"}}>Members</p>
          <p style={{fontSize:"0.73rem",color:"var(--muted)"}}>{activeCount} of {members.length} active</p>
        </div>
        <input className="neu-input" style={{maxWidth:"150px",padding:"0.5rem 0.8rem",fontSize:"0.8rem",borderRadius:"999px"}} placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="neu-list">
        {filtered.map(m => (
          <div key={m.id} className="neu-list-row" style={{alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flex:1,minWidth:0}}>
              <Avatar name={m.full_name} photo={m.avatar_url} size={38} />
              <div className="row-info">
                <span className="row-title">{m.full_name}</span>
                <span className="row-meta">{m.phone ?? m.email ?? ""}</span>
              </div>
            </div>
            <ActivePill active={m.paid} />
          </div>
        ))}
        {filtered.length===0 && <p className="empty-msg" style={{padding:"1.5rem"}}>No members found.</p>}
      </div>
    </div>
  );
}
// ─── About Tab ────────────────────────────────────────────────────────────────
function AboutTab() {
  return (
    <div className="section-stack">
      <NeuCard className="community-card">
        <h2 className="community-title">{CONFIG.group.description}</h2>
        <div className="benefit-stack">
          {["Emergency financial support when it matters most.", "A community that moves as one.", "Student welfare, handled with dignity."].map(b => (
            <div key={b} className="benefit-row"><span className="benefit-dot"/><span>{b}</span></div>
          ))}
        </div>
      </NeuCard>
      <div className="wa-card">
        <div>
          <h3 className="wa-title">Join the conversation.</h3>
          <p className="wa-sub">Updates, support, and community — all in one place.</p>
        </div>
        <a href={CONFIG.group.whatsapp} target="_blank" rel="noreferrer" className="neu-btn neu-btn-accent">Join WhatsApp</a>
      </div>
      <p className="section-label">Executive Team</p>
      <div className="exec-grid">
        {CONFIG.executives.map(ex => (
          <NeuCard key={ex.name} className="exec-card">
            <div className="exec-avatar-wrap">
              <img src={ex.photo} alt={ex.name} className="exec-avatar" onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
              <div className="exec-initials" style={{display:"none"}}>{fmt.initials(ex.name)}</div>
            </div>
            <span className="exec-name">{ex.name}</span>
            <span className="exec-role">{ex.title}</span>
            <span className="exec-bio">{ex.bio}</span>
          </NeuCard>
        ))}
      </div>
      <NeuCard>
        <div className="dev-row">
          <div>
            <p className="dev-name">{CONFIG.developer.name}</p>
            <p className="dev-desc">{CONFIG.developer.description}</p>
          </div>
          <a href={CONFIG.developer.portfolio} target="_blank" rel="noreferrer" className="neu-btn neu-btn-ghost neu-btn-small">Portfolio →</a>
        </div>
      </NeuCard>
    </div>
  );
}
// ─── Events Feed (Hero) ───────────────────────────────────────────────────────
const HARDCODED_EVENTS = [
  {
    id: "evt-condolence-kilwake",
    type: "condolence",
    title: "In Memory of Love Kilwake",
    body: "We extend our deepest condolences to Lecturer Juma Kilwake on the passing of his beloved daughter, Love Kilwake. May her gentle soul rest in eternal peace. As a community, we hold the Kilwake family close in this painful season. Contributions are ongoing — let us show up, as we always do, for one of our own.",
    date: "April 2025",
    images: [],
    contributors: [
      { name: "Isaac Kipngetich", note: "May she rest well." },
      { name: "Daisy Sakwa", note: "Our hearts are with the family." },
      { name: "Kelvin Simiyu", note: "Praying for strength." },
      { name: "Brevian Emmanuel", note: "Coordinating contributions." },
    ],
  },
  {
    id: "evt-celebration-wilikister",
    type: "celebration",
    title: "Welcome, little one! 🍼",
    body: "We are overjoyed to celebrate our very own Wilikister on the arrival of her beautiful newborn. A new life. A new beginning. This is one of those moments that reminds us why community matters. May motherhood bring you immeasurable joy, strength, and love. We stand with you, always. 💚",
    date: "April 2025",
    images: [],
    contributors: [
      { name: "Stahili Welfare", note: "With love from the whole group." },
    ],
  },
];

function EventsFeed({ member, isTreasurer }) {
  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState("evt-condolence-kilwake");
  const [creating, setCreating] = useState(false);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase.from("events")
      .select("*, event_contributors(*)")
      .order("created_at", { ascending: false });
    setDbEvents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Merge hardcoded + db events, hardcoded first
  const allEvents = useMemo(() => {
    const dbFormatted = dbEvents.map(ev => ({
      id: ev.id, type: ev.type, title: ev.title, body: ev.body,
      date: fmt.date(ev.created_at), images: ev.images ?? [],
      contributors: (ev.event_contributors ?? []).map(c => ({ name: c.name, note: c.note })),
      isDb: true,
    }));
    return [...HARDCODED_EVENTS, ...dbFormatted];
  }, [dbEvents]);

  const typeConfig = {
    celebration: { emoji: "🎉", color: "#5a9a7a", gradient: "linear-gradient(140deg, #3d7a5e 0%, #5a9a7a 60%, #7aba9a 100%)", label: "Celebration" },
    condolence:  { emoji: "🕊️", color: "#6a7a9a", gradient: "linear-gradient(140deg, #3d4d6a 0%, #5a6a8a 60%, #7a8aaa 100%)", label: "In Memoriam" },
    update:      { emoji: "📋", color: "#8a7a5a", gradient: "linear-gradient(140deg, #6a5a3a 0%, #8a7a5a 60%, #aaa07a 100%)", label: "Update" },
    urgent:      { emoji: "⚡", color: "#9a6a6a", gradient: "linear-gradient(140deg, #7a3a3a 0%, #9a5a5a 60%, #ba7a7a 100%)", label: "Urgent" },
  };

  const DefAvatar = ({ name, size = 30 }) => {
    const pal = ["#5a9a7a","#6a7a9a","#8a7a5a","#9a6a6a","#7a8a9a"];
    return (
      <div style={{width:size,height:size,borderRadius:"50%",background:pal[name.charCodeAt(0)%pal.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:600,color:"#fff",flexShrink:0}}>
        {fmt.initials(name)}
      </div>
    );
  };

  if (loading) return <Spinner />;
  if (creating) return <EventsTab member={member} isTreasurer={isTreasurer} onClose={() => { setCreating(false); fetchEvents(); }} createOnly />;

  const hero = allEvents[0];
  const rest = allEvents.slice(1);

  return (
    <div className="events-feed">
      <div className="events-feed-header">
        <div>
          <p className="events-feed-label">What's happening</p>
          <p className="events-feed-sub">Welfare news & community moments</p>
        </div>
        {isTreasurer && (
          <button className="events-post-btn" onClick={() => setCreating(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Post
          </button>
        )}
      </div>

      {/* ── Hero card ── */}
      {hero && (() => {
        const tc = typeConfig[hero.type] ?? typeConfig.update;
        const isOpen = expanded === hero.id;
        return (
          <div className="feed-card feed-card-hero" onClick={() => setExpanded(isOpen ? null : hero.id)}>
            <div className="feed-hero-inner" style={{background: tc.gradient}}>
              <div className="feed-hero-content">
                <div className="feed-hero-tag">{tc.emoji} {tc.label}</div>
                <h2 className="feed-hero-title">{hero.title}</h2>
                <p className="feed-hero-body">{hero.body}</p>
                <span className="feed-hero-date">{hero.date}</span>
              </div>
              {hero.images?.[0] && (
                <div className="feed-hero-image"><img src={hero.images[0]} alt="" /></div>
              )}
            </div>
            {isOpen && hero.contributors?.length > 0 && (
              <div className="feed-expanded">
                <p className="feed-contribs-label">Contributors</p>
                <div className="feed-contribs-list">
                  {hero.contributors.map((c,i) => (
                    <div key={i} className="feed-contrib-chip">
                      <DefAvatar name={c.name} size={28} />
                      <div><p className="feed-contrib-name">{c.name}</p>{c.note && <p className="feed-contrib-note">{c.note}</p>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Rest cards ── */}
      {rest.map(ev => {
        const tc = typeConfig[ev.type] ?? typeConfig.update;
        const isOpen = expanded === ev.id;
        return (
          <div key={ev.id} className="feed-card" style={{"--event-color": tc.color}} onClick={() => setExpanded(isOpen ? null : ev.id)}>
            <div className="feed-regular">
              <div className="feed-regular-accent" style={{background: tc.color}} />
              <div className="feed-regular-content">
                <div className="feed-regular-tag">
                  <span>{tc.emoji}</span>
                  <span style={{color: tc.color}}>{tc.label}</span>
                  <span className="feed-regular-date">{ev.date}</span>
                </div>
                <h3 className="feed-regular-title">{ev.title}</h3>
                <p className={`feed-regular-body ${isOpen?"":"feed-clamp"}`}>{ev.body}</p>
              </div>
              {ev.images?.[0] && (
                <div className="feed-regular-thumb"><img src={ev.images[0]} alt="" /></div>
              )}
            </div>
            {isOpen && ev.contributors?.length > 0 && (
              <div className="feed-expanded">
                <p className="feed-contribs-label">Contributors</p>
                <div className="feed-contribs-list">
                  {ev.contributors.map((c,i) => (
                    <div key={i} className="feed-contrib-chip">
                      <DefAvatar name={c.name} size={26} />
                      <div><p className="feed-contrib-name">{c.name}</p>{c.note && <p className="feed-contrib-note">{c.note}</p>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Events Tab (create + list, used from feed) ────────────────────────────────
function EventsTab({ member, isTreasurer, onClose, createOnly }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(!createOnly);
  const [creating, setCreating] = useState(!!createOnly);
  const [expanded, setExpanded] = useState(null);

  // New event form
  const [form, setForm] = useState({
    title: "", body: "", type: "celebration", images: [], contributors: [{ name: "", note: "" }],
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("events")
      .select("*, event_contributors(*)")
      .order("created_at", { ascending: false });
    setEvents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleImages = useCallback((e) => {
    const files = Array.from(e.target.files ?? []);
    const readers = files.map(f => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res({ name: f.name, data: r.result, type: f.type });
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(imgs => setForm(f => ({ ...f, images: [...f.images, ...imgs].slice(0, 4) })));
  }, []);

  const removeImage = (i) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const setContrib = (i, field, val) => {
    setForm(f => {
      const c = [...f.contributors];
      c[i] = { ...c[i], [field]: val };
      return { ...f, contributors: c };
    });
  };

  const saveEvent = useCallback(async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);

    // Upload images to Supabase storage
    const imageUrls = [];
    for (const img of form.images) {
      const path = `events/${Date.now()}-${img.name}`;
      const base64 = img.data.split(",")[1];
      const blob = await fetch(img.data).then(r => r.blob());
      const { data: uploaded } = await supabase.storage.from("event-images").upload(path, blob, { contentType: img.type });
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from("event-images").getPublicUrl(path);
        imageUrls.push(publicUrl);
      }
    }

    const { data: ev, error } = await supabase.from("events").insert({
      title: form.title.trim(),
      body: form.body.trim(),
      type: form.type,
      images: imageUrls,
      created_by: member.id,
    }).select("id").single();

    if (!error && ev) {
      const validContribs = form.contributors.filter(c => c.name.trim());
      if (validContribs.length > 0) {
        await supabase.from("event_contributors").insert(
          validContribs.map(c => ({ event_id: ev.id, name: c.name.trim(), note: c.note.trim() }))
        );
      }
    }

    setSaving(false);
    setCreating(false);
    setForm({ title: "", body: "", type: "celebration", images: [], contributors: [{ name: "", note: "" }] });
    if (onClose) onClose();
    else fetchEvents();
  }, [form, member.id, fetchEvents]);

  const typeConfig = {
    celebration: { emoji: "🎉", color: "#7eb89c", bg: "rgba(126,184,156,0.08)", label: "Celebration" },
    condolence:  { emoji: "🕊️", color: "#8a9dc3", bg: "rgba(138,157,195,0.08)", label: "Condolence" },
    update:      { emoji: "📋", color: "#b8a87e", bg: "rgba(184,168,126,0.08)", label: "Update" },
    urgent:      { emoji: "⚡", color: "#c38a8a", bg: "rgba(195,138,138,0.08)", label: "Urgent" },
  };

  // Default avatar based on name initial
  const DefaultAvatar = ({ name, size = 36 }) => {
    const colors = ["#7eb89c","#8a9dc3","#b8a87e","#c38a8a","#9aabb8","#b89c7e"];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
      <div style={{ width:size, height:size, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:600, color:"#fff", flexShrink:0, letterSpacing:"-0.02em" }}>
        {fmt.initials(name)}
      </div>
    );
  };

  if (loading) return <Spinner />;

  // ── Create form ──
  if (creating) {
    const tc = typeConfig[form.type];
    return (
      <div className="section-stack">
        <div className="event-create-header">
          <h3 className="event-create-title">New Event</h3>
        <button className="text-link" onClick={() => { setCreating(false); if (onClose) onClose(); }}>Cancel</button>
        </div>

        {/* Type selector */}
        <div className="event-type-row">
          {Object.entries(typeConfig).map(([key, t]) => (
            <button key={key} className={`event-type-btn ${form.type===key?"event-type-active":""}`}
              style={form.type===key?{borderColor:t.color,color:t.color}:{}}
              onClick={() => setForm(f=>({...f,type:key}))}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <NeuCard>
          <div className="form-stack">
            <NeuInput label="Title" placeholder="e.g. Congratulations Wilikister!" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
            <div className="neu-field">
              <label className="neu-label">Announcement</label>
              <textarea className="neu-input neu-textarea" rows={4} placeholder="Write a warm, clear message…" value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} />
            </div>
          </div>
        </NeuCard>

        {/* Images */}
        <NeuCard>
          <p className="section-label" style={{marginBottom:"0.75rem"}}>Images (up to 4)</p>
          <div className="event-images-grid">
            {form.images.map((img, i) => (
              <div key={i} className="event-img-thumb">
                <img src={img.data} alt="" />
                <button className="event-img-remove" onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
            {form.images.length < 4 && (
              <button className="event-img-add" onClick={() => fileRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImages} />
        </NeuCard>

        {/* Contributors */}
        <NeuCard>
          <p className="section-label" style={{marginBottom:"0.75rem"}}>Contributors</p>
          <div className="form-stack">
            {form.contributors.map((c, i) => (
              <div key={i} className="contrib-row">
                <input className="neu-input" placeholder="Name" value={c.name} onChange={e=>setContrib(i,"name",e.target.value)} style={{flex:1}} />
                <input className="neu-input" placeholder="Note (optional)" value={c.note} onChange={e=>setContrib(i,"note",e.target.value)} style={{flex:1.5}} />
                {form.contributors.length > 1 && <button className="text-link" style={{color:"var(--danger)",fontSize:"1rem"}} onClick={()=>setForm(f=>({...f,contributors:f.contributors.filter((_,j)=>j!==i)}))}>✕</button>}
              </div>
            ))}
            <button className="text-link" onClick={()=>setForm(f=>({...f,contributors:[...f.contributors,{name:"",note:""}]}))}>+ Add contributor</button>
          </div>
        </NeuCard>

        <NeuBtn full loading={saving} onClick={saveEvent}>Post Event</NeuBtn>
      </div>
    );
  }

  // ── Events list ──
  return (
    <div className="section-stack">
      {isTreasurer && (
        <NeuBtn full onClick={() => setCreating(true)} variant="primary">
          + New Event
        </NeuBtn>
      )}

      {events.length === 0 && (
        <div className="chat-empty-state">
          <div className="chat-empty-icon">📅</div>
          <p>No events yet</p>
          <p className="chat-empty-sub">Events and announcements will appear here.</p>
        </div>
      )}

      {events.map(ev => {
        const tc = typeConfig[ev.type] ?? typeConfig.update;
        const isOpen = expanded === ev.id;
        const contribs = ev.event_contributors ?? [];

        return (
          <div key={ev.id} className="event-card" style={{"--event-color": tc.color, "--event-bg": tc.bg}}>
            {/* Header */}
            <div className="event-card-header" onClick={() => setExpanded(isOpen ? null : ev.id)}>
              <div className="event-type-pip" style={{background: tc.color}}>{tc.emoji}</div>
              <div className="event-card-meta">
                <span className="event-type-label" style={{color: tc.color}}>{tc.label}</span>
                <h3 className="event-title">{ev.title}</h3>
                <span className="event-date">{fmt.date(ev.created_at)}</span>
              </div>
              <div className={`event-chevron ${isOpen?"event-chevron-open":""}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            {/* Always show first 2 lines */}
            <p className={`event-body ${isOpen?"event-body-open":""}`}>{ev.body}</p>

            {isOpen && (
              <>
                {/* Images */}
                {ev.images?.length > 0 && (
                  <div className={`event-img-grid event-img-grid-${ev.images.length}`}>
                    {ev.images.map((url, i) => (
                      <div key={i} className="event-img-cell">
                        <img src={url} alt="" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Contributors */}
                {contribs.length > 0 && (
                  <div className="event-contribs">
                    <p className="section-label" style={{marginBottom:"0.6rem"}}>Contributors</p>
                    <div className="event-contrib-list">
                      {contribs.map((c, i) => (
                        <div key={i} className="event-contrib-item">
                          <DefaultAvatar name={c.name} size={32} />
                          <div>
                            <p className="event-contrib-name">{c.name}</p>
                            {c.note && <p className="event-contrib-note">{c.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Welfare Voice ────────────────────────────────────────────────────────────
function WelfareVoice({ member }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("need-help");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);

  const CATEGORIES = [
    { key:"need-help",    label:"I need help",       emoji:"🙏" },
    { key:"suggestion",   label:"Suggestion",         emoji:"💡" },
    { key:"appreciation", label:"Appreciation",       emoji:"❤️" },
    { key:"complaint",    label:"Concern",            emoji:"⚠️" },
  ];

  const submit = useCallback(async () => {
    if (!text.trim()) return;
    setSending(true);
    await supabase.from("welfare_voices").insert({
      member_id: member.id,
      category,
      message: text.trim(),
    });
    setSending(false); setSent(true); setText(""); setOpen(false);
    setTimeout(() => setSent(false), 4000);
  }, [text, category, member.id]);

  return (
    <div className="voice-section">
      {sent && (
        <div className="voice-sent">
          <span>✓</span> Your message reached the admin. Thank you for speaking up.
        </div>
      )}
      {!open ? (
        <button className="voice-trigger" onClick={() => setOpen(true)}>
          <span className="voice-trigger-icon">🗣️</span>
          <div>
            <p className="voice-trigger-title">Share your welfare situation</p>
            <p className="voice-trigger-sub">Need help? Have a suggestion? Let us know.</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      ) : (
        <NeuCard>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.85rem"}}>
            <p style={{fontFamily:"var(--font-head)",fontSize:"1rem",fontWeight:400}}>Your welfare voice</p>
            <button className="text-link" style={{fontSize:"0.8rem"}} onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="voice-cats">
            {CATEGORIES.map(c => (
              <button key={c.key} className={`voice-cat-btn ${category===c.key?"voice-cat-active":""}`} onClick={() => setCategory(c.key)}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <textarea
            className="neu-input neu-textarea"
            rows={3}
            placeholder={category==="need-help" ? "Describe your situation. We're listening and we care." : category==="suggestion" ? "What would make Stahili better?" : category==="appreciation" ? "Who or what made a difference?" : "Share your concern — it will be addressed."}
            value={text}
            onChange={e => setText(e.target.value)}
            style={{marginTop:"0.75rem"}}
          />
          <NeuBtn full loading={sending} onClick={submit} style={{marginTop:"0.75rem"}}>
            Send to Admin
          </NeuBtn>
        </NeuCard>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage({ member, onLogout }) {
  const { loans, loading: loansLoading } = useLoans(member.id);
  const { contributions } = useContributions(member.id);
  const ann = useAnnouncement();
  const [tab, setTab] = useState("home");
  const isTreasurer = member.email === CONFIG.treasurer.email;

  const isActive = useMemo(() => contributions.some(c => c.month_key===fmt.monthKey() && c.status==="confirmed"), [contributions]);
  const stats = useMemo(() => ({
    total: loans.length,
    approved: loans.filter(l => l.status==="approved").length,
    borrowed: loans.filter(l => l.status==="approved").reduce((s,l) => s+Number(l.amount), 0),
  }), [loans]);
  const pendingCount = useMemo(() => loans.filter(l => l.status==="pending").length, [loans]);

  const DOCK = [
    { key:"home",       icon:"⌂",  label:"Home"      },
    { key:"contribute", icon:"◎",  label:"Contribute" },
    { key:"community",  icon:"💬", label:"Community"  },
    { key:"loans",      icon:"≡",  label:"Loans", badge: pendingCount||null },
    { key:"more",       icon:"···", label:"More"     },
  ];

  return (
    <div className="dash-page dash-with-dock">
      <AnnouncementBanner ann={ann} />

      {/* ── Scrollable content ── */}
      <div className="dash-scroll-area">

        {/* ── HOME ── */}
        {tab==="home" && (
          <>
            <header className="dash-top-bar">
              <div>
                <p className="dash-eyebrow">Welcome back</p>
                <h2 className="dash-name">{member.full_name}</h2>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                <ActivePill active={isActive} />
                <button className="text-link" onClick={onLogout}>Sign out</button>
              </div>
            </header>

            {/* Welfare status card */}
            <div className="welfare-hero-card" onClick={() => setTab("contribute")}>
              <div className="welfare-hero-left">
                <p className="welfare-hero-label">Monthly contribution</p>
                <h3 className="welfare-hero-amount">{fmt.currency(CONFIG.group.monthlyFee)}</h3>
                <p className="welfare-hero-sub">{isActive ? "You're active this month ✓" : "Contribute to stay active"}</p>
              </div>
              <div className={`welfare-hero-pip ${isActive?"pip-active":"pip-inactive"}`} />
            </div>

            {/* Events feed — the soul of the page */}
            <EventsFeed member={member} isTreasurer={isTreasurer} />

            {/* Welfare voice — share your situation */}
            <WelfareVoice member={member} />

            {/* Compact stats */}
            <div className="home-stats-row">
              {[{l:"My Requests",v:stats.total,action:()=>setTab("loans")},{l:"Approved",v:stats.approved,action:()=>setTab("loans")},{l:"Borrowed",v:fmt.currency(stats.borrowed),action:()=>setTab("loans")}].map(({l,v,action}) => (
                <div key={l} className="stat-tile" style={{cursor:"pointer"}} onClick={action}>
                  <span className="stat-val">{v}</span>
                  <span className="stat-lbl">{l}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CONTRIBUTE ── */}
        {tab==="contribute" && (
          <>
            <header className="dash-top-bar">
              <h2 className="dash-name">Contribute</h2>
              <ActivePill active={isActive} />
            </header>
            <div className="tab-body">
              <ContributionModule member={member} onPhoneAdded={(phone) => { member.phone = phone; }} />
            </div>
          </>
        )}

        {/* ── COMMUNITY ── */}
        {tab==="community" && (
          <>
            <header className="dash-top-bar">
              <h2 className="dash-name">Community</h2>
            </header>
            <div className="tab-body">
              <ConnectHub member={member} />
            </div>
          </>
        )}

        {/* ── LOANS ── */}
        {tab==="loans" && (
          <>
            <header className="dash-top-bar">
              <h2 className="dash-name">Loans</h2>
            </header>
            <div className="tab-body">
              <div className="section-stack">
                <NeuBtn full onClick={() => setTab("request")}>Request a Loan</NeuBtn>
                {loansLoading ? <Spinner /> : loans.length===0 ? (
                  <div className="empty-state"><p>No loan requests yet.</p></div>
                ) : (
                  <div className="neu-list">
                    {loans.map(loan => (
                      <div key={loan.id} className={`neu-list-row row-accent-${loan.status}`}>
                        <div className="row-info">
                          <span className="row-title">{loan.description}</span>
                          <span className="row-meta">{fmt.date(loan.created_at)}</span>
                        </div>
                        <div className="row-right">
                          {loan.amount > 0 && <span className="row-amount">{fmt.currency(loan.amount)}</span>}
                          <StatusBadge status={loan.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── REQUEST ── */}
        {tab==="request" && (
          <>
            <header className="dash-top-bar">
              <button className="dash-back-btn" onClick={() => setTab("loans")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="dash-name">Loan Request</h2>
            </header>
            <div className="tab-body">
              <LoanModule member={member} isActive={isActive} />
            </div>
          </>
        )}

        {/* ── MORE ── */}
        {tab==="more" && (
          <>
            <header className="dash-top-bar">
              <h2 className="dash-name">More</h2>
            </header>
            <div className="tab-body">
              <AboutTab />
            </div>
          </>
        )}
      </div>

      {/* ── Bottom dock ── */}
      <nav className="bottom-dock">
        {DOCK.map(({key,icon,label,badge}) => (
          <button key={key} className={`dock-btn ${tab===key?"dock-btn-active":""}`} onClick={() => setTab(key)}>
            <span className="dock-icon">{icon}</span>
            <span className="dock-label">{label}</span>
            {badge && <span className="dock-badge">{badge}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
function AdminPage() {
  const { loans, loading, refetch } = useAllLoans();
  const [updating, setUpdating] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [search, setSearch] = useState("");

  const updateStatus = useCallback(async (id, status) => {
    setUpdating(id);
    await supabase.from("loan_requests").update({ status }).eq("id", id);
    setUpdating(null); setConfirmId(null); setConfirmAction(null);
    refetch();
  }, [refetch]);

  const doConfirm = (id, action) => {
    if (confirmId===id && confirmAction===action) updateStatus(id, action==="approve"?"approved":"declined");
    else { setConfirmId(id); setConfirmAction(action); }
  };

  const grouped = useMemo(() => ({
    pending: loans.filter(l => l.status==="pending"),
    other:   loans.filter(l => l.status!=="pending"),
  }), [loans]);

  const filter = (arr) => {
    const q = search.toLowerCase().trim();
    if (!q) return arr;
    return arr.filter(l => l.members?.full_name?.toLowerCase().includes(q) || l.members?.phone?.includes(q) || l.description?.toLowerCase().includes(q));
  };

  const totalPending = useMemo(() => grouped.pending.reduce((s,l) => s+Number(l.amount), 0), [grouped.pending]);

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div><p className="dash-eyebrow">Treasurer view</p><h2 className="dash-name">Loan Requests</h2></div>
        <button className="text-link" onClick={() => navigate("/")}>Sign out</button>
      </header>
      {!loading && grouped.pending.length > 0 && (
        <div className="stats-row" style={{marginBottom:"1.5rem"}}>
          {[{l:"Pending",v:grouped.pending.length},{l:"Requested",v:fmt.currency(totalPending)},{l:"Reviewed",v:grouped.other.length}].map(({l,v}) => (
            <div key={l} className="stat-tile"><span className="stat-val">{v}</span><span className="stat-lbl">{l}</span></div>
          ))}
        </div>
      )}
      {!loading && loans.length > 0 && (
        <div style={{margin:"0 1.5rem 1.25rem"}}>
          <input className="neu-input" placeholder="Search by name, phone, or description…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}
      {loading ? <Spinner /> : (
        <div className="section-stack" style={{padding:"0 1.5rem"}}>
          {filter(grouped.pending).length > 0 && (
            <>
              <p className="section-label">Pending</p>
              <div className="neu-list" style={{marginBottom:"1.5rem"}}>
                {filter(grouped.pending).map(loan => {
                  const isC = confirmId===loan.id;
                  return (
                    <div key={loan.id} className="neu-list-row" style={{flexWrap:"wrap"}}>
                      <div className="row-info" style={{width:"100%",marginBottom:"0.5rem"}}>
                        <span className="row-title">{loan.description}</span>
                        <span className="row-meta">{loan.members?.full_name} · {loan.members?.phone}{loan.reg_number && ` · ${loan.reg_number}`} · {fmt.date(loan.created_at)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap",justifyContent:"flex-end",width:"100%"}}>
                        {loan.amount > 0 && <span className="row-amount">{fmt.currency(loan.amount)}</span>}
                        <NeuBtn small variant={isC && confirmAction==="approve" ? "approve-confirm" : "approve"} loading={updating===loan.id} onClick={() => doConfirm(loan.id,"approve")}>
                          {isC && confirmAction==="approve" ? "Sure?" : "Approve"}
                        </NeuBtn>
                        <NeuBtn small variant={isC && confirmAction==="decline" ? "decline-confirm" : "decline"} loading={updating===loan.id} onClick={() => doConfirm(loan.id,"decline")}>
                          {isC && confirmAction==="decline" ? "Sure?" : "Decline"}
                        </NeuBtn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {filter(grouped.other).length > 0 && (
            <>
              <p className="section-label">History</p>
              <div className="neu-list">
                {filter(grouped.other).map(loan => (
                  <div key={loan.id} className={`neu-list-row row-accent-${loan.status}`}>
                    <div className="row-info">
                      <span className="row-title">{loan.description}</span>
                      <span className="row-meta">{loan.members?.full_name} · {loan.members?.phone}{loan.reg_number && ` · ${loan.reg_number}`} · {fmt.date(loan.created_at)}</span>
                    </div>
                    <div className="row-right">
                      {loan.amount > 0 && <span className="row-amount">{fmt.currency(loan.amount)}</span>}
                      <StatusBadge status={loan.status} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {loans.length===0 && <p className="empty-msg">No loan requests yet.</p>}
        </div>
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useDarkMode();
  const route = useRoute();
  const { session, authLoading } = useAuthSession();
  const [member, setMember] = useState(null);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) { setMember(null); return; }
    setMemberLoading(true);
    supabase.from("members").select("*").eq("email", session.user.email).single()
      .then(({ data }) => { setMember(data ?? null); setMemberLoading(false); });
  }, [session]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setMember(null); navigate("/");
  }, []);

  const isTreasurer = session?.user?.email === CONFIG.treasurer.email;

  if (authLoading || memberLoading) return (
    <><style>{CSS}</style><div style={{minHeight:"100svh",display:"flex",alignItems:"center",justifyContent:"center"}}><Spinner /></div></>
  );

  const page = (() => {
    if (!session) return <LandingPage />;
    if (!member) return <RegisterPage session={session} />;
    if (route === "/admin") {
      if (!isTreasurer) { navigate("/dashboard"); return null; }
      return <AdminPage />;
    }
    return <DashboardPage member={member} onLogout={logout} />;
  })();

  return (
    <>
      <style>{CSS}</style>
      <DarkToggle dark={dark} onToggle={() => setDark(d => !d)} />
      <main>{page}</main>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&family=Nunito+Sans:wght@300;400;600&display=swap');

  /* ─── Palette ───────────────────────────────────────────────────────────
     Light: #e8ecef background, #ffffff surface, soft inset/outset shadows
     Dark:  #1e2328 background, #252b31 surface, dark neumorphic shadows
     Accent: #8b9dc3 (soft blue-grey), danger: #c0392b
  ─── */

  :root {
    --bg:        #e8ecef;
    --surface:   #eef1f4;
    --surface2:  #e2e6ea;
    --fg:        #3a4048;
    --fg2:       #5a636e;
    --muted:     #8a949e;
    --accent:    #8b9dc3;
    --accent2:   #6b82b0;
    --danger:    #c0392b;
    --success:   #27ae60;
    --border:    rgba(255,255,255,0.9);

    /* Neumorphic shadows */
    --neu-out:   6px 6px 14px #c8ccd0, -6px -6px 14px #ffffff;
    --neu-in:    inset 4px 4px 10px #c8ccd0, inset -4px -4px 10px #ffffff;
    --neu-out-sm:3px 3px 8px #c8ccd0, -3px -3px 8px #ffffff;
    --neu-in-sm: inset 2px 2px 6px #c8ccd0, inset -2px -2px 6px #ffffff;
    --neu-btn:   4px 4px 10px #c0c4c8, -4px -4px 10px #ffffff;
    --neu-btn-hover: 6px 6px 14px #b8bcbf, -6px -6px 14px #ffffff;
    --neu-btn-press: inset 3px 3px 8px #c0c4c8, inset -3px -3px 8px #ffffff;

    --r:    22px;
    --r-sm: 14px;
    --r-xs: 10px;
    --t:    0.3s cubic-bezier(0.4,0,0.2,1);
    --max:  680px;

    --font-head: 'Nunito', system-ui, sans-serif;
    --font-body: 'Nunito Sans', system-ui, sans-serif;
  }

  [data-theme="dark"] {
    --bg:        #1e2328;
    --surface:   #252b31;
    --surface2:  #1a1f24;
    --fg:        #dde3ea;
    --fg2:       #9aa3ad;
    --muted:     #6a747e;
    --accent:    #7a91bc;
    --accent2:   #5d7aaa;
    --border:    rgba(255,255,255,0.05);

    --neu-out:   6px 6px 14px #171c20, -6px -6px 14px #2d343c;
    --neu-in:    inset 4px 4px 10px #171c20, inset -4px -4px 10px #2d343c;
    --neu-out-sm:3px 3px 8px #171c20, -3px -3px 8px #2d343c;
    --neu-in-sm: inset 2px 2px 6px #171c20, inset -2px -2px 6px #2d343c;
    --neu-btn:   4px 4px 10px #171c20, -4px -4px 10px #2d343c;
    --neu-btn-hover: 6px 6px 14px #131820, -6px -6px 14px #313940;
    --neu-btn-press: inset 3px 3px 8px #171c20, inset -3px -3px 8px #2d343c;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; -webkit-font-smoothing: antialiased; }
  body {
    font-family: var(--font-body);
    background: var(--bg); color: var(--fg);
    transition: background 0.5s cubic-bezier(0.4,0,0.2,1), color 0.4s ease;
    min-height: 100svh; overflow-x: hidden;
  }

  /* ── Dark Toggle ── */
  .theme-toggle {
    position: fixed; top: 1.25rem; right: 1.25rem; z-index: 200;
    width: 2.6rem; height: 1.4rem; border-radius: 999px;
    background: var(--bg); border: none; cursor: pointer; padding: 0;
    display: flex; align-items: center;
    box-shadow: var(--neu-out-sm);
    transition: box-shadow var(--t);
  }
  .theme-toggle:active { box-shadow: var(--neu-in-sm); }
  .theme-toggle-knob {
    display: block; width: 0.95rem; height: 0.95rem; border-radius: 50%;
    background: var(--accent);
    box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
    transition: margin 0.25s cubic-bezier(0.4,0,0.2,1);
  }

  /* ── Spinner ── */
  .spinner-wrap { display: flex; justify-content: center; padding: 3rem 0; }
  .spinner { display: inline-block; width: 22px; height: 22px; border: 2.5px solid var(--surface2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }

  /* ── Neu Card ── */
  .neu-card {
    background: var(--bg);
    border-radius: var(--r);
    box-shadow: var(--neu-out);
    padding: 1.5rem;
    transition: box-shadow var(--t);
  }
  .neu-card-pressed { box-shadow: var(--neu-in); }

  /* ── Neu Input ── */
  .neu-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .neu-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 0.2rem; padding-left: 0.25rem; }
  .neu-hint { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--muted); opacity: 0.7; }
  .neu-error { font-size: 0.68rem; color: var(--danger); padding-left: 0.25rem; margin-top: 0.1rem; }
  .neu-input {
    width: 100%; padding: 0.85rem 1.1rem;
    font-family: var(--font-body); font-size: 0.9rem; font-weight: 400;
    color: var(--fg); background: var(--bg);
    border: none; border-radius: var(--r-sm);
    outline: none; resize: none;
    -webkit-appearance: none;
    box-shadow: var(--neu-in);
    transition: box-shadow 0.25s;
  }
  .neu-input:focus { box-shadow: var(--neu-in), 0 0 0 2px var(--accent); }
  .neu-input::placeholder { color: var(--muted); }
  .neu-textarea { min-height: 88px; line-height: 1.55; }
  .dir-search { padding: 0.6rem 0.9rem; font-size: 0.82rem; border-radius: var(--r-xs); }

  /* ── Neu Button ── */
  .neu-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.6rem;
    padding: 0.85rem 1.6rem;
    font-family: var(--font-body); font-size: 0.875rem; font-weight: 600;
    border-radius: var(--r-sm); border: none;
    cursor: pointer; white-space: nowrap; text-decoration: none;
    background: var(--bg);
    box-shadow: var(--neu-btn);
    color: var(--fg2);
    transition: box-shadow var(--t), color var(--t), transform 0.1s;
    -webkit-tap-highlight-color: transparent;
  }
  .neu-btn:hover:not(:disabled) { box-shadow: var(--neu-btn-hover); }
  .neu-btn:active:not(:disabled) { box-shadow: var(--neu-btn-press); transform: scale(0.99); }
  .neu-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .neu-btn-full { width: 100%; }
  .neu-btn-small { padding: 0.5rem 1rem; font-size: 0.78rem; border-radius: var(--r-xs); }

  .neu-btn-primary { color: var(--accent2); font-weight: 700; }
  .neu-btn-google { color: var(--fg); font-weight: 600; }
  .neu-btn-ghost { color: var(--muted); box-shadow: var(--neu-out-sm); }
  .neu-btn-accent {
    background: var(--accent); color: #ffffff;
    box-shadow: 4px 4px 10px rgba(107,130,176,0.4), -2px -2px 8px rgba(255,255,255,0.3);
  }
  .neu-btn-accent:hover:not(:disabled) {
    box-shadow: 6px 6px 14px rgba(107,130,176,0.5), -2px -2px 8px rgba(255,255,255,0.3);
  }
  .neu-btn-approve { color: var(--success); }
  .neu-btn-approve-confirm { background: var(--success); color: #fff; box-shadow: 3px 3px 8px rgba(39,174,96,0.35), -2px -2px 6px rgba(255,255,255,0.3); }
  .neu-btn-decline { color: var(--danger); }
  .neu-btn-decline-confirm { background: var(--danger); color: #fff; box-shadow: 3px 3px 8px rgba(192,57,43,0.35), -2px -2px 6px rgba(255,255,255,0.3); }

  .btn-spinner { width: 15px; height: 15px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; }

  /* ── Status Badge ── */
  .status-badge { font-size: 0.63rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; padding: 0.22rem 0.65rem; border-radius: 999px; flex-shrink: 0; }
  .status-approved { color: var(--success); background: rgba(39,174,96,0.1); }
  .status-pending  { color: var(--accent2); background: rgba(139,157,195,0.12); }
  .status-declined { color: var(--danger);  background: rgba(192,57,43,0.1); }

  /* ── Active Pill ── */
  .active-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.28rem 0.7rem; border-radius: 999px; flex-shrink: 0; background: var(--bg); box-shadow: var(--neu-out-sm); }
  .active-pip { width: 6px; height: 6px; border-radius: 50%; }
  .active-pill-on  { color: var(--success); }
  .active-pill-on  .active-pip { background: var(--success); box-shadow: 0 0 4px var(--success); }
  .active-pill-off { color: var(--muted); }
  .active-pill-off .active-pip { background: var(--muted); }

  /* ── Notices ── */
  .inline-notice { border-radius: var(--r-sm); padding: 0.9rem 1.1rem; font-size: 0.82rem; line-height: 1.55; }
  .inline-success { background: rgba(39,174,96,0.08); box-shadow: inset 2px 2px 5px rgba(39,174,96,0.06), inset -1px -1px 3px rgba(255,255,255,0.5); color: var(--fg2); }
  .inline-success strong { color: var(--success); }
  .inline-warn { background: rgba(192,57,43,0.06); box-shadow: inset 2px 2px 5px rgba(192,57,43,0.05), inset -1px -1px 3px rgba(255,255,255,0.5); color: var(--fg2); }
  .inline-warn strong { color: var(--danger); }

  /* ── Text Link ── */
  .text-link { background: none; border: none; cursor: pointer; font-family: var(--font-body); font-size: 0.79rem; color: var(--accent); text-decoration: none; padding: 0; display: inline; }
  .text-link:hover { text-decoration: underline; }

  /* ── Announcement ── */
  .ann-bar { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 1.5rem; background: var(--bg); box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06); max-width: var(--max); margin: 0 auto; }
  .ann-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 0.35rem; animation: pulse 2s ease-in-out infinite; }
  .ann-text { display: flex; flex-direction: column; gap: 0.12rem; flex: 1; min-width: 0; }
  .ann-title { font-size: 0.82rem; font-weight: 600; }
  .ann-body  { font-size: 0.74rem; color: var(--muted); line-height: 1.4; }
  .ann-close { background: none; border: none; cursor: pointer; color: var(--muted); padding: 0.2rem; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ann-close:hover { color: var(--fg); }

  /* ── Splash / Auth ── */
  .splash-page {
    min-height: 100svh; display: flex; align-items: center; justify-content: center;
    padding: 2rem 1.5rem; background: var(--bg);
  }
  .splash-center { width: 100%; max-width: 400px; text-align: center; }
  .splash-brand { margin-bottom: 2.5rem; }
  .splash-eyebrow { font-size: 0.63rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.75rem; }
  .splash-title {
    font-family: var(--font-head);
    font-size: clamp(1.8rem, 6vw, 3rem);
    font-weight: 700; letter-spacing: -0.02em; line-height: 1.1;
    color: var(--fg); margin-bottom: 0.6rem;
  }
  .splash-tagline { font-size: 0.95rem; font-weight: 300; color: var(--muted); letter-spacing: 0.01em; }
  .auth-panel { display: flex; flex-direction: column; gap: 1.1rem; padding: 2rem; }
  .auth-hint { font-size: 0.76rem; color: var(--muted); text-align: center; }
  .auth-divider { display: flex; align-items: center; gap: 0.75rem; color: var(--muted); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin: 0.1rem 0; }
  .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: var(--surface2); box-shadow: inset 0 1px 0 rgba(255,255,255,0.6); }
  .auth-step-label { font-family: var(--font-head); font-size: 1.05rem; font-weight: 700; margin-bottom: 0.2rem; }
  .auth-step-sub { font-size: 0.78rem; color: var(--muted); line-height: 1.45; margin-bottom: 0.25rem; }
  .auth-row-links { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .auth-sent-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--bg); box-shadow: var(--neu-out-sm); display: flex; align-items: center; justify-content: center; color: var(--accent); margin: 0 auto 0.5rem; }

  .google-identity { display: flex; align-items: center; gap: 0.85rem; padding: 0.9rem 1rem; border-radius: var(--r-xs); box-shadow: var(--neu-in-sm); }
  .google-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  .google-name  { font-size: 0.87rem; font-weight: 700; margin-bottom: 0.1rem; }
  .google-email { font-size: 0.7rem; color: var(--muted); }

  /* ── Dashboard ── */
  .dash-page { max-width: var(--max); margin: 0 auto; padding: 0 0 6rem; }
  .dash-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 3rem 1.5rem 1.5rem; gap: 1rem; }
  .dash-eyebrow { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.2rem; }
  .dash-name { font-family: var(--font-head); font-size: clamp(1.5rem,5vw,2.2rem); font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; }

  /* ── Stats ── */
  .stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.75rem; margin: 0 1.5rem 1.5rem; }
  .stat-tile { background: var(--bg); border-radius: var(--r-sm); padding: 1rem; box-shadow: var(--neu-out-sm); text-align: center; }
  .stat-val { display: block; font-size: 1rem; font-weight: 700; color: var(--fg); margin-bottom: 0.1rem; }
  .stat-lbl { display: block; font-size: 0.58rem; font-weight: 700; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }

  /* ── Tabs ── */
  .tab-bar {
    display: flex; gap: 0; margin: 0 1.5rem 1.5rem;
    background: var(--bg); border-radius: var(--r-sm); padding: 0.3rem;
    box-shadow: var(--neu-in);
    overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
  }
  .tab-bar::-webkit-scrollbar { display: none; }
  .tab-btn {
    flex: 1; min-width: fit-content; padding: 0.5rem 0.8rem;
    font-family: var(--font-body); font-size: 0.75rem; font-weight: 600;
    color: var(--muted); background: transparent;
    border: none; border-radius: var(--r-xs);
    cursor: pointer; white-space: nowrap;
    transition: all var(--t);
    display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;
  }
  .tab-btn-active {
    background: var(--bg);
    color: var(--accent2);
    box-shadow: var(--neu-out-sm);
  }
  .tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 4px; font-size: 0.58rem; font-weight: 700; background: var(--accent); color: #fff; border-radius: 999px; }
  .tab-body { padding: 0 1.5rem; }

  /* ── Section ── */
  .section-stack { display: flex; flex-direction: column; gap: 1.1rem; }
  .section-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.75rem; }
  .form-stack { display: flex; flex-direction: column; gap: 1rem; }

  /* ── Status Card ── */
  .contrib-hero {
    border-radius: var(--r); padding: 1.75rem;
    box-shadow: var(--neu-out);
  }
  .contrib-hero-paid {
    background: linear-gradient(135deg, var(--accent2) 0%, var(--accent) 100%);
    box-shadow: 6px 6px 16px rgba(107,130,176,0.4), -4px -4px 12px rgba(255,255,255,0.3);
  }
  .contrib-hero-due { background: var(--bg); }
  .contrib-hero-inner { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .contrib-month { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.35rem; }
  .contrib-hero-paid .contrib-month { color: rgba(255,255,255,0.65); }
  .contrib-hero-due  .contrib-month { color: var(--muted); }
  .contrib-heading { font-family: var(--font-head); font-size: clamp(1.25rem,4vw,1.65rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 0.35rem; }
  .contrib-hero-paid .contrib-heading { color: #fff; }
  .contrib-hero-due  .contrib-heading { color: var(--fg); }
  .contrib-sub { font-size: 0.77rem; font-weight: 400; }
  .contrib-hero-paid .contrib-sub { color: rgba(255,255,255,0.7); }
  .contrib-hero-due  .contrib-sub { color: var(--muted); }
  .contrib-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.75); padding: 0.75rem 1.75rem; border-top: 1px solid rgba(255,255,255,0.15); margin: 0 -1.75rem -1.75rem; }

  /* ── Streak ── */
  .streak-card { padding: 1.25rem 1.5rem; }
  .streak-row { display: flex; gap: 0.5rem; align-items: flex-end; margin-bottom: 0.65rem; }
  .streak-item { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; flex: 1; }
  .streak-pip { width: 100%; max-width: 36px; aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .streak-pip-paid { background: linear-gradient(135deg, var(--accent2), var(--accent)); color: #fff; box-shadow: 3px 3px 8px rgba(107,130,176,0.35), -2px -2px 5px rgba(255,255,255,0.3); }
  .streak-pip-empty { background: var(--bg); box-shadow: var(--neu-in-sm); }
  .streak-lbl { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.04em; color: var(--muted); text-transform: uppercase; }
  .streak-msg { font-size: 0.73rem; color: var(--muted); }

  /* ── Pay ── */
  .pay-hint { font-size: 0.72rem; color: var(--muted); text-align: center; line-height: 1.45; margin-top: 0.6rem; }
  .waiting-row { display: flex; align-items: center; gap: 0.9rem; }
  .pulse-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); flex-shrink: 0; animation: pulse 1.7s ease-in-out infinite; }
  .waiting-title { font-size: 0.87rem; font-weight: 700; margin-bottom: 0.12rem; }
  .waiting-sub { font-size: 0.73rem; color: var(--muted); line-height: 1.4; }

  /* ── Gate ── */
  .gate-card { text-align: center; padding: 2.5rem 1.5rem; }
  .gate-icon { width: 52px; height: 52px; border-radius: 50%; background: var(--bg); box-shadow: var(--neu-out-sm); display: flex; align-items: center; justify-content: center; color: var(--muted); margin: 0 auto 0.9rem; }
  .gate-title { font-family: var(--font-head); font-size: 1.15rem; font-weight: 700; margin-bottom: 0.4rem; }
  .gate-sub { font-size: 0.8rem; color: var(--muted); line-height: 1.55; max-width: 260px; margin: 0 auto; }

  /* ── Neu List ── */
  .neu-list { display: flex; flex-direction: column; gap: 0.6rem; }
  .neu-list-row {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;
    background: var(--bg); padding: 1rem 1.25rem;
    border-radius: var(--r-sm);
    box-shadow: var(--neu-out-sm);
    transition: box-shadow var(--t);
    position: relative; overflow: hidden;
  }
  .neu-list-row:hover { box-shadow: var(--neu-btn-hover); }

  /* Status accent pip */
  .row-accent-approved::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background: var(--success); border-radius: 3px 0 0 3px; }
  .row-accent-declined::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background: var(--danger); border-radius: 3px 0 0 3px; }
  .row-accent-pending::before  { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background: var(--accent); border-radius: 3px 0 0 3px; }

  .row-info { display: flex; flex-direction: column; gap: 0.18rem; flex: 1; min-width: 0; }
  .row-title { font-size: 0.84rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row-meta  { font-size: 0.64rem; color: var(--muted); line-height: 1.35; }
  .row-right { display: flex; align-items: center; gap: 0.55rem; flex-shrink: 0; }
  .row-amount { font-size: 0.84rem; font-weight: 700; color: var(--fg); }

  /* ── Community ── */
  .community-card { display: flex; flex-direction: column; gap: 1.1rem; }
  .community-title { font-family: var(--font-head); font-size: clamp(1rem,3vw,1.2rem); font-weight: 400; font-style: italic; line-height: 1.55; color: var(--fg2); }
  .benefit-stack { display: flex; flex-direction: column; gap: 0.7rem; }
  .benefit-row { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.82rem; color: var(--muted); line-height: 1.5; }
  .benefit-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 0.5rem; }

  .wa-card {
    background: linear-gradient(135deg, var(--accent2) 0%, var(--accent) 100%);
    border-radius: var(--r); padding: 1.75rem;
    display: flex; align-items: center; justify-content: space-between;
    gap: 1.5rem; flex-wrap: wrap;
    box-shadow: 6px 6px 16px rgba(107,130,176,0.4), -4px -4px 12px rgba(255,255,255,0.25);
  }
  .wa-title { font-family: var(--font-head); font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.25rem; }
  .wa-sub { font-size: 0.76rem; color: rgba(255,255,255,0.7); line-height: 1.4; }

  .dev-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .dev-name { font-size: 0.83rem; font-weight: 700; margin-bottom: 0.1rem; }
  .dev-desc { font-size: 0.7rem; color: var(--muted); }

  /* ── Executives ── */
  .exec-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 0.75rem; }
  .exec-card { padding: 1.5rem 1rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.55rem; }
  .exec-avatar-wrap { width: 68px; height: 68px; }
  .exec-avatar { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; box-shadow: var(--neu-out-sm); }
  .exec-initials { width: 68px; height: 68px; border-radius: 50%; background: var(--bg); box-shadow: var(--neu-out-sm); color: var(--accent2); font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .exec-name { font-size: 0.83rem; font-weight: 700; }
  .exec-role { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
  .exec-bio  { font-size: 0.69rem; color: var(--muted); line-height: 1.4; }

  /* ── Directory ── */
  .dir-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .dir-count { font-size: 0.74rem; color: var(--muted); }
  .dir-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: var(--bg); box-shadow: var(--neu-out-sm); color: var(--accent2); font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; justify-content: center; }

  /* ── Misc ── */
  .empty-state { color: var(--muted); font-size: 0.875rem; padding: 3rem 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
  .empty-msg { text-align: center; color: var(--muted); font-size: 0.82rem; padding: 2rem 0; }

  /* ── Community / Chat ── */
  .connect-wrap { display: flex; flex-direction: column; gap: 1rem; }
  .seg-control { display: flex; background: var(--bg); box-shadow: var(--neu-in); border-radius: 14px; padding: 3px; gap: 2px; }
  .seg-btn { flex: 1; padding: 0.46rem 0.5rem; font-family: var(--font-body); font-size: 0.75rem; font-weight: 500; color: var(--muted); background: transparent; border: none; border-radius: 11px; cursor: pointer; transition: all 0.22s; white-space: nowrap; }
  .seg-active { background: var(--bg); color: var(--accent2); font-weight: 700; box-shadow: var(--neu-out-sm); }
  .chat-pane { display: flex; flex-direction: column; gap: 0.6rem; }
  .chat-feed { display: flex; flex-direction: column; gap: 0.25rem; max-height: 56svh; min-height: 260px; overflow-y: auto; padding: 0.25rem 0 0.5rem; scrollbar-width: none; }
  .chat-feed::-webkit-scrollbar { display: none; }
  .chat-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem; padding: 2.5rem 1rem; color: var(--muted); font-size: 0.82rem; text-align: center; }
  .chat-empty-icon { font-size: 2.2rem; margin-bottom: 0.2rem; }
  .chat-empty-sub { font-size: 0.74rem; color: var(--muted); opacity: 0.7; line-height: 1.5; }
  .help-bot-avatar { font-size: 2.2rem; width: 56px; height: 56px; background: var(--bg); box-shadow: var(--neu-out-sm); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 0.2rem; }
  .help-bot-icon { width: 26px; height: 26px; background: var(--bg); box-shadow: var(--neu-out-sm); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; align-self: flex-end; }
  .msg-wrap { display: flex; align-items: flex-end; gap: 0.45rem; max-width: 82%; animation: fadeUp 0.18s ease both; }
  .msg-wrap-me { align-self: flex-end; flex-direction: row-reverse; }
  .msg-wrap:not(.msg-wrap-me) { align-self: flex-start; }
  .msg-col { display: flex; flex-direction: column; gap: 0.12rem; }
  .msg-wrap-me .msg-col { align-items: flex-end; }
  .msg-name { font-size: 0.62rem; font-weight: 700; color: var(--muted); padding: 0 0.4rem; letter-spacing: 0.01em; }
  .msg-line { display: flex; align-items: center; gap: 0.35rem; }
  .msg-wrap-me .msg-line { flex-direction: row-reverse; }
  .msg-time { font-size: 0.58rem; color: var(--muted); padding: 0 0.4rem; opacity: 0.75; }
  .msg-bubble { padding: 0.58rem 0.95rem; border-radius: 18px; font-size: 0.875rem; line-height: 1.5; word-break: break-word; max-width: 100%; }
  .bubble-them { background: var(--bg); box-shadow: var(--neu-out-sm); color: var(--fg); border-bottom-left-radius: 5px; }
  .bubble-me { background: linear-gradient(140deg, #6b82b8, #8b9dc3); color: #fff; border-bottom-right-radius: 5px; box-shadow: 3px 3px 10px rgba(107,130,184,0.35); }
  .msg-actions { position: relative; z-index: 10; }
  .msg-action-dot { font-size: 0.75rem; color: var(--muted); cursor: pointer; padding: 0.25rem 0.35rem; border-radius: 6px; opacity: 0; user-select: none; transition: opacity 0.15s; }
  .msg-wrap:hover .msg-action-dot { opacity: 1; }
  .msg-menu { position: absolute; bottom: 100%; right: 0; background: var(--surface); box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: var(--r-sm); overflow: hidden; min-width: 160px; z-index: 100; border: 0.5px solid var(--border); max-width: 200px; }
  .msg-menu-item { display: block; width: 100%; padding: 0.7rem 1rem; font-family: var(--font-body); font-size: 0.8rem; font-weight: 500; color: var(--fg); background: none; border: none; cursor: pointer; text-align: left; transition: background 0.15s; }
  .msg-menu-item:hover { background: var(--surface2); }
  .msg-menu-danger { color: var(--danger); }
  .bc-pill { align-self: center; display: flex; align-items: center; gap: 0.5rem; background: var(--bg); box-shadow: var(--neu-out-sm); border-radius: 999px; padding: 0.4rem 1rem; font-size: 0.78rem; color: var(--fg2); max-width: 90%; }
  .bc-pip { font-size: 13px; flex-shrink: 0; }
  .bc-composer { display: flex; align-items: center; gap: 0.5rem; background: color-mix(in srgb, var(--accent) 7%, var(--bg)); box-shadow: var(--neu-in-sm); border-radius: 999px; padding: 0.28rem 0.28rem 0.28rem 0.85rem; }
  .chat-composer { display: flex; align-items: center; gap: 0.5rem; background: var(--bg); box-shadow: var(--neu-in); border-radius: 999px; padding: 0.28rem 0.28rem 0.28rem 1.1rem; }
  .chat-composer-input { flex: 1; background: transparent; border: none; outline: none; font-family: var(--font-body); font-size: 0.875rem; color: var(--fg); min-width: 0; }
  .chat-composer-input::placeholder { color: var(--muted); }
  .chat-send-btn { width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: var(--bg); box-shadow: var(--neu-out-sm); color: var(--muted); transition: all 0.2s; flex-shrink: 0; }
  .chat-send-active { background: linear-gradient(140deg, #6b82b8, #8b9dc3); color: #fff; box-shadow: 3px 3px 10px rgba(107,130,184,0.4); }
  .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .help-admin-wrap { display: flex; flex-direction: column; gap: 0.75rem; }
  .help-thread-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.25rem; }
  .thread-list { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
  .thread-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.1rem; background: var(--surface); border: none; cursor: pointer; text-align: left; transition: background 0.15s; width: 100%; }
  .thread-item:hover { background: var(--surface2); }
  .thread-item-active { background: color-mix(in srgb, var(--accent) 10%, var(--surface)); }
  .thread-item-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
  .thread-item-name { font-size: 0.84rem; font-weight: 600; color: var(--fg); }
  .thread-item-preview { font-size: 0.72rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .members-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .typing-dots { display: flex; align-items: center; gap: 4px; padding: 0.6rem 0.95rem !important; }
  .typing-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: typingBounce 1.2s ease-in-out infinite; }
  .typing-dots span:nth-child(2) { animation-delay: 0.18s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.36s; }
  @keyframes typingBounce { 0%,60%,100%{transform:translateY(0);opacity:0.35;} 30%{transform:translateY(-5px);opacity:1;} }
  .faq-wrap { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; }
  .faq-list { display: flex; flex-wrap: wrap; gap: 0.45rem; justify-content: center; }
  .faq-chip { background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: 999px; padding: 0.42rem 0.9rem; font-family: var(--font-body); font-size: 0.76rem; font-weight: 500; color: var(--accent2); cursor: pointer; transition: all 0.18s; }
  .faq-chip:hover { box-shadow: var(--neu-btn-hover); }
  .faq-chip:active { box-shadow: var(--neu-in-sm); transform: scale(0.97); }

  /* ── Home feed layout ── */
  .home-feed { display: flex; flex-direction: column; }
  .stats-strip { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.6rem; margin: 0 1.5rem 0; }
  .dash-top-bar { display: flex; align-items: center; justify-content: space-between; padding: 2.5rem 1.5rem 1rem; gap: 1rem; }
  .dash-top-left { display: flex; align-items: center; gap: 0.6rem; }
  .dash-back-btn { background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--fg); flex-shrink: 0; transition: all 0.2s; }
  .dash-back-btn:active { box-shadow: var(--neu-in-sm); }

  /* Quick actions row */
  .quick-actions { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0 1.5rem 1rem; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .quick-actions::-webkit-scrollbar { display: none; }
  .quick-action-btn { flex-shrink: 0; display: flex; align-items: center; gap: 0.4rem; background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: 999px; padding: 0.5rem 1.1rem; font-family: var(--font-body); font-size: 0.78rem; font-weight: 600; color: var(--fg2); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .quick-action-btn:active { box-shadow: var(--neu-in-sm); }
  .quick-action-badge { background: var(--accent); color: #fff; font-size: 0.6rem; font-weight: 700; border-radius: 999px; padding: 0.1rem 0.4rem; min-width: 16px; text-align: center; }

  /* ── Events feed ── */
  .events-feed { padding: 1.25rem 1.5rem 0.5rem; display: flex; flex-direction: column; gap: 0.85rem; }
  .events-feed-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
  .events-feed-label { font-family: var(--font-head); font-size: 1.25rem; font-weight: 400; color: var(--fg); line-height: 1.2; }
  .events-feed-sub { font-size: 0.73rem; color: var(--muted); margin-top: 0.1rem; }
  .events-post-btn { display: flex; align-items: center; gap: 0.35rem; background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: 999px; padding: 0.42rem 0.9rem; font-family: var(--font-body); font-size: 0.77rem; font-weight: 600; color: var(--accent2); cursor: pointer; transition: all 0.2s; }
  .events-post-btn:active { box-shadow: var(--neu-in-sm); }
  .events-empty { text-align: center; padding: 2.5rem 1rem; }
  .events-empty-title { font-family: var(--font-head); font-size: 1rem; font-weight: 400; color: var(--fg); margin-bottom: 0.35rem; }
  .events-empty-sub { font-size: 0.78rem; color: var(--muted); line-height: 1.5; }

  /* Hero card */
  .feed-card { background: var(--bg); box-shadow: var(--neu-out); border-radius: var(--r); overflow: hidden; transition: box-shadow 0.2s; }
  .feed-card-hero { box-shadow: var(--neu-out); }
  .feed-hero-inner { position: relative; cursor: pointer; min-height: 200px; display: flex; flex-direction: column; overflow: hidden; }
  .feed-hero-bg { position: absolute; inset: 0; opacity: 0.92; }
  .feed-hero-content { position: relative; z-index: 2; padding: 1.5rem 1.5rem 1.25rem; flex: 1; }
  .feed-hero-tag { display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.18); backdrop-filter: blur(8px); border-radius: 999px; padding: 0.28rem 0.75rem; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.92); margin-bottom: 0.75rem; }
  .feed-hero-title { font-family: var(--font-head); font-size: clamp(1.2rem, 4vw, 1.6rem); font-weight: 400; color: #fff; line-height: 1.2; margin-bottom: 0.6rem; }
  .feed-hero-body { font-size: 0.85rem; color: rgba(255,255,255,0.82); line-height: 1.6; margin-bottom: 0.75rem; }
  .feed-hero-date { font-size: 0.65rem; color: rgba(255,255,255,0.6); font-weight: 500; }
  .feed-hero-image { position: relative; z-index: 1; width: 100%; aspect-ratio: 16/9; }
  .feed-hero-image img { width: 100%; height: 100%; object-fit: cover; display: block; }

  /* Regular card */
  .feed-regular { display: flex; gap: 0; cursor: pointer; padding: 1.1rem 1.1rem 1.1rem 1.25rem; position: relative; }
  .feed-regular-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3.5px; border-radius: 3.5px 0 0 3.5px; }
  .feed-regular-content { flex: 1; min-width: 0; padding-left: 0.25rem; }
  .feed-regular-tag { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem; }
  .feed-regular-tag span:first-child { font-size: 14px; }
  .feed-regular-tag span:nth-child(2) { font-size: 0.63rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .feed-regular-date { font-size: 0.63rem; color: var(--muted); margin-left: auto; }
  .feed-regular-title { font-family: var(--font-head); font-size: 0.95rem; font-weight: 400; color: var(--fg); line-height: 1.3; margin-bottom: 0.3rem; }
  .feed-regular-body { font-size: 0.8rem; color: var(--muted); line-height: 1.55; }
  .feed-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .feed-regular-thumb { width: 72px; height: 72px; border-radius: var(--r-sm); overflow: hidden; flex-shrink: 0; margin-left: 0.75rem; align-self: center; }
  .feed-regular-thumb img { width: 100%; height: 100%; object-fit: cover; }

  /* Expanded content */
  .feed-expanded { padding: 0 1.1rem 1.1rem; animation: fadeUp 0.22s ease both; }
  .feed-contribs { margin-top: 0.75rem; }
  .feed-contribs-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.6rem; }
  .feed-contribs-list { display: flex; flex-direction: column; gap: 0.55rem; }
  .feed-contrib-chip { display: flex; align-items: center; gap: 0.65rem; }
  .feed-contrib-name { font-size: 0.83rem; font-weight: 600; color: var(--fg); }
  .feed-contrib-note { font-size: 0.7rem; color: var(--muted); }

  /* ── Bottom dock ── */
  .dash-with-dock { display: flex; flex-direction: column; height: 100svh; }
  .dash-scroll-area { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 0.5rem; }
  .bottom-dock {
    display: flex; align-items: center; justify-content: space-around;
    background: var(--bg); border-top: 0.5px solid var(--border);
    box-shadow: 0 -4px 20px rgba(93,107,107,0.08);
    padding: 0.4rem 0 calc(0.4rem + env(safe-area-inset-bottom));
    flex-shrink: 0; position: sticky; bottom: 0; z-index: 50;
  }
  .dock-btn { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; background: none; border: none; cursor: pointer; padding: 0.35rem 0.75rem; border-radius: var(--r-sm); transition: all 0.18s; position: relative; min-width: 52px; }
  .dock-btn:active { transform: scale(0.92); }
  .dock-icon { font-size: 1.25rem; line-height: 1; color: var(--muted); transition: all 0.18s; }
  .dock-label { font-size: 0.6rem; font-weight: 600; color: var(--muted); letter-spacing: 0.02em; transition: color 0.18s; }
  .dock-btn-active .dock-icon { color: var(--accent2); transform: scale(1.12); }
  .dock-btn-active .dock-label { color: var(--accent2); }
  .dock-badge { position: absolute; top: 0.1rem; right: 0.3rem; background: var(--accent); color: #fff; font-size: 0.56rem; font-weight: 700; border-radius: 999px; padding: 0.08rem 0.35rem; min-width: 14px; text-align: center; }

  /* ── Welfare hero card ── */
  .welfare-hero-card {
    margin: 0 1.5rem 0;
    background: linear-gradient(140deg, var(--p1,#5D6B6B) 0%, var(--p2,#7eaaaa) 100%);
    border-radius: var(--r); padding: 1.25rem 1.5rem;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; box-shadow: var(--shadow-md);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .welfare-hero-card:active { transform: scale(0.98); }
  .welfare-hero-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(241,247,247,0.65); margin-bottom: 0.2rem; }
  .welfare-hero-amount { font-family: var(--font-head); font-size: 1.6rem; font-weight: 400; color: #fff; line-height: 1.1; margin-bottom: 0.25rem; }
  .welfare-hero-sub { font-size: 0.75rem; color: rgba(241,247,247,0.75); }
  .welfare-hero-pip { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
  .pip-active { background: #7ef7b0; box-shadow: 0 0 0 4px rgba(126,247,176,0.2); animation: pulse 2s ease-in-out infinite; }
  .pip-inactive { background: rgba(255,255,255,0.3); }

  /* ── Home stats row ── */
  .home-stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 0.6rem; margin: 0 1.5rem 1.5rem; }

  /* ── Welfare voice ── */
  .voice-section { margin: 0 1.5rem; }
  .voice-trigger { display: flex; align-items: center; gap: 0.85rem; width: 100%; background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: var(--r); padding: 1.1rem 1.25rem; cursor: pointer; text-align: left; transition: all 0.18s; }
  .voice-trigger:active { box-shadow: var(--neu-in-sm); }
  .voice-trigger-icon { font-size: 1.5rem; flex-shrink: 0; }
  .voice-trigger-title { font-size: 0.88rem; font-weight: 600; color: var(--fg); margin-bottom: 0.1rem; }
  .voice-trigger-sub { font-size: 0.73rem; color: var(--muted); }
  .voice-cats { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .voice-cat-btn { background: var(--bg); box-shadow: var(--neu-out-sm); border: 1.5px solid transparent; border-radius: 999px; padding: 0.38rem 0.85rem; font-family: var(--font-body); font-size: 0.75rem; font-weight: 500; color: var(--muted); cursor: pointer; transition: all 0.18s; }
  .voice-cat-active { box-shadow: var(--neu-in-sm); border-color: var(--accent2); color: var(--accent2); }
  .voice-sent { background: rgba(90,154,122,0.1); border: 1px solid rgba(90,154,122,0.25); border-radius: var(--r-sm); padding: 0.75rem 1rem; font-size: 0.82rem; color: #5a9a7a; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }

  /* ── Home/dash top bar ── */
  .dash-top-bar { display: flex; align-items: center; justify-content: space-between; padding: 2rem 1.5rem 1rem; gap: 1rem; }
  .dash-top-left { display: flex; align-items: center; gap: 0.6rem; }
  .dash-back-btn { background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--fg); flex-shrink: 0; transition: all 0.18s; }
  .dash-back-btn:active { box-shadow: var(--neu-in-sm); }

  /* ── Events ── */
  .event-create-header { display: flex; align-items: center; justify-content: space-between; }
  .event-create-title { font-family: var(--font-head); font-size: 1.1rem; font-weight: 400; }
  .event-type-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .event-type-btn { background: var(--bg); box-shadow: var(--neu-out-sm); border: 1.5px solid transparent; border-radius: 999px; padding: 0.4rem 0.9rem; font-family: var(--font-body); font-size: 0.75rem; font-weight: 500; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .event-type-active { box-shadow: var(--neu-in-sm); }
  .contrib-row { display: flex; gap: 0.5rem; align-items: center; }

  .event-images-grid { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .event-img-thumb { position: relative; width: 72px; height: 72px; border-radius: var(--r-sm); overflow: hidden; }
  .event-img-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .event-img-remove { position: absolute; top: 3px; right: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; border: none; cursor: pointer; font-size: 9px; display: flex; align-items: center; justify-content: center; }
  .event-img-add { width: 72px; height: 72px; border-radius: var(--r-sm); background: var(--bg); box-shadow: var(--neu-in-sm); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--muted); transition: all 0.2s; }
  .event-img-add:hover { color: var(--accent2); }

  /* Event card */
  .event-card { background: var(--bg); box-shadow: var(--neu-out); border-radius: var(--r); overflow: hidden; transition: box-shadow 0.2s; border-left: 3px solid var(--event-color, var(--accent)); }
  .event-card-header { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1.25rem 1.25rem 0; cursor: pointer; user-select: none; }
  .event-type-pip { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; opacity: 0.9; }
  .event-card-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.1rem; }
  .event-type-label { font-size: 0.63rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .event-title { font-family: var(--font-head); font-size: 1rem; font-weight: 400; color: var(--fg); line-height: 1.3; }
  .event-date { font-size: 0.65rem; color: var(--muted); }
  .event-chevron { color: var(--muted); transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); flex-shrink: 0; margin-top: 0.25rem; }
  .event-chevron-open { transform: rotate(180deg); }
  .event-body { font-size: 0.85rem; color: var(--fg2); line-height: 1.6; padding: 0.75rem 1.25rem 1.25rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .event-body-open { -webkit-line-clamp: unset; overflow: visible; }

  /* Event images grid — adapts to count */
  .event-img-grid { display: grid; gap: 2px; margin: 0 1.25rem 1rem; border-radius: var(--r-sm); overflow: hidden; max-height: 320px; }
  .event-img-grid-1 { grid-template-columns: 1fr; }
  .event-img-grid-2 { grid-template-columns: 1fr 1fr; }
  .event-img-grid-3 { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }
  .event-img-grid-3 .event-img-cell:first-child { grid-column: 1 / -1; }
  .event-img-grid-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
  .event-img-cell { overflow: hidden; aspect-ratio: 16/9; }
  .event-img-cell img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
  .event-img-cell:hover img { transform: scale(1.03); }

  /* Contributors */
  .event-contribs { padding: 0 1.25rem 1.25rem; }
  .event-contrib-list { display: flex; flex-direction: column; gap: 0.6rem; }
  .event-contrib-item { display: flex; align-items: center; gap: 0.7rem; }
  .event-contrib-name { font-size: 0.84rem; font-weight: 600; color: var(--fg); }
  .event-contrib-note { font-size: 0.72rem; color: var(--muted); }

  /* Pinned message */
  .pinned-bar { display: flex; align-items: center; gap: 0.6rem; background: var(--bg); box-shadow: var(--neu-out-sm); border-radius: var(--r-sm); padding: 0.6rem 0.9rem; border-left: 3px solid var(--accent); }
  .pinned-icon { font-size: 13px; flex-shrink: 0; }
  .pinned-content { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
  .pinned-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent2); }
  .pinned-text { font-size: 0.78rem; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pinned-close { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 12px; padding: 0.2rem; flex-shrink: 0; }

  /* Select mode */
  .select-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--bg); box-shadow: var(--neu-in-sm); border-radius: var(--r-sm); font-size: 0.82rem; font-weight: 600; color: var(--accent2); }
  .msg-selected { background: color-mix(in srgb, var(--accent) 8%, transparent); border-radius: var(--r-sm); }
  .select-circle { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border2); flex-shrink: 0; background: var(--bg); transition: all 0.15s; }
  .select-circle-on { background: var(--accent2); border-color: var(--accent2); }

  /* Message bubble wrap (contains reply + bubble) */
  .msg-bubble-wrap { display: flex; flex-direction: column; gap: 0; }

  /* Reply preview inside bubble */
  .reply-preview { background: rgba(0,0,0,0.06); border-left: 3px solid rgba(107,130,184,0.5); border-radius: 10px 10px 0 0; padding: 0.35rem 0.7rem; margin-bottom: -4px; }
  .reply-me { border-left-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.12); }
  .reply-sender { display: block; font-size: 0.62rem; font-weight: 700; color: var(--accent2); margin-bottom: 0.1rem; }
  .reply-me .reply-sender { color: rgba(255,255,255,0.8); }
  .reply-text { display: block; font-size: 0.72rem; color: var(--fg2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .reply-me .reply-text { color: rgba(255,255,255,0.7); }

  /* Reply bar above composer */
  .reply-bar { display: flex; align-items: center; gap: 0.6rem; background: var(--bg); box-shadow: var(--neu-in-sm); border-radius: var(--r-sm); padding: 0.55rem 0.9rem; border-left: 3px solid var(--accent2); }
  .reply-bar-content { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; min-width: 0; }
  .reply-bar-sender { font-size: 0.65rem; font-weight: 700; color: var(--accent2); }
  .reply-bar-text { font-size: 0.75rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .reply-bar-close { background: none; border: none; cursor: pointer; color: var(--muted); font-size: 13px; padding: 0.2rem; flex-shrink: 0; }

  /* Emoji picker */
  .emoji-bar { display: flex; gap: 0.3rem; background: var(--bg); box-shadow: var(--neu-out); border-radius: 999px; padding: 0.3rem 0.5rem; margin-top: 0.3rem; animation: fadeUp 0.15s ease both; }
  .emoji-bar-me { align-self: flex-end; }
  .emoji-btn { background: none; border: none; cursor: pointer; font-size: 18px; padding: 0.15rem; border-radius: 50%; transition: transform 0.15s; line-height: 1; }
  .emoji-btn:hover { transform: scale(1.3); }

  /* Reaction pills */
  .reaction-row { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem; }
  .reaction-row-me { justify-content: flex-end; }
  .reaction-pill { display: inline-flex; align-items: center; gap: 0.2rem; background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: 999px; padding: 0.18rem 0.55rem; font-size: 13px; cursor: pointer; transition: all 0.15s; }
  .reaction-pill span { font-size: 0.68rem; font-weight: 700; color: var(--accent2); }
  .reaction-pill:hover { box-shadow: var(--neu-btn-hover); }

  /* Context menu improvements */
  .msg-menu-right { right: auto; left: 0; }

  /* ── Animations ── */
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.45;transform:scale(0.78);} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
  .section-stack > * { animation: fadeUp 0.26s ease both; }
  .section-stack > *:nth-child(2) { animation-delay: 0.06s; }
  .section-stack > *:nth-child(3) { animation-delay: 0.12s; }
  .section-stack > *:nth-child(4) { animation-delay: 0.18s; }

  /* ── Responsive ── */
  @media (min-width: 640px) {
    .dash-header { padding: 3.5rem 2rem 1.75rem; }
    .stats-row { margin: 0 2rem 1.75rem; }
    .tab-bar { margin: 0 2rem 1.75rem; }
    .tab-body { padding: 0 2rem; }
    .exec-grid { grid-template-columns: repeat(4,1fr); }
    .wa-card { flex-wrap: nowrap; }
  }
  @media (max-width: 400px) {
    .tab-btn { font-size: 0.7rem; padding: 0.45rem 0.55rem; }
    .row-right { flex-direction: column; align-items: flex-end; gap: 0.3rem; }
    .dash-name { font-size: 1.4rem; }
    .dir-search { width: 100%; }
  }
  @media (hover: none) {
    .neu-list-row:hover { box-shadow: var(--neu-out-sm); }
  }
`;