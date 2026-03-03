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

const isSafaricom = (phone) => {
  const p = fmt.phone(phone);
  return /^254(7[0-9]{8}|1[01][0-9]{7})$/.test(p);
};

const STATUS_LABEL = { pending: "Pending", approved: "Approved", declined: "Declined" };
const STATUS_COLOR = { pending: "var(--c3)", approved: "var(--c2)", declined: "#b94040" };

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
  }, [dark]);
  return [dark, setDark];
}

function useLoans(memberId) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    supabase.from("loan_requests").select("*").eq("member_id", memberId).order("created_at", { ascending: false })
      .then(({ data }) => { setLoans(data ?? []); setLoading(false); });
  }, [memberId]);
  return { loans, loading };
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
    <button onClick={onToggle} aria-label="Toggle dark mode" style={{ position:"fixed", top:"1.5rem", right:"1.5rem", zIndex:100, width:"2.75rem", height:"1.5rem", borderRadius:"999px", border:"1px solid var(--border)", background:"rgba(128,128,128,0.15)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", cursor:"pointer", padding:0, display:"flex", alignItems:"center", transition:"border-color 0.2s" }}>
      <span style={{ display:"block", width:"1rem", height:"1rem", borderRadius:"50%", background:"var(--fg)", transform: dark ? "translateX(1.5rem)" : "translateX(0.2rem)", transition:"transform 0.25s cubic-bezier(0.4,0,0.2,1)" }} />
    </button>
  );
}

function Spinner() {
  return <div style={{ display:"flex", justifyContent:"center", padding:"3rem 0" }}><span className="spinner" /></div>;
}

function Field({ label, hint, error, children }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}{hint && <span className="field-hint">{hint}</span>}</label>}
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function Input(props) { return <input className="input" {...props} />; }
function Textarea(props) { return <textarea className="input textarea" {...props} />; }

function Btn({ children, loading, variant = "primary", ...props }) {
  return (
    <button className={`btn btn-${variant}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="btn-spinner" /> : children}
    </button>
  );
}

function LoanBadge({ status }) {
  return (
    <span style={{ fontSize:"0.67rem", fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", color: STATUS_COLOR[status] ?? "var(--muted)", background:`color-mix(in srgb, ${STATUS_COLOR[status] ?? "var(--muted)"} 13%, transparent)`, padding:"0.2rem 0.6rem", borderRadius:"4px" }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ActiveBadge({ active }) {
  return (
    <span className={`active-badge ${active ? "active-on" : "active-off"}`}>
      <span className="active-dot" />{active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Contribution Module ──────────────────────────────────────────────────────
function ContributionModule({ member }) {
  const { contributions, loading, refetch } = useContributions(member.id);
  const [step, setStep] = useState("idle"); // idle | waiting | done
  const [paying, setPaying] = useState(false);
  const [notSafaricom, setNotSafaricom] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const currentKey = fmt.monthKey();

  const paidThisMonth = useMemo(() =>
    contributions.some((c) => c.month_key === currentKey && c.status === "confirmed"),
    [contributions, currentKey]
  );

  const totalPaid = useMemo(() =>
    contributions.filter((c) => c.status === "confirmed").reduce((s, c) => s + Number(c.amount), 0),
    [contributions]
  );

  // Poll Supabase every 4s while waiting for STK callback to confirm payment
  useEffect(() => {
    if (step !== "waiting") return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("contributions")
        .select("status")
        .eq("member_id", member.id)
        .eq("month_key", currentKey)
        .single();
      if (data?.status === "confirmed") {
        clearInterval(interval);
        refetch();
        setStep("done");
      }
      setPollCount((n) => n + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [step, member.id, currentKey, refetch]);

  const handlePay = useCallback(async () => {
    if (!isSafaricom(member.phone)) { setNotSafaricom(true); return; }
    setNotSafaricom(false);
    setPaying(true);

    // Upsert a pending contribution record
    const { data: contrib } = await supabase
      .from("contributions")
      .upsert({ member_id: member.id, amount: CONFIG.group.monthlyFee, month_key: currentKey, status: "pending" }, { onConflict: "member_id,month_key" })
      .select("id")
      .single();

    try {
      await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          phone: fmt.phone(member.phone),
          amount: CONFIG.group.monthlyFee,
          paybill: CONFIG.mpesa.paybill,
          account: CONFIG.mpesa.account,
          contributionId: contrib?.id,
        },
      });
      setStep("waiting");
    } catch (err) {
      console.error("STK:", err);
      setStep("waiting"); // Still show waiting — callback may still fire
    }
    setPaying(false);
  }, [member, currentKey]);

  if (loading) return <Spinner />;

  return (
    <div className="contribution-wrap">
      <div className={`status-hero ${paidThisMonth ? "hero-active" : "hero-inactive"}`}>
        <div>
          <p className="hero-month">{fmt.monthLabel()}</p>
          <h2 className="hero-label">{paidThisMonth ? "You're covered." : "Contribution due."}</h2>
          <p className="hero-sub">
            {paidThisMonth
              ? `${fmt.currency(totalPaid)} total contributed.`
              : `${fmt.currency(CONFIG.group.monthlyFee)} keeps your account active.`}
          </p>
        </div>
        <ActiveBadge active={paidThisMonth} />
      </div>

      {!paidThisMonth && step === "idle" && (
        <div className="pay-block">
          {notSafaricom && (
            <div className="soft-notice soft-warn">
              <p className="soft-title">Safaricom only.</p>
              <p className="soft-sub">STK Push requires a Safaricom line. Use M-Pesa manually — Paybill <strong>{CONFIG.mpesa.paybill}</strong>, Account <strong>{CONFIG.mpesa.account}</strong>.</p>
            </div>
          )}
          <Btn loading={paying} onClick={handlePay}>
            Pay {fmt.currency(CONFIG.group.monthlyFee)} · M-Pesa
          </Btn>
          <p className="pay-hint">Prompt sent to <strong>{member.phone}</strong>. Enter your PIN to confirm.</p>
        </div>
      )}

      {step === "waiting" && !paidThisMonth && (
        <div className="pay-block">
          <div className="waiting-row">
            <span className="waiting-dot" />
            <div>
              <p className="waiting-title">Waiting for confirmation.</p>
              <p className="waiting-sub">Enter your M-Pesa PIN on {member.phone}. This updates automatically.</p>
            </div>
          </div>
          {pollCount > 5 && (
            <button className="link-sm" style={{ textAlign:"center" }} onClick={() => { refetch(); setStep("idle"); }}>
              Didn't receive a prompt? Try again
            </button>
          )}
        </div>
      )}

      {(step === "done" || (step === "waiting" && paidThisMonth)) && (
        <div className="soft-notice soft-success">
          <p className="soft-title">Payment confirmed.</p>
          <p className="soft-sub">Your account is active for {fmt.monthLabel()}.</p>
        </div>
      )}

      {contributions.length > 0 && (
        <div style={{ marginTop:"1.25rem" }}>
          <p className="module-label">History</p>
          <div className="loan-list">
            {contributions.slice(0, 8).map((c) => (
              <div key={c.id} className="loan-row">
                <div className="loan-info">
                  <span className="loan-desc">{new Date(c.month_key+"-01").toLocaleDateString("en-KE",{month:"long",year:"numeric"})}</span>
                  <span className="loan-meta">{fmt.date(c.created_at)}</span>
                </div>
                <div className="loan-right">
                  <span className="loan-amount">{fmt.currency(c.amount)}</span>
                  <LoanBadge status={c.status === "confirmed" ? "approved" : "pending"} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loan Request Module ──────────────────────────────────────────────────────
function LoanRequestModule({ member, isActive }) {
  const [form, setForm] = useState({ full_name: "", reg_number: "", phone: member.phone ?? "", amount: "", description: "" });
  const [status, setStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => {
    const val = k === "reg_number" ? e.target.value.toUpperCase() : e.target.value;
    setForm((f) => ({ ...f, [k]: val }));
    if (status === "denied") setStatus(null);
  };

  const charsLeft = 100 - form.description.length;

  // Gate: inactive members see a clean block
  if (!isActive) {
    return (
      <div className="module">
        <p className="module-label">Loan Request</p>
        <div className="inactive-gate">
          <p className="gate-title">Account inactive.</p>
          <p className="gate-sub">Contribute {fmt.currency(CONFIG.group.monthlyFee)} for {fmt.monthLabel()} to unlock loan requests.</p>
        </div>
      </div>
    );
  }

  if (status === "submitted") {
    return (
      <div className="module">
        <p className="module-label">Loan Request</p>
        <div className="soft-notice soft-success">
          <p className="soft-title">Request received.</p>
          <p className="soft-sub">The treasurer will review and reach out.</p>
        </div>
        <button className="link-sm" style={{ marginTop:"0.75rem" }} onClick={() => { setStatus(null); setForm({ full_name:"", reg_number:"", phone:member.phone??"", amount:"", description:"" }); }}>Submit another</button>
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
        body: {
          to: CONFIG.treasurer.email,
          subject: `New loan request — ${form.full_name}`,
          member: { name: form.full_name, phone: form.phone, reg: form.reg_number },
          loan: { amount: form.amount, description: form.description },
        },
      });
      setStatus("submitted");
    } else { setStatus(null); }
  };

  return (
    <div className="module">
      <p className="module-label">Loan Request</p>
      {status === "denied" && (
        <div className="soft-notice soft-warn" style={{ marginBottom:"1rem" }}>
          <p className="soft-title">Not eligible.</p>
          <p className="soft-sub">This welfare group supports Computer Science students. Your registration number doesn't match.</p>
        </div>
      )}
      <div className="module-form">
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
          <Input type="number" placeholder="e.g. 2000" value={form.amount} onChange={set("amount")} />
        </Field>
        <Field label="Description" hint={`  ·  ${charsLeft} left`} error={errors.description}>
          <Textarea placeholder="What do you need the loan for?" value={form.description} maxLength={100} rows={3} onChange={set("description")} />
        </Field>
        <Btn loading={status === "loading"} onClick={handleSubmit}>Submit request</Btn>
      </div>
    </div>
  );
}

// ─── Community Modules ────────────────────────────────────────────────────────
function CommunityModule() {
  return (
    <div className="module">
      <p className="module-label">About</p>
      <div className="community-block">
        <h2 className="community-title">{CONFIG.group.description}</h2>
        <div className="benefit-list">
          {["Emergency financial support when it matters most.","A community that moves as one.","Student welfare, handled with dignity."].map((b) => (
            <div key={b} className="benefit-item"><span className="benefit-dot" /><span>{b}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExecutivesModule() {
  return (
    <div className="module">
      <p className="module-label">Executive Team</p>
      <div className="exec-grid">
        {CONFIG.executives.map((ex) => (
          <div key={ex.name} className="exec-card">
            <div className="exec-photo-wrap">
              <img src={ex.photo} alt={ex.name} className="exec-photo" onError={(e) => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
              <div className="exec-photo-fallback" style={{ display:"none" }}>{ex.name.split(" ").map((n)=>n[0]).join("").slice(0,2)}</div>
            </div>
            <div className="exec-info">
              <span className="exec-name">{ex.name}</span>
              <span className="exec-role">{ex.title}</span>
              <span className="exec-bio">{ex.bio}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppModule() {
  return (
    <div className="module">
      <div className="wa-block">
        <h3 className="wa-title">Join the conversation.</h3>
        <p className="wa-sub">Updates, support, and community — all in one place.</p>
        <a href={CONFIG.group.whatsapp} target="_blank" rel="noreferrer" className="btn-wa">Join WhatsApp Group</a>
      </div>
    </div>
  );
}

function DeveloperModule() {
  return (
    <div className="module">
      <div className="dev-block">
        <div>
          <p className="dev-name">{CONFIG.developer.name}</p>
          <p className="dev-desc">{CONFIG.developer.description}</p>
        </div>
        <a href={CONFIG.developer.portfolio} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Portfolio →</a>
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
    onLogin(data);
    navigate("/dashboard");
  }, [phone, onLogin]);

  return (
    <div className="page page-center">
      <div className="hero">
        <div className="hero-badge">Student Welfare</div>
        <h1 className="display">{CONFIG.group.name}</h1>
        <p className="tagline">{CONFIG.group.tagline}</p>
        <div className="auth-card">
          <Field label="Phone number" error={error}>
            <Input type="tel" placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </Field>
          <Btn loading={loading} onClick={handleSubmit}>Sign in</Btn>
          <p className="auth-footer">New member? <button className="link" onClick={() => navigate("/register")}>Join for {fmt.currency(CONFIG.group.membershipFee)}.</button></p>
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
    <div className="page page-center"><div className="hero">
      <h1 className="display" style={{ fontSize:"clamp(2rem,6vw,4rem)" }}>Welcome.</h1>
      <p className="tagline">You're part of something real now.</p>
      <Btn onClick={() => navigate("/")}>Sign in</Btn>
    </div></div>
  );

  if (step === "paying") return (
    <div className="page page-center"><div className="hero">
      <h2 className="display" style={{ fontSize:"clamp(1.8rem,5vw,3rem)" }}>Check your phone.</h2>
      <p className="tagline" style={{ marginBottom:"2rem" }}>Pay {fmt.currency(CONFIG.group.membershipFee)} sent to <strong style={{ color:"var(--fg)" }}>{form.phone}</strong>.</p>
      <Btn loading={loading} onClick={confirmPayment}>I've paid</Btn>
      <button className="link" style={{ display:"block", margin:"1.25rem auto 0", fontSize:"0.82rem" }} onClick={() => setStep("form")}>Go back</button>
    </div></div>
  );

  return (
    <div className="page page-center"><div className="hero">
      <h1 className="display" style={{ fontSize:"clamp(2rem,6vw,3.5rem)" }}>Join the group.</h1>
      <p className="tagline">{fmt.currency(CONFIG.group.membershipFee)} once. That's it.</p>
      <div className="auth-card">
        {errors.server && <p className="field-error">{errors.server}</p>}
        <Field label="Full name" error={errors.full_name}>
          <Input placeholder="Jane Muthoni" value={form.full_name} onChange={set("full_name")} />
        </Field>
        <Field label="Phone number" error={errors.phone}>
          <Input type="tel" placeholder="07XX XXX XXX" value={form.phone} onChange={set("phone")} />
        </Field>
        <Btn loading={loading} onClick={handleRegister}>Pay {fmt.currency(CONFIG.group.membershipFee)} &amp; join</Btn>
        <p className="auth-footer">Already a member? <button className="link" onClick={() => navigate("/")}>Sign in.</button></p>
      </div>
    </div></div>
  );
}

function DashboardPage({ member, onLogout }) {
  const { loans, loading: loansLoading } = useLoans(member.id);
  const { contributions } = useContributions(member.id);
  const [tab, setTab] = useState("contribute");

  const isActive = useMemo(() =>
    contributions.some((c) => c.month_key === fmt.monthKey() && c.status === "confirmed"),
    [contributions]
  );

  const stats = useMemo(() => ({
    total: loans.length,
    approved: loans.filter((l) => l.status === "approved").length,
    totalBorrowed: loans.filter((l) => l.status === "approved").reduce((s, l) => s + Number(l.amount), 0),
  }), [loans]);

  return (
    <div className="page">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2 className="dash-name">{member.full_name}</h2>
        </div>
        <button className="link" onClick={onLogout}>Sign out</button>
      </header>

      <div className="stats-row">
        {[
          { label: "Requests", value: stats.total },
          { label: "Approved", value: stats.approved },
          { label: "Borrowed", value: fmt.currency(stats.totalBorrowed) },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="tab-row">
        {[["contribute","Contribute"],["loans","Loans"],["loan","Request"],["community","Community"],["team","Team"]].map(([key,label]) => (
          <button key={key} className={`tab ${tab===key?"tab-active":""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "contribute" && <ContributionModule member={member} />}
      {tab === "loans" && (
        <div className="dash-section">
          {loansLoading ? <Spinner /> : loans.length === 0 ? (
            <div className="empty-state">
              <p>No requests yet.</p>
              <button className="link-sm" onClick={() => setTab("loan")}>Make your first request →</button>
            </div>
          ) : (
            <div className="loan-list">
              {loans.map((loan) => (
                <div key={loan.id} className="loan-row">
                  <div className="loan-info">
                    <span className="loan-desc">{loan.description}</span>
                    <span className="loan-meta">{fmt.date(loan.created_at)}</span>
                  </div>
                  <div className="loan-right">
                    {loan.amount > 0 && <span className="loan-amount">{fmt.currency(loan.amount)}</span>}
                    <LoanBadge status={loan.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "loan" && <LoanRequestModule member={member} isActive={isActive} />}
      {tab === "community" && <><CommunityModule /><WhatsAppModule /><DeveloperModule /></>}
      {tab === "team" && <ExecutivesModule />}
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
    <div className="page">
      <header className="dash-header">
        <div><p className="eyebrow">Treasurer view</p><h2 className="dash-name">Loan requests</h2></div>
        <button className="link" onClick={() => navigate("/")}>Sign out</button>
      </header>
      {loading ? <Spinner /> : (
        <div className="dash-section">
          {grouped.pending.length > 0 && (
            <>
              <h3 className="section-title" style={{ marginBottom:"1rem" }}>Pending</h3>
              <div className="loan-list" style={{ marginBottom:"2.5rem" }}>
                {grouped.pending.map((loan) => (
                  <div key={loan.id} className="loan-row loan-row-admin">
                    <div className="loan-info">
                      <span className="loan-desc">{loan.description}</span>
                      <span className="loan-meta">{loan.members?.full_name} · {loan.members?.phone} · {fmt.date(loan.created_at)}</span>
                    </div>
                    <div className="loan-right" style={{ gap:"0.5rem" }}>
                      {loan.amount > 0 && <span className="loan-amount">{fmt.currency(loan.amount)}</span>}
                      <Btn variant="ghost" style={{ fontSize:"0.73rem", padding:"0.3rem 0.7rem", color:"var(--c2)" }} loading={updating===loan.id} onClick={() => updateStatus(loan.id,"approved")}>Approve</Btn>
                      <Btn variant="ghost" style={{ fontSize:"0.73rem", padding:"0.3rem 0.7rem", color:"#b94040" }} loading={updating===loan.id} onClick={() => updateStatus(loan.id,"declined")}>Decline</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {grouped.other.length > 0 && (
            <>
              <h3 className="section-title" style={{ marginBottom:"1rem" }}>History</h3>
              <div className="loan-list">
                {grouped.other.map((loan) => (
                  <div key={loan.id} className="loan-row">
                    <div className="loan-info">
                      <span className="loan-desc">{loan.description}</span>
                      <span className="loan-meta">{loan.members?.full_name} · {loan.members?.phone} · {fmt.date(loan.created_at)}</span>
                    </div>
                    <div className="loan-right">
                      {loan.amount > 0 && <span className="loan-amount">{fmt.currency(loan.amount)}</span>}
                      <LoanBadge status={loan.status} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {loans.length === 0 && <p className="empty-state">No loan requests yet.</p>}
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
      <main className="app">{page}</main>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --c1:#0F2A1D; --c2:#375534; --c3:#6B9071; --c4:#AEC3B0; --c5:#E3EED4;
    --bg:#f7faf4; --surface:#eef3e8; --border:rgba(55,85,52,0.10);
    --fg:#0F2A1D; --muted:#6B9071; --input-bg:#ffffff;
    --font-head:'Playfair Display',Georgia,serif;
    --font-body:'DM Sans',system-ui,sans-serif;
    --radius:14px; --transition:0.2s ease;
  }
  [data-theme="dark"] {
    --bg:#080f0a; --surface:#0f1f12; --border:rgba(174,195,176,0.09);
    --fg:#E3EED4; --muted:#6B9071; --input-bg:#0f1f12;
  }

  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{font-size:16px;-webkit-font-smoothing:antialiased;}
  body{font-family:var(--font-body);background:var(--bg);color:var(--fg);transition:background var(--transition),color var(--transition);min-height:100vh;}
  .app{min-height:100vh;}
  .page{max-width:680px;margin:0 auto;padding:3rem 1.5rem 7rem;}
  .page-center{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem 1.5rem;}

  .hero{text-align:center;width:100%;max-width:440px;}
  .hero-badge{display:inline-block;font-size:0.67rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--c3);background:color-mix(in srgb,var(--c3) 12%,transparent);border-radius:999px;padding:0.3rem 0.9rem;margin-bottom:1.5rem;}
  .display{font-family:var(--font-head);font-size:clamp(2.2rem,7vw,4.5rem);font-weight:600;line-height:1.05;letter-spacing:-0.025em;color:var(--fg);margin-bottom:0.75rem;}
  .tagline{font-size:1rem;font-weight:300;color:var(--muted);margin-bottom:3rem;letter-spacing:0.01em;}
  .eyebrow{font-size:0.67rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:0.2rem;}

  .auth-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:2rem;display:flex;flex-direction:column;gap:1rem;text-align:left;}
  .auth-footer{font-size:0.8rem;color:var(--muted);text-align:center;}

  .field{display:flex;flex-direction:column;gap:0.4rem;}
  .field-label{font-size:0.72rem;font-weight:500;letter-spacing:0.03em;color:var(--muted);display:flex;align-items:center;gap:0.25rem;}
  .field-hint{font-weight:400;color:var(--c4);}
  .field-error{font-size:0.69rem;color:#b94040;}

  .input{width:100%;padding:0.75rem 1rem;font-family:var(--font-body);font-size:0.9rem;color:var(--fg);background:var(--input-bg);border:1px solid var(--border);border-radius:10px;outline:none;transition:border-color var(--transition),box-shadow var(--transition);resize:none;}
  .input:focus{border-color:var(--c3);box-shadow:0 0 0 3px color-mix(in srgb,var(--c3) 13%,transparent);}
  .input::placeholder{color:var(--c4);}
  .textarea{min-height:80px;line-height:1.5;}

  .btn{display:inline-flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.75rem 1.5rem;font-family:var(--font-body);font-size:0.875rem;font-weight:500;border-radius:10px;border:1px solid transparent;cursor:pointer;transition:opacity var(--transition),transform 0.1s;letter-spacing:0.01em;white-space:nowrap;text-decoration:none;}
  .btn:active{transform:scale(0.98);}
  .btn:disabled{opacity:0.4;cursor:not-allowed;}
  .btn-primary{background:var(--c1);color:var(--c5);width:100%;}
  .btn-primary:hover:not(:disabled){opacity:0.85;}
  .btn-ghost{background:transparent;border-color:var(--border);color:var(--fg);}
  .btn-ghost:hover:not(:disabled){background:var(--surface);}
  .btn-sm{padding:0.45rem 1rem;font-size:0.78rem;}
  .btn-spinner{width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;}
  .btn-wa{display:inline-flex;align-items:center;justify-content:center;padding:0.75rem 1.75rem;background:var(--c5);color:var(--c1);font-family:var(--font-body);font-size:0.875rem;font-weight:600;border-radius:10px;text-decoration:none;border:none;cursor:pointer;transition:opacity 0.2s;}
  .btn-wa:hover{opacity:0.9;}

  .link{background:none;border:none;cursor:pointer;font-family:var(--font-body);font-size:inherit;color:var(--fg);text-decoration:underline;text-underline-offset:2px;padding:0;}
  .link-sm{background:none;border:none;cursor:pointer;font-family:var(--font-body);font-size:0.79rem;color:var(--c3);padding:0;}

  .dash-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;padding-top:1rem;}
  .dash-name{font-family:var(--font-head);font-size:clamp(1.5rem,5vw,2.2rem);font-weight:600;letter-spacing:-0.02em;}

  .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1.75rem;}
  .stat-card{background:var(--surface);padding:1.1rem 1rem;}
  .stat-value{display:block;font-size:1rem;font-weight:600;margin-bottom:0.15rem;color:var(--c1);}
  [data-theme="dark"] .stat-value{color:var(--c5);}
  .stat-label{display:block;font-size:0.62rem;font-weight:500;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase;}

  .tab-row{display:flex;gap:0.2rem;margin-bottom:2rem;background:var(--surface);border-radius:10px;padding:0.2rem;border:1px solid var(--border);overflow-x:auto;scrollbar-width:none;}
  .tab-row::-webkit-scrollbar{display:none;}
  .tab{flex:1;min-width:fit-content;padding:0.48rem 0.6rem;font-family:var(--font-body);font-size:0.77rem;font-weight:500;color:var(--muted);background:transparent;border:none;border-radius:8px;cursor:pointer;transition:background var(--transition),color var(--transition);white-space:nowrap;}
  .tab-active{background:var(--bg);color:var(--c1);font-weight:600;box-shadow:0 1px 3px rgba(15,42,29,0.08);}
  [data-theme="dark"] .tab-active{color:var(--c5);background:var(--c1);}

  .dash-section{margin-bottom:2rem;}
  .section-title{font-family:var(--font-head);font-size:1.05rem;font-weight:600;letter-spacing:-0.01em;}

  .loan-list{display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
  .loan-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;background:var(--surface);padding:1rem 1.25rem;}
  .loan-row-admin{flex-wrap:wrap;}
  .loan-info{display:flex;flex-direction:column;gap:0.2rem;flex:1 1 0;min-width:0;}
  .loan-desc{font-size:0.84rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .loan-meta{font-size:0.67rem;color:var(--muted);}
  .loan-right{display:flex;align-items:center;gap:0.7rem;flex-shrink:0;}
  .loan-amount{font-size:0.84rem;font-weight:600;}

  .empty-state{color:var(--muted);font-size:0.875rem;padding:2.5rem 0;text-align:center;display:flex;flex-direction:column;align-items:center;gap:0.5rem;}

  .active-badge{display:inline-flex;align-items:center;gap:0.35rem;font-size:0.7rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;padding:0.28rem 0.7rem;border-radius:999px;flex-shrink:0;}
  .active-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
  .active-on{color:var(--c5);background:rgba(255,255,255,0.18);}
  .active-on .active-dot{background:var(--c5);box-shadow:0 0 0 2px rgba(227,238,212,0.3);}
  .active-off{color:var(--muted);background:color-mix(in srgb,var(--muted) 10%,transparent);}
  .active-off .active-dot{background:var(--muted);}

  .contribution-wrap{display:flex;flex-direction:column;gap:1rem;}
  .status-hero{border-radius:var(--radius);padding:1.75rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;}
  .hero-active{background:linear-gradient(135deg,var(--c1) 0%,var(--c2) 100%);}
  .hero-inactive{background:var(--surface);border:1px solid var(--border);}
  .hero-month{font-size:0.67rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.4rem;}
  .hero-active .hero-month{color:var(--c4);}
  .hero-inactive .hero-month{color:var(--muted);}
  .hero-label{font-family:var(--font-head);font-size:clamp(1.2rem,4vw,1.6rem);font-weight:600;line-height:1.1;margin-bottom:0.4rem;}
  .hero-active .hero-label{color:var(--c5);}
  .hero-inactive .hero-label{color:var(--fg);}
  .hero-sub{font-size:0.78rem;font-weight:300;}
  .hero-active .hero-sub{color:var(--c4);}
  .hero-inactive .hero-sub{color:var(--muted);}

  .pay-block{display:flex;flex-direction:column;gap:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;}
  .pay-hint{font-size:0.73rem;color:var(--muted);text-align:center;line-height:1.4;}

  .waiting-row{display:flex;align-items:center;gap:0.875rem;padding-bottom:1rem;border-bottom:1px solid var(--border);margin-bottom:0.5rem;}
  .waiting-dot{width:9px;height:9px;border-radius:50%;background:var(--c3);flex-shrink:0;animation:pulse 1.6s ease-in-out infinite;}
  .waiting-title{font-size:0.87rem;font-weight:600;color:var(--fg);margin-bottom:0.15rem;}
  .waiting-sub{font-size:0.73rem;color:var(--muted);line-height:1.4;}

  .soft-notice{border-radius:10px;padding:1.1rem 1.25rem;}
  .soft-success{background:color-mix(in srgb,var(--c2) 8%,transparent);border:1px solid color-mix(in srgb,var(--c2) 18%,transparent);}
  .soft-warn{background:color-mix(in srgb,#b94040 5%,transparent);border:1px solid color-mix(in srgb,#b94040 14%,transparent);}
  .soft-title{font-size:0.87rem;font-weight:600;margin-bottom:0.2rem;}
  .soft-success .soft-title{color:var(--c2);}
  .soft-warn .soft-title{color:#b94040;}
  .soft-sub{font-size:0.76rem;color:var(--muted);line-height:1.5;}

  .module{margin-bottom:1.5rem;}
  .module-label{font-size:0.67rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem;}
  .module-form{display:flex;flex-direction:column;gap:1rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.5rem;}

  .inactive-gate{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;text-align:center;}
  .gate-title{font-family:var(--font-head);font-size:1.1rem;font-weight:600;color:var(--fg);margin-bottom:0.4rem;}
  .gate-sub{font-size:0.8rem;color:var(--muted);line-height:1.5;}

  .community-block{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;}
  .community-title{font-family:var(--font-head);font-size:clamp(1.05rem,3vw,1.3rem);font-weight:400;font-style:italic;line-height:1.45;color:var(--c1);margin-bottom:1.5rem;}
  [data-theme="dark"] .community-title{color:var(--c5);}
  .benefit-list{display:flex;flex-direction:column;gap:0.75rem;}
  .benefit-item{display:flex;align-items:flex-start;gap:0.75rem;font-size:0.82rem;color:var(--muted);line-height:1.5;}
  .benefit-dot{width:5px;height:5px;border-radius:50%;background:var(--c3);flex-shrink:0;margin-top:0.45rem;}

  .wa-block{background:linear-gradient(135deg,var(--c1) 0%,var(--c2) 100%);border-radius:var(--radius);padding:2rem;}
  .wa-title{font-family:var(--font-head);font-size:1.2rem;font-weight:600;color:var(--c5);margin-bottom:0.5rem;}
  .wa-sub{font-size:0.79rem;color:var(--c4);margin-bottom:1.5rem;line-height:1.5;}

  .dev-block{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.25rem 1.5rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);}
  .dev-name{font-size:0.84rem;font-weight:600;color:var(--fg);margin-bottom:0.15rem;}
  .dev-desc{font-size:0.72rem;color:var(--muted);}

  .exec-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;}
  .exec-card{background:var(--surface);padding:1.5rem 1.25rem;display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.75rem;}
  .exec-photo-wrap{position:relative;width:64px;height:64px;}
  .exec-photo{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--border);}
  .exec-photo-fallback{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--c2),var(--c3));color:var(--c5);font-size:1.1rem;font-weight:600;align-items:center;justify-content:center;}
  .exec-info{display:flex;flex-direction:column;gap:0.15rem;}
  .exec-name{font-size:0.82rem;font-weight:600;color:var(--fg);}
  .exec-role{font-size:0.65rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--c3);}
  .exec-bio{font-size:0.69rem;color:var(--muted);line-height:1.4;margin-top:0.2rem;}

  .spinner{display:inline-block;width:22px;height:22px;border:2px solid var(--border);border-top-color:var(--c2);border-radius:50%;animation:spin 0.7s linear infinite;}

  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.45;transform:scale(0.8);}}

  @media(max-width:480px){
    .loan-right{flex-direction:column;align-items:flex-end;gap:0.35rem;}
    .exec-grid{grid-template-columns:1fr 1fr;}
  }
`;
