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
  mpesa: { paybill: "625625", account: "7717127865" },
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
        body: { phone: fmt.phone(member.phone), amount: CONFIG.group.monthlyFee, paybill: CONFIG.mpesa.paybill, account: CONFIG.mpesa.account, contributionId: contrib?.id },
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
              <strong>Safaricom only.</strong> Pay manually — Paybill <strong>{CONFIG.mpesa.paybill}</strong>, Account <strong>{CONFIG.mpesa.account}</strong>.
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

// ─── Community ────────────────────────────────────────────────────────────────
function CommunityModule() {
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

// ─── Executives ───────────────────────────────────────────────────────────────
function ExecutivesModule() {
  return (
    <div className="section-stack">
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

// ─── Connect Hub (Chat + Help + People) ──────────────────────────────────────
function ConnectHub({ member }) {
  const [view, setView] = useState("group"); // group | help | people
  const isTreasurer = member.email === CONFIG.treasurer.email;

  return (
    <div className="connect-wrap">
      {/* Sub nav — Apple segmented control style */}
      <div className="seg-control">
        {[["group", "Group"], ["help", isTreasurer ? "Help Requests" : "Get Help"], ["people", "Members"]].map(([key, label]) => (
          <button key={key} className={`seg-btn ${view === key ? "seg-active" : ""}`} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
      </div>

      {view === "group"  && <GroupChat member={member} isTreasurer={isTreasurer} />}
      {view === "help"   && <HelpDesk member={member} isTreasurer={isTreasurer} />}
      {view === "people" && <MembersView member={member} />}
    </div>
  );
}

// ─── Shared chat utilities ────────────────────────────────────────────────────
function Avatar({ name, photo, size = 32 }) {
  const [err, setErr] = useState(false);
  const initials = fmt.initials(name ?? "?");
  if (photo && !err) {
    return <img src={photo} alt={name} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--bg)", boxShadow: "var(--neu-out-sm)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "var(--accent2)", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function ChatInput({ value, onChange, onSend, sending, placeholder = "Message…" }) {
  return (
    <div className="chat-composer">
      <input
        className="chat-composer-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
      />
      <button className={`chat-send-btn ${value.trim() ? "chat-send-active" : ""}`} onClick={onSend} disabled={sending || !value.trim()}>
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
  const bottomRef = useRef(null);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("group_messages")
      .select("*, members(full_name, email)")
      .order("created_at", { ascending: true })
      .limit(150);
    setMessages(data ?? []);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const ch = supabase.channel("grp")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, () => fetch())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages]);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText(""); // clear immediately — optimistic UX
    const { error } = await supabase.from("group_messages").insert({ member_id: member.id, content, is_broadcast: false });
    if (error) {
      setText(content); // restore on failure
      console.error("Send failed:", error);
    }
    setSending(false);
    fetch(); // always refetch to sync
  }, [text, member.id, fetch]);

  const broadcast = useCallback(async () => {
    const content = bcText.trim();
    if (!content) return;
    setBcSending(true);
    setBcText("");
    await supabase.from("group_messages").insert({ member_id: member.id, content, is_broadcast: true });
    setBcSending(false); setBcSent(true);
    setTimeout(() => setBcSent(false), 2500);
  }, [bcText, member.id]);

  // Group consecutive messages by same sender
  const grouped = useMemo(() => {
    return messages.map((m, i) => ({
      ...m,
      showAvatar: i === 0 || messages[i-1].member_id !== m.member_id,
      showName: i === 0 || messages[i-1].member_id !== m.member_id,
    }));
  }, [messages]);

  return (
    <div className="chat-pane">
      <div className="chat-feed">
        {grouped.length === 0 && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <p>Group chat</p>
            <p className="chat-empty-sub">Say hello to everyone.</p>
          </div>
        )}
        {grouped.map(m => {
          const isMe = m.member_id === member.id;
          const isBc = m.is_broadcast;
          if (isBc) return (
            <div key={m.id} className="bc-message">
              <span className="bc-badge">📢 Announcement</span>
              <p className="bc-text">{m.content}</p>
              <span className="msg-time">{fmt.date(m.created_at)}</span>
            </div>
          );
          return (
            <div key={m.id} className={`msg-row ${isMe ? "msg-row-me" : "msg-row-them"}`}>
              {!isMe && m.showAvatar && (
                <Avatar name={m.members?.full_name ?? "?"} size={28} />
              )}
              {!isMe && !m.showAvatar && <div style={{width:28,flexShrink:0}} />}
              <div className="msg-group">
                {!isMe && m.showName && <span className="msg-sender">{m.members?.full_name ?? "Member"}</span>}
                <div className={`msg-bubble ${isMe ? "bubble-me" : "bubble-them"}`}>{m.content}</div>
                {m.showAvatar && <span className="msg-time">{fmt.date(m.created_at)}</span>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isTreasurer && (
        <div className="bc-composer">
          <span className="bc-composer-label">📢</span>
          <input
            className="chat-composer-input"
            placeholder="Broadcast to all members…"
            value={bcText}
            onChange={e => setBcText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && broadcast()}
          />
          <button className={`chat-send-btn ${bcText.trim() ? "chat-send-active" : ""}`} onClick={broadcast} disabled={bcSending || !bcText.trim()}>
            {bcSent ? "✓" : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>}
          </button>
        </div>
      )}

      <ChatInput value={text} onChange={e => setText(e.target.value)} onSend={send} sending={sending} />
    </div>
  );
}

// ─── Help Desk (AI FAQ bot + admin escalation) ───────────────────────────────
const FAQS = [
  { q: "How do I contribute?", a: "Go to the Contribute tab and tap 'Contribute KSh 200 · M-Pesa'. A prompt will be sent to your Safaricom number. Enter your PIN to confirm." },
  { q: "How do I request a loan?", a: "Your account must be active (monthly contribution paid). Go to the Request tab, fill in your details and submit. The treasurer will review within 24 hours." },
  { q: "What is the joining fee?", a: "The one-time joining fee is KSh 50, paid via M-Pesa when you first join." },
  { q: "How much is the monthly contribution?", a: "KSh 200 per month, paid via M-Pesa STK push." },
  { q: "How long until my loan is approved?", a: "Loan requests are reviewed by the treasurer within 24 hours. You'll see the status update in the Loans tab." },
  { q: "My payment isn't showing. What do I do?", a: "Wait a few minutes and refresh. If it still doesn't reflect after 10 minutes, contact the admin using this help desk." },
  { q: "What is the Paybill number?", a: `Paybill: ${CONFIG.mpesa.paybill}, Account: ${CONFIG.mpesa.account}` },
  { q: "Who are the executives?", a: "Check the About tab for the full executive team — Chairperson, Vice Chairperson, Secretary, and Treasurer." },
  { q: "How do I join the WhatsApp group?", a: "Tap the 'Join WhatsApp' button in the About tab to join the community group." },
  { q: "I can't sign in. What do I do?", a: "Use 'Forgot access?' on the sign-in screen. Enter your registered email and we'll send a code. If you still can't get in, ask the admin here." },
];

function HelpDesk({ member, isTreasurer }) {
  const [threads, setThreads] = useState({});
  const [activeThread, setActiveThread] = useState(null);
  const [myMessages, setMyMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [showFAQs, setShowFAQs] = useState(true);
  const bottomRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (isTreasurer) {
      const { data } = await supabase.from("help_messages").select("*, members(full_name)").order("created_at", { ascending: true }).limit(500);
      const map = {};
      (data ?? []).forEach(m => {
        const key = m.is_admin_reply ? m.member_id : m.member_id;
        if (!map[key]) map[key] = { name: m.members?.full_name ?? "Member", msgs: [], lastAt: m.created_at };
        map[key].msgs.push(m);
        map[key].lastAt = m.created_at;
      });
      setThreads(map);
      if (!activeThread && Object.keys(map).length > 0) setActiveThread(Object.keys(map)[0]);
    } else {
      const { data } = await supabase.from("help_messages").select("*").eq("member_id", member.id).order("created_at", { ascending: true });
      setMyMessages(data ?? []);
      if (data && data.length > 0) setShowFAQs(false);
    }
  }, [member.id, isTreasurer, activeThread]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = supabase.channel("help")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "help_messages" }, () => fetchAll())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [myMessages, activeThread, threads, botTyping]);

  // Find best FAQ match using simple keyword scoring
  const findFAQMatch = useCallback((query) => {
    const q = query.toLowerCase();
    let best = null; let bestScore = 0;
    FAQS.forEach(faq => {
      const keywords = faq.q.toLowerCase().split(/\s+/);
      const score = keywords.filter(k => k.length > 3 && q.includes(k)).length;
      if (score > bestScore) { best = faq; bestScore = score; }
    });
    return bestScore >= 1 ? best : null;
  }, []);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true); setText(""); setShowFAQs(false);

    if (isTreasurer) {
      await supabase.from("help_messages").insert({ member_id: activeThread, content, is_admin_reply: true });
      setSending(false); return;
    }

    // Save member message
    await supabase.from("help_messages").insert({ member_id: member.id, content, is_admin_reply: false });
    setSending(false);

    // Try FAQ match first
    const match = findFAQMatch(content);
    if (match) {
      setBotTyping(true);
      await new Promise(r => setTimeout(r, 900)); // natural typing delay
      await supabase.from("help_messages").insert({
        member_id: member.id,
        content: match.a,
        is_admin_reply: true,
        is_bot: true,
      });
      setBotTyping(false);
    } else {
      // No match — bot tells them admin will respond
      setBotTyping(true);
      await new Promise(r => setTimeout(r, 1200));
      await supabase.from("help_messages").insert({
        member_id: member.id,
        content: "Thanks for reaching out. Your message has been sent to the admin and you'll get a response within 24 hours. 🙏",
        is_admin_reply: true,
        is_bot: true,
      });
      setBotTyping(false);
    }
  }, [text, member.id, isTreasurer, activeThread, findFAQMatch]);

  const tapFAQ = useCallback(async (faq) => {
    setShowFAQs(false);
    await supabase.from("help_messages").insert({ member_id: member.id, content: faq.q, is_admin_reply: false });
    setBotTyping(true);
    await new Promise(r => setTimeout(r, 700));
    await supabase.from("help_messages").insert({ member_id: member.id, content: faq.a, is_admin_reply: true, is_bot: true });
    setBotTyping(false);
  }, [member.id]);

  // ── Admin view ──
  if (isTreasurer) {
    const threadList = Object.entries(threads).sort((a,b) => new Date(b[1].lastAt) - new Date(a[1].lastAt));
    const activeMessages = activeThread ? (threads[activeThread]?.msgs ?? []) : [];
    return (
      <div className="help-admin-wrap">
        <div className="thread-list">
          {threadList.length === 0 && <p className="empty-msg" style={{padding:"1rem"}}>No help requests yet.</p>}
          {threadList.map(([id, { name, msgs }]) => (
            <button key={id} className={`thread-item ${activeThread===id?"thread-item-active":""}`} onClick={() => setActiveThread(id)}>
              <Avatar name={name} size={36} />
              <div className="thread-item-info">
                <span className="thread-item-name">{name}</span>
                <span className="thread-item-preview">{msgs[msgs.length-1]?.content ?? ""}</span>
              </div>
            </button>
          ))}
        </div>
        {activeThread && (
          <div className="chat-pane" style={{marginTop:"1rem"}}>
            <p className="section-label" style={{marginBottom:"0.5rem"}}>Replying to {threads[activeThread]?.name}</p>
            <div className="chat-feed" style={{maxHeight:"260px"}}>
              {activeMessages.map(m => (
                <div key={m.id} className={`msg-row ${m.is_admin_reply?"msg-row-me":"msg-row-them"}`}>
                  <div className="msg-group">
                    {!m.is_admin_reply && <span className="msg-sender">{threads[activeThread]?.name}</span>}
                    {m.is_admin_reply && <span className="msg-sender">{m.is_bot ? "🤖 Bot" : "Admin"}</span>}
                    <div className={`msg-bubble ${m.is_admin_reply?"bubble-me":"bubble-them"}`}>{m.content}</div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <ChatInput value={text} onChange={e => setText(e.target.value)} onSend={send} sending={sending} placeholder="Reply as admin…" />
          </div>
        )}
      </div>
    );
  }

  // ── Member view ──
  return (
    <div className="chat-pane">
      <div className="chat-feed">
        {/* Welcome + FAQs */}
        {showFAQs && myMessages.length === 0 && (
          <div className="faq-wrap">
            <div className="bc-message" style={{marginBottom:"0.5rem"}}>
              <span className="bc-badge">🤖 Stahili Assistant</span>
              <p className="bc-text">Hi {member.full_name?.split(" ")[0]} 👋 How can I help you today? Tap a question or type your own.</p>
            </div>
            <div className="faq-list">
              {FAQS.slice(0, 6).map(faq => (
                <button key={faq.q} className="faq-chip" onClick={() => tapFAQ(faq)}>{faq.q}</button>
              ))}
            </div>
          </div>
        )}

        {myMessages.map(m => {
          const isAdmin = m.is_admin_reply;
          return (
            <div key={m.id} className={`msg-row ${!isAdmin?"msg-row-me":"msg-row-them"}`}>
              {isAdmin && (
                <div style={{width:28,height:28,borderRadius:"50%",background:"var(--bg)",boxShadow:"var(--neu-out-sm)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0}}>
                  {m.is_bot ? "🤖" : "👤"}
                </div>
              )}
              <div className="msg-group">
                {isAdmin && <span className="msg-sender">{m.is_bot ? "Assistant" : "Admin"}</span>}
                <div className={`msg-bubble ${isAdmin?"bubble-them":"bubble-me"}`}>{m.content}</div>
              </div>
            </div>
          );
        })}

        {botTyping && (
          <div className="msg-row msg-row-them">
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--bg)",boxShadow:"var(--neu-out-sm)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",flexShrink:0}}>🤖</div>
            <div className="msg-group">
              <span className="msg-sender">Assistant</span>
              <div className="msg-bubble bubble-them typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput value={text} onChange={e => setText(e.target.value)} onSend={send} sending={sending} placeholder="Ask anything…" />
    </div>
  );
}

// ─── Members View ─────────────────────────────────────────────────────────────
function MembersView({ member: currentMember }) {
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
        <input className="neu-input" style={{maxWidth:"160px",padding:"0.5rem 0.75rem",fontSize:"0.8rem",borderRadius:"999px"}} placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="neu-list">
        {filtered.map(m => (
          <div key={m.id} className="neu-list-row" style={{alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flex:1,minWidth:0}}>
              <Avatar name={m.full_name} size={38} />
              <div className="row-info">
                <span className="row-title">{m.full_name}</span>
                <span className="row-meta">{m.phone ?? m.email ?? ""}</span>
              </div>
            </div>
            <ActivePill active={m.paid} />
          </div>
        ))}
        {filtered.length === 0 && <p className="empty-msg" style={{padding:"1.5rem"}}>No members found.</p>}
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
// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPage({ member, onLogout }) {
  const { loans, loading: loansLoading } = useLoans(member.id);
  const { contributions } = useContributions(member.id);
  const ann = useAnnouncement();
  const [tab, setTab] = useState("contribute");

  const isActive = useMemo(() => contributions.some(c => c.month_key===fmt.monthKey() && c.status==="confirmed"), [contributions]);
  const stats = useMemo(() => ({
    total: loans.length,
    approved: loans.filter(l => l.status==="approved").length,
    borrowed: loans.filter(l => l.status==="approved").reduce((s,l) => s+Number(l.amount), 0),
  }), [loans]);
  const pendingCount = useMemo(() => loans.filter(l => l.status==="pending").length, [loans]);

  const TABS = [
    ["contribute", "Contribute", null],
    ["loans", "Loans", pendingCount || null],
    ["request", "Request", null],
    ["connect", "Connect", null],
    ["about", "About", null],
  ];

  return (
    <div className="dash-page">
      <AnnouncementBanner ann={ann} />

      <header className="dash-header">
        <div>
          <p className="dash-eyebrow">Welcome back</p>
          <h2 className="dash-name">{member.full_name}</h2>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <ActivePill active={isActive} />
          <button className="text-link" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="stats-row">
        {[{l:"Requests",v:stats.total},{l:"Approved",v:stats.approved},{l:"Borrowed",v:fmt.currency(stats.borrowed)}].map(({l,v}) => (
          <div key={l} className="stat-tile">
            <span className="stat-val">{v}</span>
            <span className="stat-lbl">{l}</span>
          </div>
        ))}
      </div>

      <nav className="tab-bar">
        {TABS.map(([key,label,badge]) => (
          <button key={key} className={`tab-btn ${tab===key?"tab-btn-active":""}`} onClick={() => setTab(key)}>
            {label}{badge && <span className="tab-badge">{badge}</span>}
          </button>
        ))}
      </nav>

      <div className="tab-body">
        {tab==="contribute" && <ContributionModule member={member} onPhoneAdded={(phone) => { member.phone = phone; }} />}
        {tab==="loans" && (
          <div className="section-stack">
            {loansLoading ? <Spinner /> : loans.length===0 ? (
              <div className="empty-state">
                <p>No loan requests yet.</p>
                <button className="text-link" onClick={() => setTab("request")}>Make your first request →</button>
              </div>
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
        )}
        {tab==="request"   && <LoanModule member={member} isActive={isActive} />}
        {tab==="connect"   && <ConnectHub member={member} />}
        {tab==="about"     && <AboutTab />}
      </div>
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

  /* ── Connect / Chat ── */
  .connect-wrap { display: flex; flex-direction: column; gap: 1rem; }
  .seg-control { display: flex; background: var(--bg); box-shadow: var(--neu-in); border-radius: 12px; padding: 3px; gap: 2px; }
  .seg-btn { flex: 1; padding: 0.45rem 0.5rem; font-family: var(--font-body); font-size: 0.74rem; font-weight: 500; color: var(--muted); background: transparent; border: none; border-radius: 9px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .seg-active { background: var(--bg); color: var(--accent2); font-weight: 700; box-shadow: var(--neu-out-sm); }

  .chat-pane { display: flex; flex-direction: column; gap: 0.6rem; }
  .chat-feed { display: flex; flex-direction: column; gap: 0.35rem; max-height: 55svh; min-height: 260px; overflow-y: auto; padding: 0.5rem 0; scrollbar-width: none; }
  .chat-feed::-webkit-scrollbar { display: none; }
  .chat-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.35rem; padding: 3rem 0; color: var(--muted); font-size: 0.82rem; text-align: center; }
  .chat-empty-icon { font-size: 2rem; margin-bottom: 0.25rem; }
  .chat-empty-sub { font-size: 0.74rem; color: var(--muted); opacity: 0.7; }

  .msg-row { display: flex; align-items: flex-end; gap: 0.5rem; max-width: 85%; }
  .msg-row-me { align-self: flex-end; flex-direction: row-reverse; }
  .msg-row-them { align-self: flex-start; }
  .msg-group { display: flex; flex-direction: column; gap: 0.15rem; }
  .msg-row-me .msg-group { align-items: flex-end; }
  .msg-sender { font-size: 0.62rem; font-weight: 700; color: var(--muted); padding: 0 0.5rem; letter-spacing: 0.02em; }
  .msg-bubble { padding: 0.6rem 0.95rem; border-radius: 18px; font-size: 0.86rem; line-height: 1.45; word-break: break-word; max-width: 100%; }
  .bubble-them { background: var(--bg); box-shadow: var(--neu-out-sm); color: var(--fg); border-bottom-left-radius: 5px; }
  .bubble-me { background: linear-gradient(135deg, var(--accent2), var(--accent)); color: #fff; border-bottom-right-radius: 5px; }
  .bubble-admin { background: linear-gradient(135deg, #5a7a9a, #7a9ab8); color: #fff; border-radius: 12px; text-align: center; }
  .msg-time { font-size: 0.58rem; color: var(--muted); padding: 0 0.5rem; }

  .bc-message { align-self: center; text-align: center; background: var(--bg); box-shadow: var(--neu-out-sm); border-radius: 12px; padding: 0.75rem 1.1rem; max-width: 90%; display: flex; flex-direction: column; gap: 0.25rem; }
  .bc-badge { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent2); }
  .bc-text { font-size: 0.84rem; color: var(--fg); line-height: 1.4; }

  .chat-composer { display: flex; align-items: center; gap: 0.5rem; background: var(--bg); box-shadow: var(--neu-in); border-radius: 999px; padding: 0.3rem 0.3rem 0.3rem 1rem; }
  .chat-composer-input { flex: 1; background: transparent; border: none; outline: none; font-family: var(--font-body); font-size: 0.875rem; color: var(--fg); }
  .chat-composer-input::placeholder { color: var(--muted); }
  .chat-send-btn { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: var(--bg); box-shadow: var(--neu-out-sm); color: var(--muted); transition: all 0.2s; flex-shrink: 0; font-size: 14px; }
  .chat-send-active { background: linear-gradient(135deg, var(--accent2), var(--accent)); color: #fff; box-shadow: 3px 3px 8px rgba(139,157,195,0.4); }

  .bc-composer { display: flex; align-items: center; gap: 0.5rem; background: color-mix(in srgb, var(--accent) 8%, var(--bg)); box-shadow: var(--neu-in-sm); border-radius: 999px; padding: 0.3rem 0.3rem 0.3rem 0.75rem; }
  .bc-composer-label { font-size: 14px; flex-shrink: 0; }

  .help-admin-wrap { display: flex; flex-direction: column; gap: 0.75rem; }
  .thread-list { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
  .thread-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.1rem; background: var(--surface); border: none; cursor: pointer; text-align: left; transition: background 0.15s; width: 100%; }
  .thread-item:hover { background: var(--surface2); }
  .thread-item-active { background: color-mix(in srgb, var(--accent) 10%, var(--surface)); }
  .thread-item-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; min-width: 0; }
  .thread-item-name { font-size: 0.84rem; font-weight: 600; color: var(--fg); }
  .thread-item-preview { font-size: 0.72rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .members-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.25rem; }

  .faq-wrap { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; padding: 0.5rem 0; }
  .faq-list { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
  .faq-chip { background: var(--bg); box-shadow: var(--neu-out-sm); border: none; border-radius: 999px; padding: 0.45rem 1rem; font-family: var(--font-body); font-size: 0.78rem; font-weight: 500; color: var(--accent2); cursor: pointer; transition: all 0.2s; text-align: left; }
  .faq-chip:hover { box-shadow: var(--neu-btn-hover); }
  .faq-chip:active { box-shadow: var(--neu-in-sm); transform: scale(0.98); }

  .typing-dots { display: flex; align-items: center; gap: 4px; padding: 0.65rem 1rem; }
  .typing-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: typingBounce 1.2s ease-in-out infinite; }
  .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-5px); opacity: 1; } }

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