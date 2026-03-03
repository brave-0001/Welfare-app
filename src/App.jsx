import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  supabase: {
    url: "https://ttnztozwxhoxqlalhyts.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0bnp0b3p3eGhveHFsYWxoeXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NTg1MjEsImV4cCI6MjA4ODAzNDUyMX0.Hb7JJxtitpSzf6YHm7a8UfGFSFXyUwMAdqMBkcOuW18",
  },
  treasurer: { email: "treasurer@yourgroup.org" },
  group: {
    name: "Community Welfare Group",
    tagline: "For each other. Always.",
    description: "A student-led welfare circle. We show up when it matters.",
    membershipFee: 50,
    monthlyFee: 200,
    whatsapp: "https://chat.whatsapp.com/KPQUvYLxOtT30lTTsNbrlx?mode=hq1tcli",
  },
  mpesa: { paybill: "625625", account: "7717127865" },
  executives: [
    { name: "Isaac Kipngetich", title: "Chairperson", bio: "Leads with clarity. Keeps the group moving forward.", photo: "/chair.jpg" },
    { name: "Daisy Sakwa", title: "Vice Chairperson", bio: "Bridges ideas and action. Always present when needed.", photo: "/vice.jpg" },
    { name: "Kelvin Simiyu", title: "Secretary", bio: "Keeps records sharp. Nothing falls through the cracks.", photo: "/secretary.jpg" },
    { name: "Brevian Emmanuel", title: "Treasurer", bio: "Manages every shilling with precision and care.", photo: "/treasurer.jpg" },
  ],
  developer: { name: "Brevian Emmanuel", description: "Designed and built with intention.", portfolio: "https://brevian.online" },
};

const TREASURER_PHONE = "254700000000";
const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = {
  currency: (n) => `KSh ${Number(n).toLocaleString()}`,
  date: (d) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }),
  phone: (p) => p.replace(/\D/g, "").replace(/^0/, "254"),
  monthKey: () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; },
  monthLabel: () => new Date().toLocaleDateString("en-KE", { month: "long", year: "numeric" }),
};

const isSafaricom = (phone) => /^254(7[0-9]{8}|1[01][0-9]{7})$/.test(fmt.phone(phone));

const STATUS_LABEL = { pending: "Pending", approved: "Approved", declined: "Declined" };
const STATUS_COLOR = { pending: "#6B9071", approved: "#375534", declined: "#b94040" };

// ─── Router ───────────────────────────────────────────────────────────────────
const getHash = () => window.location.hash.replace("#", "") || "/";
const navigate = (path) => { window.location.hash = path; };

function useRoute() {
  const [route, setRoute] = useState(getHash);
  useEffect(() => {
    const handler = () => setRoute(getHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return route;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#080f0a" : "#0F2A1D");
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
  useEffect(() => {
    supabase.from("loan_requests").select("*, members(full_name, phone)").order("created_at", { ascending: false })
      .then(({ data }) => { setLoans(data ?? []); setLoading(false); });
  }, []);
  return { loans, loading };
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

// ─── Shared Components ────────────────────────────────────────────────────────
function DarkToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} aria-label="Toggle dark mode" style={{
      position:"fixed", top:"1.25rem", right:"1.25rem", zIndex:200,
      width:"2.6rem", height:"1.4rem", borderRadius:"999px",
      border:"1px solid var(--border)", background:"rgba(128,128,128,0.12)",
      backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
      cursor:"pointer", padding:0, display:"flex", alignItems:"center",
      transition:"all 0.2s",
    }}>
      <span style={{
        display:"block", width:"0.95rem", height:"0.95rem", borderRadius:"50%",
        background:"var(--fg)", marginLeft: dark ? "1.4rem" : "0.18rem",
        transition:"margin 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function Spinner({ size = 22 }) {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:"3rem 0" }}>
      <span style={{ display:"inline-block", width:size, height:size, border:"2px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}{hint && <span className="field-hint">{hint}</span>}</label>}
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Input(props) { return <input className="input" {...props} />; }
function Textarea(props) { return <textarea className="input textarea" {...props} />; }

function Btn({ children, loading, variant = "primary", full, ...props }) {
  return (
    <button className={`btn btn-${variant}${full ? " btn-full" : ""}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="btn-spinner" /> : children}
    </button>
  );
}

function Badge({ status }) {
  const colors = { approved:"#375534", pending:"#6B9071", declined:"#b94040" };
  const c = colors[status] ?? "#6B9071";
  return (
    <span style={{ fontSize:"0.66rem", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:c, background:`color-mix(in srgb,${c} 13%,transparent)`, padding:"0.22rem 0.6rem", borderRadius:"5px", flexShrink:0 }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ActivePill({ active }) {
  return (
    <span className={`pill ${active ? "pill-active" : "pill-inactive"}`}>
      <span className="pill-dot" />{active ? "Active" : "Inactive"}
    </span>
  );
}

function SectionHeader({ label, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem" }}>
      <p className="module-label" style={{ marginBottom:0 }}>{label}</p>
      {action}
    </div>
  );
}

// ─── Contribution Module ──────────────────────────────────────────────────────
function ContributionModule({ member }) {
  const { contributions, loading, refetch } = useContributions(member.id);
  const [step, setStep] = useState("idle");
  const [paying, setPaying] = useState(false);
  const [notSafaricom, setNotSafaricom] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const currentKey = fmt.monthKey();
  const paidThisMonth = useMemo(() => contributions.some((c) => c.month_key === currentKey && c.status === "confirmed"), [contributions, currentKey]);
  const totalPaid = useMemo(() => contributions.filter((c) => c.status === "confirmed").reduce((s, c) => s + Number(c.amount), 0), [contributions]);

  useEffect(() => {
    if (step !== "waiting") return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("contributions").select("status").eq("member_id", member.id).eq("month_key", currentKey).single();
      if (data?.status === "confirmed") { clearInterval(interval); refetch(); setStep("done"); }
      setPollCount((n) => n + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [step, member.id, currentKey, refetch]);

  const handlePay = useCallback(async () => {
    if (!isSafaricom(member.phone)) { setNotSafaricom(true); return; }
    setNotSafaricom(false);
    setPaying(true);
    const { data: contrib } = await supabase.from("contributions")
      .upsert({ member_id: member.id, amount: CONFIG.group.monthlyFee, month_key: currentKey, status: "pending" }, { onConflict: "member_id,month_key" })
      .select("id").single();
    try {
      await supabase.functions.invoke("mpesa-stk-push", {
        body: { phone: fmt.phone(member.phone), amount: CONFIG.group.monthlyFee, paybill: CONFIG.mpesa.paybill, account: CONFIG.mpesa.account, contributionId: contrib?.id },
      });
      setStep("waiting");
    } catch (err) { console.error(err); setStep("waiting"); }
    setPaying(false);
  }, [member, currentKey]);

  if (loading) return <Spinner />;

  return (
    <div className="section-wrap">
      {/* Status Card */}
      <div className={`status-card ${paidThisMonth ? "status-card-active" : "status-card-due"}`}>
        <div className="status-card-inner">
          <div>
            <p className="status-month">{fmt.monthLabel()}</p>
            <h2 className="status-heading">{paidThisMonth ? "You're covered." : "Contribution due."}</h2>
            <p className="status-sub">{paidThisMonth ? `${fmt.currency(totalPaid)} contributed in total.` : `${fmt.currency(CONFIG.group.monthlyFee)} keeps your account active.`}</p>
          </div>
          <ActivePill active={paidThisMonth} />
        </div>
        {paidThisMonth && (
          <div className="status-check">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Paid for {fmt.monthLabel()}
          </div>
        )}
      </div>

      {/* Pay Block */}
      {!paidThisMonth && step === "idle" && (
        <div className="card">
          {notSafaricom && (
            <div className="notice notice-warn" style={{ marginBottom:"1rem" }}>
              <p className="notice-title">Safaricom only.</p>
              <p className="notice-body">STK Push requires a Safaricom line. Pay manually — Paybill <strong>{CONFIG.mpesa.paybill}</strong>, Account <strong>{CONFIG.mpesa.account}</strong>.</p>
            </div>
          )}
          <Btn full loading={paying} onClick={handlePay}>
            Pay {fmt.currency(CONFIG.group.monthlyFee)} · M-Pesa
          </Btn>
          <p className="pay-hint">Prompt sent to <strong>{member.phone}</strong>. Enter your PIN to confirm.</p>
        </div>
      )}

      {step === "waiting" && !paidThisMonth && (
        <div className="card">
          <div className="waiting-row">
            <span className="pulse-dot" />
            <div>
              <p className="waiting-title">Waiting for your PIN.</p>
              <p className="waiting-sub">Enter your M-PESA PIN on {member.phone}. Updates automatically.</p>
            </div>
          </div>
          {pollCount > 6 && (
            <button className="link-muted" onClick={() => { refetch(); setStep("idle"); }}>
              Didn't receive a prompt? Try again
            </button>
          )}
        </div>
      )}

      {(step === "done" || (step === "waiting" && paidThisMonth)) && (
        <div className="notice notice-success">
          <p className="notice-title">Confirmed.</p>
          <p className="notice-body">Your account is active for {fmt.monthLabel()}.</p>
        </div>
      )}

      {/* History */}
      {contributions.length > 0 && (
        <div>
          <SectionHeader label="Payment history" />
          <div className="list-wrap">
            {contributions.slice(0, 8).map((c) => (
              <div key={c.id} className="list-row">
                <div className="list-info">
                  <span className="list-title">{new Date(c.month_key+"-01").toLocaleDateString("en-KE",{month:"long",year:"numeric"})}</span>
                  <span className="list-meta">{fmt.date(c.created_at)}</span>
                </div>
                <div className="list-right">
                  <span className="list-amount">{fmt.currency(c.amount)}</span>
                  <Badge status={c.status === "confirmed" ? "approved" : "pending"} />
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
function LoanRequestModule({ member, isActive }) {
  const [form, setForm] = useState({ full_name: "", reg_number: "", phone: member.phone ?? "", amount: "", description: "" });
  const [status, setStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    const val = k === "reg_number" ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }));
    if (status === "denied") setStatus(null);
  };

  if (!isActive) {
    return (
      <div className="section-wrap">
        <div className="gate-card">
          <div className="gate-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <p className="gate-title">Account inactive.</p>
          <p className="gate-sub">Contribute {fmt.currency(CONFIG.group.monthlyFee)} for {fmt.monthLabel()} to unlock loan requests.</p>
        </div>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="section-wrap">
        <div className="notice notice-success">
          <p className="notice-title">Request received.</p>
          <p className="notice-body">The treasurer will review and reach out shortly.</p>
        </div>
        <button className="link-muted" style={{ marginTop:"0.75rem" }} onClick={() => { setStatus(null); setForm({ full_name:"", reg_number:"", phone:member.phone??"", amount:"", description:"" }); }}>
          Submit another request
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Required.";
    if (!form.reg_number.trim()) e.reg_number = "Required.";
    if (!form.phone.trim()) e.phone = "Required.";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = "Enter a valid amount.";
    if (!form.description.trim()) e.description = "Required.";
    if (form.description.length > 100) e.description = "Max 100 characters.";
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!form.reg_number.startsWith("COM")) { setStatus("denied"); return; }
    setStatus("loading");
    const { error } = await supabase.from("loan_requests").insert({
      member_id: member.id,
      description: `${form.description} | Reg: ${form.reg_number}`,
      amount: Number(form.amount),
      status: "pending",
    });
    if (!error) {
      await supabase.functions.invoke("send-loan-email", {
        body: { to: CONFIG.treasurer.email, subject: `Loan request — ${form.full_name}`, member: { name: form.full_name, phone: form.phone, reg: form.reg_number }, loan: { amount: form.amount, description: form.description } },
      });
      setStatus("submitted");
    } else { setStatus(null); }
  };

  return (
    <div className="section-wrap">
      {status === "denied" && (
        <div className="notice notice-warn" style={{ marginBottom:"1rem" }}>
          <p className="notice-title">Not eligible.</p>
          <p className="notice-body">This welfare group supports Computer Science students. Your registration number doesn't match.</p>
        </div>
      )}
      <div className="card card-form">
        <Field label="Full name" error={errors.full_name}>
          <Input placeholder="As per your ID" value={form.full_name} onChange={set("full_name")} />
        </Field>
        <Field label="Registration number" error={errors.reg_number}>
          <Input placeholder="COM/XXX/XXXX" value={form.reg_number} onChange={set("reg_number")} style={{ textTransform:"uppercase" }} />
        </Field>
        <Field label="Phone number" error={errors.phone}>
          <Input type="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="Amount (KSh)" error={errors.amount}>
          <Input type="number" placeholder="e.g. 2000" min="1" value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label="Description" hint={`  ·  ${100 - form.description.length} left`} error={errors.description}>
          <Textarea placeholder="What do you need this loan for?" value={form.description} maxLength={100} rows={3} onChange={set("description")} />
        </Field>
        <Btn full loading={status === "loading"} onClick={handleSubmit}>Submit request</Btn>
      </div>
    </div>
  );
}

// ─── Community Modules ────────────────────────────────────────────────────────
function CommunityModule() {
  return (
    <div className="section-wrap">
      <div className="card community-card">
        <h2 className="community-heading">{CONFIG.group.description}</h2>
        <div className="benefit-list">
          {["Emergency financial support when it matters most.", "A community that moves as one.", "Student welfare, handled with dignity."].map((b) => (
            <div key={b} className="benefit-row"><span className="benefit-dot" /><span>{b}</span></div>
          ))}
        </div>
      </div>
      <div className="wa-card">
        <div>
          <h3 className="wa-heading">Join the conversation.</h3>
          <p className="wa-sub">Updates, support, and community — all in one place.</p>
        </div>
        <a href={CONFIG.group.whatsapp} target="_blank" rel="noreferrer" className="btn-wa">Join WhatsApp</a>
      </div>
      <div className="dev-card">
        <div>
          <p className="dev-name">{CONFIG.developer.name}</p>
          <p className="dev-desc">{CONFIG.developer.description}</p>
        </div>
        <a href={CONFIG.developer.portfolio} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Portfolio →</a>
      </div>
    </div>
  );
}

function ExecutivesModule() {
  return (
    <div className="section-wrap">
      <div className="exec-grid">
        {CONFIG.executives.map((ex) => (
          <div key={ex.name} className="exec-card">
            <div className="exec-avatar-wrap">
              <img src={ex.photo} alt={ex.name} className="exec-avatar" onError={(e) => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
              <div className="exec-initials" style={{ display:"none" }}>{ex.name.split(" ").map((n)=>n[0]).join("").slice(0,2)}</div>
            </div>
            <span className="exec-name">{ex.name}</span>
            <span className="exec-role">{ex.title}</span>
            <span className="exec-bio">{ex.bio}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function LandingPage({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    const cleaned = fmt.phone(phone);
    if (cleaned.length < 12) { setError("Enter a valid phone number."); return; }
    setLoading(true); setError("");
    const { data } = await supabase.from("members").select("*").eq("phone", cleaned).single();
    setLoading(false);
    if (!data || !data.paid) { navigate("/register"); return; }
    onLogin(data); navigate("/dashboard");
  }, [phone, onLogin]);

  return (
    <div className="splash">
      <div className="splash-bg" />
      <div className="splash-content">
        <div className="splash-badge">Student Welfare</div>
        <h1 className="splash-title">{CONFIG.group.name}</h1>
        <p className="splash-tagline">{CONFIG.group.tagline}</p>
        <div className="auth-card">
          <Field label="Phone number" error={error}>
            <Input type="tel" placeholder="07XX XXX XXX" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </Field>
          <Btn full loading={loading} onClick={handleSubmit}>Sign in</Btn>
          <p className="auth-foot">New member? <button className="link" onClick={() => navigate("/register")}>Join for {fmt.currency(CONFIG.group.membershipFee)}.</button></p>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = useCallback(() => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Name is required.";
    if (fmt.phone(form.phone).length < 12) e.phone = "Enter a valid phone number.";
    return e;
  }, [form]);

  const handleRegister = useCallback(async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true); setErrors({});
    const phone = fmt.phone(form.phone);
    const { data: existing } = await supabase.from("members").select("id,paid").eq("phone", phone).single();
    if (existing?.paid) { navigate("/"); return; }
    if (!existing) {
      const { error } = await supabase.from("members").insert({ full_name: form.full_name.trim(), phone, paid: false });
      if (error) { setErrors({ server: "Could not save. Try again." }); setLoading(false); return; }
    }
    try { await supabase.functions.invoke("mpesa-stk-push", { body: { phone, amount: CONFIG.group.membershipFee } }); }
    catch (err) { console.error(err); }
    setStep("paying"); setLoading(false);
  }, [form, validate]);

  const confirmPayment = useCallback(async () => {
    setLoading(true);
    await supabase.from("members").update({ paid: true }).eq("phone", fmt.phone(form.phone));
    setStep("done"); setLoading(false);
  }, [form.phone]);

  if (step === "done") return (
    <div className="splash"><div className="splash-bg" /><div className="splash-content" style={{ textAlign:"center" }}>
      <h1 className="splash-title" style={{ fontSize:"clamp(2rem,8vw,4rem)" }}>Welcome.</h1>
      <p className="splash-tagline">You're part of something real now.</p>
      <Btn full onClick={() => navigate("/")}>Sign in</Btn>
    </div></div>
  );

  if (step === "paying") return (
    <div className="splash"><div className="splash-bg" /><div className="splash-content" style={{ textAlign:"center" }}>
      <h2 className="splash-title" style={{ fontSize:"clamp(1.8rem,6vw,3rem)" }}>Check your phone.</h2>
      <p className="splash-tagline" style={{ marginBottom:"2rem" }}>Pay {fmt.currency(CONFIG.group.membershipFee)} sent to <strong style={{ color:"var(--white)" }}>{form.phone}</strong>.</p>
      <Btn full loading={loading} onClick={confirmPayment}>I've paid</Btn>
      <button className="link" style={{ display:"block", margin:"1.25rem auto 0", fontSize:"0.82rem", color:"var(--silver)" }} onClick={() => setStep("form")}>Go back</button>
    </div></div>
  );

  return (
    <div className="splash"><div className="splash-bg" /><div className="splash-content">
      <h1 className="splash-title" style={{ fontSize:"clamp(1.8rem,6vw,3.5rem)" }}>Join the group.</h1>
      <p className="splash-tagline">{fmt.currency(CONFIG.group.membershipFee)} once. That's it.</p>
      <div className="auth-card">
        {errors.server && <p className="field-error">{errors.server}</p>}
        <Field label="Full name" error={errors.full_name}><Input placeholder="Jane Muthoni" value={form.full_name} onChange={set("full_name")} /></Field>
        <Field label="Phone number" error={errors.phone}><Input type="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={set("phone")} /></Field>
        <Btn full loading={loading} onClick={handleRegister}>Pay {fmt.currency(CONFIG.group.membershipFee)} &amp; join</Btn>
        <p className="auth-foot">Already a member? <button className="link" onClick={() => navigate("/")}>Sign in.</button></p>
      </div>
    </div></div>
  );
}

function DashboardPage({ member, onLogout }) {
  const { loans, loading: loansLoading } = useLoans(member.id);
  const { contributions } = useContributions(member.id);
  const [tab, setTab] = useState("contribute");

  const isActive = useMemo(() => contributions.some((c) => c.month_key === fmt.monthKey() && c.status === "confirmed"), [contributions]);

  const stats = useMemo(() => ({
    total: loans.length,
    approved: loans.filter((l) => l.status === "approved").length,
    borrowed: loans.filter((l) => l.status === "approved").reduce((s, l) => s + Number(l.amount), 0),
  }), [loans]);

  const TABS = [["contribute","Contribute"],["loans","Loans"],["request","Request"],["community","Community"],["team","Team"]];

  return (
    <div className="dashboard">
      {/* Top bar */}
      <header className="dash-top">
        <div>
          <p className="dash-eyebrow">Welcome back</p>
          <h2 className="dash-name">{member.full_name}</h2>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <ActivePill active={isActive} />
          <button className="link-muted" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label:"Requests", value:stats.total },
          { label:"Approved", value:stats.approved },
          { label:"Borrowed", value:fmt.currency(stats.borrowed) },
        ].map(({ label, value }) => (
          <div key={label} className="stat-tile">
            <span className="stat-val">{value}</span>
            <span className="stat-lbl">{label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <nav className="tab-bar">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab===key ? "tab-btn-active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {/* Content */}
      <div className="tab-content">
        {tab === "contribute" && <ContributionModule member={member} />}
        {tab === "loans" && (
          <div className="section-wrap">
            {loansLoading ? <Spinner /> : loans.length === 0 ? (
              <div className="empty">
                <p>No loan requests yet.</p>
                <button className="link-muted" onClick={() => setTab("request")}>Make your first request →</button>
              </div>
            ) : (
              <div className="list-wrap">
                {loans.map((loan) => (
                  <div key={loan.id} className="list-row">
                    <div className="list-info">
                      <span className="list-title">{loan.description}</span>
                      <span className="list-meta">{fmt.date(loan.created_at)}</span>
                    </div>
                    <div className="list-right">
                      {loan.amount > 0 && <span className="list-amount">{fmt.currency(loan.amount)}</span>}
                      <Badge status={loan.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "request" && <LoanRequestModule member={member} isActive={isActive} />}
        {tab === "community" && <CommunityModule />}
        {tab === "team" && <ExecutivesModule />}
      </div>
    </div>
  );
}

function AdminPage() {
  const { loans, loading } = useAllLoans();
  const [updating, setUpdating] = useState(null);

  const updateStatus = useCallback(async (id, status) => {
    setUpdating(id);
    await supabase.from("loan_requests").update({ status }).eq("id", id);
    setUpdating(null);
    window.location.reload();
  }, []);

  const grouped = useMemo(() => ({
    pending: loans.filter((l) => l.status === "pending"),
    other: loans.filter((l) => l.status !== "pending"),
  }), [loans]);

  return (
    <div className="dashboard">
      <header className="dash-top">
        <div><p className="dash-eyebrow">Treasurer view</p><h2 className="dash-name">Loan Requests</h2></div>
        <button className="link-muted" onClick={() => navigate("/")}>Sign out</button>
      </header>
      {loading ? <Spinner /> : (
        <div className="section-wrap">
          {grouped.pending.length > 0 && (
            <>
              <p className="module-label">Pending</p>
              <div className="list-wrap" style={{ marginBottom:"2rem" }}>
                {grouped.pending.map((loan) => (
                  <div key={loan.id} className="list-row list-row-admin">
                    <div className="list-info">
                      <span className="list-title">{loan.description}</span>
                      <span className="list-meta">{loan.members?.full_name} · {loan.members?.phone} · {fmt.date(loan.created_at)}</span>
                    </div>
                    <div className="list-right" style={{ gap:"0.4rem", flexWrap:"wrap", justifyContent:"flex-end" }}>
                      {loan.amount > 0 && <span className="list-amount">{fmt.currency(loan.amount)}</span>}
                      <Btn variant="ghost" style={{ fontSize:"0.72rem", padding:"0.3rem 0.7rem", color:"#375534" }} loading={updating===loan.id} onClick={() => updateStatus(loan.id,"approved")}>Approve</Btn>
                      <Btn variant="ghost" style={{ fontSize:"0.72rem", padding:"0.3rem 0.7rem", color:"#b94040" }} loading={updating===loan.id} onClick={() => updateStatus(loan.id,"declined")}>Decline</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {grouped.other.length > 0 && (
            <>
              <p className="module-label">History</p>
              <div className="list-wrap">
                {grouped.other.map((loan) => (
                  <div key={loan.id} className="list-row">
                    <div className="list-info">
                      <span className="list-title">{loan.description}</span>
                      <span className="list-meta">{loan.members?.full_name} · {loan.members?.phone} · {fmt.date(loan.created_at)}</span>
                    </div>
                    <div className="list-right">
                      {loan.amount > 0 && <span className="list-amount">{fmt.currency(loan.amount)}</span>}
                      <Badge status={loan.status} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {loans.length === 0 && <div className="empty"><p>No loan requests yet.</p></div>}
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useDarkMode();
  const route = useRoute();
  const [authedMember, setAuthedMember] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("member")); } catch (err) { return null; }
  });

  const login = useCallback((member) => {
    sessionStorage.setItem("member", JSON.stringify(member));
    setAuthedMember(member);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("member");
    setAuthedMember(null);
    navigate("/");
  }, []);

  const isTreasurer = authedMember?.phone === TREASURER_PHONE;

  const page = useMemo(() => {
    if (route === "/register") return <RegisterPage />;
    if (route === "/admin") {
      if (!authedMember || !isTreasurer) { navigate("/"); return null; }
      return <AdminPage />;
    }
    if (route === "/dashboard") {
      if (!authedMember) { navigate("/"); return null; }
      return <DashboardPage member={authedMember} onLogout={logout} />;
    }
    return <LandingPage onLogin={login} />;
  }, [route, authedMember, isTreasurer, login, logout]);

  return (
    <>
      <style>{CSS}</style>
      <DarkToggle dark={dark} onToggle={() => setDark((d) => !d)} />
      <main>{page}</main>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

  /* ── Palette
     #5D6B6B  slate-teal (darkest)
     #6DD7D8  → actually the 5th pill reads #6DD7D8 — light teal
     #D5E6E5  pale teal
     #F1F7F7  near-white
     #D0D9D4  silver
     #F7CBCA  blush (lightest)
  ── */

  :root {
    --p1: #5D6B6B;
    --p2: #7eaaaa;
    --p3: #D5E6E5;
    --p4: #F1F7F7;
    --p5: #D0D9D4;
    --p6: #F7CBCA;

    /* Light — crisp white-teal world */
    --bg:        #F1F7F7;
    --bg2:       #E8F2F2;
    --surface:   #ffffff;
    --surface2:  #f4fafa;
    --border:    rgba(93,107,107,0.12);
    --border2:   rgba(93,107,107,0.22);
    --fg:        #2c3d3d;
    --fg2:       #3d5252;
    --muted:     #7a9696;
    --input-bg:  #ffffff;
    --shadow:    0 1px 4px rgba(93,107,107,0.08), 0 6px 24px rgba(93,107,107,0.06);
    --shadow-md: 0 4px 16px rgba(93,107,107,0.12), 0 12px 40px rgba(93,107,107,0.08);
    --font-head: 'DM Serif Display', Georgia, serif;
    --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
    --r:    20px;
    --r-sm: 12px;
    --t:    0.4s cubic-bezier(0.4,0,0.2,1);
    --max:  720px;
  }

  [data-theme="dark"] {
    /* Dark — deep slate world */
    --bg:       #3d4f4f;
    --bg2:      #344444;
    --surface:  #4a5e5e;
    --surface2: #526868;
    --border:   rgba(209,230,229,0.10);
    --border2:  rgba(209,230,229,0.20);
    --fg:       #F1F7F7;
    --fg2:      #D5E6E5;
    --muted:    #9bbaba;
    --input-bg: #4a5e5e;
    --shadow:   0 1px 4px rgba(0,0,0,0.28), 0 6px 24px rgba(0,0,0,0.20);
    --shadow-md:0 4px 16px rgba(0,0,0,0.35), 0 12px 40px rgba(0,0,0,0.25);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body {
    font-family: var(--font-body);
    background: var(--bg);
    color: var(--fg);
    transition: background 0.5s cubic-bezier(0.4,0,0.2,1), color 0.4s ease;
    min-height: 100svh;
    overflow-x: hidden;
  }

  /* ── Splash ── */
  .splash {
    min-height: 100svh;
    display: flex; align-items: center; justify-content: center;
    padding: 2rem 1.25rem;
    position: relative; overflow: hidden;
  }
  .splash-bg {
    position: absolute; inset: 0; z-index: 0;
    background: linear-gradient(150deg,
      var(--p1)  0%,
      #527070   25%,
      #7eaaaa   55%,
      var(--p3) 80%,
      var(--p6) 100%
    );
  }
  [data-theme="dark"] .splash-bg {
    background: linear-gradient(150deg,
      #2a3838 0%,
      var(--p1) 40%,
      #527070  80%,
      var(--p3) 100%
    );
  }
  .splash-content {
    position: relative; z-index: 1;
    width: 100%; max-width: 420px;
    text-align: center;
  }
  .splash-badge {
    display: inline-block;
    font-size: 0.63rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;
    color: rgba(241,247,247,0.85);
    background: rgba(255,255,255,0.12);
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 999px; padding: 0.3rem 1rem;
    margin-bottom: 1.75rem;
  }
  .splash-title {
    font-family: var(--font-head);
    font-size: clamp(2rem, 7vw, 4rem);
    font-weight: 400; line-height: 1.08;
    letter-spacing: -0.01em;
    color: #F1F7F7;
    margin-bottom: 0.75rem;
  }
  .splash-tagline {
    font-size: 0.95rem; font-weight: 300;
    color: rgba(213,230,229,0.85);
    margin-bottom: 2.5rem; letter-spacing: 0.02em;
  }
  .auth-card {
    background: rgba(255,255,255,0.10);
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: var(--r); padding: 1.75rem;
    display: flex; flex-direction: column; gap: 1rem;
    text-align: left;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
  }
  [data-theme="dark"] .auth-card { background: rgba(42,56,56,0.7); border-color: rgba(209,230,229,0.14); }
  .auth-card .input { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.18); color: #F1F7F7; }
  .auth-card .input::placeholder { color: rgba(209,230,229,0.5); }
  .auth-card .input:focus { border-color: rgba(255,255,255,0.5); box-shadow: 0 0 0 3px rgba(255,255,255,0.08); }
  .auth-card .field-label { color: rgba(209,230,229,0.75); }
  .auth-card .field-error { color: var(--p6); }
  .auth-foot { font-size: 0.79rem; color: rgba(209,230,229,0.75); text-align: center; }
  .auth-foot .link { color: rgba(241,247,247,0.9); }

  /* ── Dashboard ── */
  .dashboard { max-width: var(--max); margin: 0 auto; padding: 0 0 6rem; }
  .dash-top {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 3rem 1.5rem 1.5rem; gap: 1rem;
  }
  .dash-eyebrow {
    font-size: 0.63rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--muted); margin-bottom: 0.25rem;
  }
  .dash-name {
    font-family: var(--font-head);
    font-size: clamp(1.5rem, 5vw, 2.4rem);
    font-weight: 400; letter-spacing: -0.01em; line-height: 1.1;
  }

  /* ── Stats ── */
  .stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px; background: var(--border);
    margin: 0 1.5rem 1.5rem;
    border-radius: var(--r); overflow: hidden;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }
  .stat-tile { background: var(--surface); padding: 1.1rem 1rem; transition: background var(--t); }
  .stat-val { display: block; font-size: 1.05rem; font-weight: 600; color: var(--p1); margin-bottom: 0.15rem; }
  [data-theme="dark"] .stat-val { color: var(--p3); }
  .stat-lbl { display: block; font-size: 0.6rem; font-weight: 600; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }

  /* ── Tab Bar ── */
  .tab-bar {
    display: flex; gap: 0.2rem;
    margin: 0 1.5rem 1.5rem;
    background: var(--surface); border-radius: var(--r-sm);
    padding: 0.22rem; border: 1px solid var(--border);
    overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
    box-shadow: var(--shadow);
  }
  .tab-bar::-webkit-scrollbar { display: none; }
  .tab-btn {
    flex: 1; min-width: fit-content;
    padding: 0.52rem 0.9rem;
    font-family: var(--font-body); font-size: 0.76rem; font-weight: 500;
    color: var(--muted); background: transparent;
    border: none; border-radius: 9px;
    cursor: pointer; white-space: nowrap;
    transition: all var(--t);
  }
  .tab-btn-active {
    background: linear-gradient(135deg, var(--p1) 0%, #527070 100%);
    color: var(--p4); font-weight: 600;
    box-shadow: 0 2px 8px rgba(93,107,107,0.25);
  }
  [data-theme="dark"] .tab-btn-active { background: linear-gradient(135deg, #2a3838 0%, var(--p1) 100%); color: var(--p3); }
  .tab-content { padding: 0 1.5rem; }

  /* ── Cards & Sections ── */
  .section-wrap { display: flex; flex-direction: column; gap: 1.1rem; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 1.5rem; box-shadow: var(--shadow); }
  .card-form { display: flex; flex-direction: column; gap: 1rem; }
  .module-label { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.75rem; }

  /* ── Status Card ── */
  .status-card { border-radius: var(--r); overflow: hidden; box-shadow: var(--shadow-md); }
  .status-card-active {
    background: linear-gradient(140deg, var(--p1) 0%, #527272 45%, var(--p2) 100%);
  }
  .status-card-due { background: var(--surface); border: 1px solid var(--border); }
  .status-card-inner { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.75rem; }
  .status-month { font-size: 0.63rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.4rem; }
  .status-card-active .status-month { color: rgba(213,230,229,0.75); }
  .status-card-due   .status-month { color: var(--muted); }
  .status-heading {
    font-family: var(--font-head);
    font-size: clamp(1.25rem, 4vw, 1.7rem);
    font-weight: 400; line-height: 1.1; margin-bottom: 0.4rem;
  }
  .status-card-active .status-heading { color: var(--p4); }
  .status-card-due   .status-heading { color: var(--fg); }
  .status-sub { font-size: 0.78rem; font-weight: 300; }
  .status-card-active .status-sub { color: rgba(213,230,229,0.7); }
  .status-card-due   .status-sub { color: var(--muted); }
  .status-check {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.77rem; font-weight: 500;
    color: rgba(213,230,229,0.75);
    padding: 0.75rem 1.75rem;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  /* ── Pay block ── */
  .pay-hint { font-size: 0.72rem; color: var(--muted); text-align: center; line-height: 1.45; margin-top: 0.25rem; }
  .waiting-row { display: flex; align-items: center; gap: 0.9rem; }
  .pulse-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--p2); flex-shrink: 0; animation: pulse 1.7s ease-in-out infinite; }
  .waiting-title { font-size: 0.88rem; font-weight: 600; margin-bottom: 0.15rem; }
  .waiting-sub { font-size: 0.74rem; color: var(--muted); line-height: 1.4; }

  /* ── Notices ── */
  .notice { border-radius: var(--r-sm); padding: 1rem 1.25rem; }
  .notice-success { background: rgba(125,180,180,0.12); border: 1px solid rgba(125,180,180,0.25); }
  .notice-warn { background: rgba(247,203,202,0.15); border: 1px solid rgba(247,203,202,0.35); }
  .notice-title { font-size: 0.88rem; font-weight: 600; margin-bottom: 0.2rem; }
  .notice-success .notice-title { color: var(--p1); }
  [data-theme="dark"] .notice-success .notice-title { color: var(--p3); }
  .notice-warn .notice-title { color: #b06060; }
  [data-theme="dark"] .notice-warn .notice-title { color: var(--p6); }
  .notice-body { font-size: 0.76rem; color: var(--muted); line-height: 1.55; }

  /* ── Gate ── */
  .gate-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); padding: 2.75rem 1.5rem;
    text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.9rem;
  }
  .gate-icon {
    width: 52px; height: 52px; border-radius: 50%;
    background: rgba(125,170,170,0.12); border: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: center; color: var(--p2);
  }
  .gate-title { font-family: var(--font-head); font-size: 1.2rem; font-weight: 400; }
  .gate-sub { font-size: 0.81rem; color: var(--muted); line-height: 1.55; max-width: 280px; }

  /* ── List ── */
  .list-wrap { display: flex; flex-direction: column; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; box-shadow: var(--shadow); }
  .list-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; background: var(--surface); padding: 1rem 1.25rem; transition: background 0.2s; }
  .list-row:hover { background: var(--surface2); }
  .list-row-admin { flex-wrap: wrap; }
  .list-info { display: flex; flex-direction: column; gap: 0.2rem; flex: 1 1 0; min-width: 0; }
  .list-title { font-size: 0.84rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list-meta { font-size: 0.65rem; color: var(--muted); }
  .list-right { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
  .list-amount { font-size: 0.84rem; font-weight: 700; color: var(--p1); }
  [data-theme="dark"] .list-amount { color: var(--p3); }

  /* ── Community ── */
  .community-card { display: flex; flex-direction: column; gap: 1.25rem; }
  .community-heading {
    font-family: var(--font-head);
    font-size: clamp(1.05rem, 3vw, 1.3rem);
    font-weight: 400; font-style: italic;
    line-height: 1.55; color: var(--fg);
  }
  .benefit-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .benefit-row { display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.82rem; color: var(--muted); line-height: 1.55; }
  .benefit-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--p2); flex-shrink: 0; margin-top: 0.5rem; }

  .wa-card {
    background: linear-gradient(140deg, var(--p1) 0%, #527272 60%, var(--p2) 100%);
    border-radius: var(--r); padding: 1.75rem;
    display: flex; align-items: center; justify-content: space-between;
    gap: 1.5rem; flex-wrap: wrap; box-shadow: var(--shadow-md);
  }
  .wa-heading { font-family: var(--font-head); font-size: 1.2rem; font-weight: 400; color: var(--p4); margin-bottom: 0.3rem; }
  .wa-sub { font-size: 0.77rem; color: rgba(213,230,229,0.75); line-height: 1.4; }
  .btn-wa {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.72rem 1.5rem;
    background: var(--p6); color: var(--p1);
    font-family: var(--font-body); font-size: 0.84rem; font-weight: 600;
    border-radius: var(--r-sm); text-decoration: none; border: none;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: opacity var(--t), transform 0.1s;
  }
  .btn-wa:hover { opacity: 0.88; }
  .btn-wa:active { transform: scale(0.97); }

  .dev-card {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: 1.1rem 1.25rem;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm);
  }
  .dev-name { font-size: 0.84rem; font-weight: 600; margin-bottom: 0.1rem; }
  .dev-desc { font-size: 0.71rem; color: var(--muted); }

  /* ── Executives ── */
  .exec-grid {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 1px; background: var(--border);
    border: 1px solid var(--border); border-radius: var(--r); overflow: hidden;
    box-shadow: var(--shadow);
  }
  .exec-card { background: var(--surface); padding: 1.6rem 1rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.6rem; transition: background 0.2s; }
  .exec-card:hover { background: var(--surface2); }
  .exec-avatar-wrap { width: 70px; height: 70px; }
  .exec-avatar { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--border2); }
  .exec-initials {
    width: 70px; height: 70px; border-radius: 50%;
    background: linear-gradient(135deg, var(--p1), var(--p2));
    color: var(--p4); font-size: 1.1rem; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
  }
  .exec-name { font-size: 0.84rem; font-weight: 600; }
  .exec-role { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--p2); }
  [data-theme="dark"] .exec-role { color: var(--p3); }
  .exec-bio { font-size: 0.7rem; color: var(--muted); line-height: 1.45; }

  /* ── Pill ── */
  .pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.67rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.28rem 0.7rem; border-radius: 999px; flex-shrink: 0; }
  .pill-dot { width: 6px; height: 6px; border-radius: 50%; }
  .pill-active { color: var(--p4); background: rgba(255,255,255,0.15); }
  .pill-active .pill-dot { background: var(--p4); box-shadow: 0 0 0 2px rgba(241,247,247,0.2); }
  .pill-inactive { color: var(--muted); background: rgba(93,107,107,0.10); }
  .pill-inactive .pill-dot { background: var(--muted); }
  .dash-top .pill-active { color: var(--p1); background: rgba(125,170,170,0.15); }
  .dash-top .pill-active .pill-dot { background: var(--p2); box-shadow: 0 0 0 2px rgba(125,170,170,0.2); }
  [data-theme="dark"] .dash-top .pill-active { color: var(--p3); background: rgba(125,170,170,0.15); }
  [data-theme="dark"] .dash-top .pill-active .pill-dot { background: var(--p3); }

  /* ── Inputs ── */
  .field { display: flex; flex-direction: column; gap: 0.42rem; }
  .field-label { font-size: 0.71rem; font-weight: 500; letter-spacing: 0.03em; color: var(--muted); display: flex; align-items: center; gap: 0.2rem; }
  .field-hint { font-weight: 400; color: var(--p5); font-size: 0.67rem; }
  .field-error { font-size: 0.68rem; color: #b06060; margin-top: 0.1rem; }
  .input {
    width: 100%; padding: 0.8rem 1rem;
    font-family: var(--font-body); font-size: 0.9rem;
    color: var(--fg); background: var(--input-bg);
    border: 1.5px solid var(--border); border-radius: var(--r-sm);
    outline: none; resize: none; -webkit-appearance: none;
    transition: border-color 0.25s, box-shadow 0.25s;
  }
  .input:focus { border-color: var(--p2); box-shadow: 0 0 0 3px rgba(125,170,170,0.14); }
  .input::placeholder { color: var(--p5); }
  .textarea { min-height: 84px; line-height: 1.55; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.8rem 1.5rem;
    font-family: var(--font-body); font-size: 0.875rem; font-weight: 600;
    border-radius: var(--r-sm); border: 1.5px solid transparent;
    cursor: pointer; white-space: nowrap; text-decoration: none;
    transition: opacity var(--t), transform 0.12s, box-shadow var(--t);
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .btn-full { width: 100%; }
  .btn-primary {
    background: linear-gradient(135deg, var(--p1) 0%, #527070 100%);
    color: var(--p4);
    box-shadow: 0 2px 8px rgba(93,107,107,0.25);
  }
  .btn-primary:hover:not(:disabled) { opacity: 0.88; box-shadow: 0 4px 16px rgba(93,107,107,0.3); }
  .btn-ghost { background: transparent; border-color: var(--border2); color: var(--fg); }
  .btn-ghost:hover:not(:disabled) { background: var(--surface2); }
  .btn-sm { padding: 0.45rem 1rem; font-size: 0.77rem; }
  .btn-spinner { width: 15px; height: 15px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite; }
  /* Splash primary uses blush */
  .splash-content .btn-primary { background: var(--p6); color: var(--p1); box-shadow: 0 2px 12px rgba(247,203,202,0.4); }
  .splash-content .btn-primary:hover:not(:disabled) { opacity: 0.9; }

  /* ── Links ── */
  .link { background: none; border: none; cursor: pointer; font-family: var(--font-body); font-size: inherit; color: var(--p2); text-decoration: underline; text-underline-offset: 2px; padding: 0; }
  .link-muted { background: none; border: none; cursor: pointer; font-family: var(--font-body); font-size: 0.78rem; color: var(--muted); padding: 0; text-decoration: none; transition: color 0.2s; }
  .link-muted:hover { color: var(--fg); }
  .empty { color: var(--muted); font-size: 0.875rem; padding: 3rem 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }

  /* ── Animations ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.75); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .section-wrap > * { animation: fadeUp 0.28s ease both; }
  .section-wrap > *:nth-child(2) { animation-delay: 0.06s; }
  .section-wrap > *:nth-child(3) { animation-delay: 0.12s; }
  .section-wrap > *:nth-child(4) { animation-delay: 0.18s; }

  /* ── Responsive ── */
  @media (min-width: 640px) {
    .dashboard { padding-bottom: 4rem; }
    .dash-top { padding: 3.5rem 2rem 1.75rem; }
    .stats-grid { margin: 0 2rem 1.75rem; }
    .tab-bar { margin: 0 2rem 1.75rem; }
    .tab-content { padding: 0 2rem; }
    .exec-grid { grid-template-columns: repeat(4,1fr); }
    .wa-card { flex-wrap: nowrap; }
  }
  @media (max-width: 400px) {
    .tab-btn { font-size: 0.71rem; padding: 0.45rem 0.5rem; }
    .list-right { flex-direction: column; align-items: flex-end; gap: 0.3rem; }
    .dash-name { font-size: 1.45rem; }
  }
  @media (hover: none) {
    .list-row:hover { background: var(--surface); }
    .exec-card:hover { background: var(--surface); }
  }
`;
