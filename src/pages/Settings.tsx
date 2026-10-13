import { useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  CreditCard,
  FileText,
  Globe,
  Lock,
  LogOut,
  Plus,
  Shield,
  Smartphone,
  Trash2,
  User,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { cn } from "../lib/utils";
import { bothText } from "../lib/labels";
import { useLanguage, type LangMode } from "../lib/language";
import { readNotificationPrefs, readSaved, writeNotificationPrefs, type NotificationPrefs } from "../lib/localLists";
import { useAuth } from "../App";
import { useToast } from "../context/ToastContext";
import { auth } from "../firebase";

const FORM_KEY = "cfb.accountForm";
const SWITCH_KEY = "cfb.accountSwitches";
const CARDS_KEY = "cfb.paymentCards";

type AccountForm = {
  fullName: string;
  email: string;
  headline: string;
  bio: string;
  location: string;
  role: string;
  stage: string;
  industry: string;
  commitment: string;
  company: string;
  website: string;
  linkedin: string;
  github: string;
  phone: string;
  timezone: string;
  currency: string;
  photo: string;
};

type Switches = {
  publicProfile: boolean;
  mentorAvailability: boolean;
  openToCofounder: boolean;
  openToInvestors: boolean;
  openToAdvisors: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showStartup: boolean;
  discoverable: boolean;
  twoFactor: boolean;
  pushMatches: boolean;
  pushMessages: boolean;
  pushEvents: boolean;
  pushMentors: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  quietHours: boolean;
  messagesFrom: "anyone" | "connections" | "none";
  digest: "instant" | "daily" | "weekly" | "off";
  quietStart: string;
  quietEnd: string;
};

type PayCard = { id: string; brand: string; last4: string; expiry: string };

const emptyForm = (): AccountForm => ({
  fullName: "",
  email: "",
  headline: "",
  bio: "",
  location: "",
  role: "",
  stage: "",
  industry: "",
  commitment: "",
  company: "",
  website: "",
  linkedin: "",
  github: "",
  phone: "",
  timezone: "Europe/Athens",
  currency: "EUR",
  photo: "",
});

const defaultSwitches = (): Switches => ({
  publicProfile: true,
  mentorAvailability: false,
  openToCofounder: true,
  openToInvestors: false,
  openToAdvisors: true,
  showEmail: false,
  showLocation: true,
  showStartup: true,
  discoverable: true,
  twoFactor: false,
  pushMatches: true,
  pushMessages: true,
  pushEvents: true,
  pushMentors: false,
  productUpdates: true,
  weeklyDigest: true,
  quietHours: false,
  messagesFrom: "connections",
  digest: "daily",
  quietStart: "22:00",
  quietEnd: "08:00",
});

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    if (parsed && typeof parsed === "object") return { ...(fallback as object), ...(parsed as object) } as T;
    return fallback;
  } catch {
    return fallback;
  }
}

const inputClass =
  "w-full min-h-11 bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-400";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-stone-400">{hint}</span> : null}
    </label>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-stone-900" : "bg-stone-200")}
    >
      <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm", on ? "right-1" : "left-1")} />
    </button>
  );
}

function SwitchRow({ title, desc, on, onClick }: { title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-100 bg-stone-50 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="mt-1 text-sm text-stone-500">{desc}</p>
      </div>
      <Toggle on={on} label={title} onClick={onClick} />
    </div>
  );
}

export default function Settings() {
  const { user, profile, isDemoMode, toggleDemoMode } = useAuth();
  const { mode, setMode } = useLanguage();
  const { success, info } = useToast();
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);
  const t = (en: string, el: string) => bothText(en, el);

  const seedForm = (): AccountForm => ({
    ...emptyForm(),
    fullName: profile?.fullName || user?.displayName || "",
    email: profile?.email || user?.email || "",
    headline: profile?.headline || "",
    bio: profile?.bio || "",
    location: profile?.location || "",
    role: profile?.role || "",
    stage: profile?.stage || "",
    industry: profile?.industry || "",
    commitment: profile?.commitment || "",
    website: profile?.socialLinks?.website || profile?.linkedinUrl || "",
    linkedin: profile?.socialLinks?.linkedin || profile?.linkedinUrl || "",
    github: profile?.socialLinks?.github || profile?.githubUrl || "",
    photo: (profile as { avatarUrl?: string } | null)?.avatarUrl || profile?.profile?.profilePhoto || user?.photoURL || "",
  });

  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "privacy" | "billing">("account");
  const [form, setForm] = useState<AccountForm>(() => readStored(FORM_KEY, seedForm()));
  const [switches, setSwitches] = useState<Switches>(() => readStored(SWITCH_KEY, defaultSwitches()));
  const [notifications, setNotifications] = useState<NotificationPrefs>(readNotificationPrefs);
  const [cards, setCards] = useState<PayCard[]>(() => {
    const stored = readStored<PayCard[]>(CARDS_KEY, []);
    return Array.isArray(stored) && stored.length
      ? stored
      : [{ id: "visa-4242", brand: "Visa", last4: "4242", expiry: "12/28" }];
  });
  const [addingCard, setAddingCard] = useState(false);
  const [cardDraft, setCardDraft] = useState({ brand: "Visa", last4: "", expiry: "" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState({ next: "", confirm: "" });
  const [passwordWhen, setPasswordWhen] = useState(t("3 months ago", "πριν από 3 μήνες"));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const setField = (key: keyof AccountForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveForm = () => {
    localStorage.setItem(FORM_KEY, JSON.stringify(form));
    success(t("Account saved", "Ο λογαριασμός αποθηκεύτηκε"), t("These details stay in this browser.", "Τα στοιχεία μένουν σε αυτόν τον browser."));
  };

  const patchSwitches = (patch: Partial<Switches>) => {
    setSwitches((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(SWITCH_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleNotification = (key: keyof NotificationPrefs) => {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeNotificationPrefs(next);
      return next;
    });
  };

  const saveCards = (next: PayCard[]) => {
    setCards(next);
    localStorage.setItem(CARDS_KEY, JSON.stringify(next));
  };

  const downloadMyData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: user ? { uid: user.uid, email: user.email, name: user.displayName } : null,
      profile: profile ?? null,
      form,
      switches,
      notifications,
      savedProfiles: readSaved(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cofounderbay-data.json";
    link.click();
    URL.revokeObjectURL(url);
    success(t("Download started", "Η λήψη ξεκίνησε"));
  };

  const leave = async () => {
    if (isDemoMode) {
      toggleDemoMode(false);
      navigate("/");
      return;
    }
    try {
      await auth.signOut();
    } catch {
      /* still return to the start */
    }
    navigate("/");
  };

  const onPhoto = (file: File) => {
    if (file.size > 1_500_000) {
      info(t("Photo is too large", "Η φωτογραφία είναι μεγάλη"), t("Use an image under 1.5 MB.", "Χρησιμοποίησε εικόνα κάτω από 1,5 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setField("photo", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const filled = [
    form.fullName, form.email, form.headline, form.bio, form.location, form.role, form.stage, form.industry, form.company, form.photo,
  ].filter(Boolean).length;
  const completion = Math.round((filled / 10) * 100);

  const tabs = [
    { id: "account" as const, label: t("Account", "Λογαριασμός"), icon: User },
    { id: "notifications" as const, label: t("Notifications", "Ειδοποιήσεις"), icon: Bell },
    { id: "privacy" as const, label: t("Privacy & Security", "Απόρρητο"), icon: Shield },
    { id: "billing" as const, label: t("Billing & Plans", "Χρέωση"), icon: CreditCard },
  ];

  const emailNotes: { id: keyof NotificationPrefs; title: string; desc: string }[] = [
    { id: "matches", title: t("New match alerts", "Νέες αντιστοιχίσεις"), desc: t("When a compatible co-founder joins.", "Όταν μπαίνει συμβατός συνιδρυτής.") },
    { id: "messages", title: t("Direct messages", "Άμεσα μηνύματα"), desc: t("An email when someone writes to you.", "Email όταν σου γράφει κάποιος.") },
    { id: "community", title: t("Community activity", "Κοινότητες"), desc: t("Posts and replies in communities you joined.", "Δημοσιεύσεις στις κοινότητες που ακολουθείς.") },
    { id: "news", title: t("Ecosystem news", "Νέα οικοσυστήματος"), desc: t("Programs, grants, and a short monthly digest.", "Προγράμματα, επιχορηγήσεις και μηνιαία σύνοψη.") },
    { id: "events", title: t("Events", "Εκδηλώσεις"), desc: t("Reminders for events you saved or host.", "Υπενθυμίσεις για εκδηλώσεις που κράτησες.") },
    { id: "mentors", title: t("Mentor requests", "Αιτήματα μεντόρων"), desc: t("When a mentor replies or a session is booked.", "Όταν απαντά μέντορας ή κλείνεται συνεδρία.") },
    { id: "fundraising", title: t("Fundraising", "Χρηματοδότηση"), desc: t("Investor watches, program deadlines, data room views.", "Παρακολουθήσεις, προθεσμίες και προβολές data room.") },
    { id: "mentions", title: t("Mentions", "Αναφορές"), desc: t("When someone mentions you in a thread.", "Όταν σε αναφέρουν σε συζήτηση.") },
  ];

  const pushNotes: { key: keyof Switches; title: string; desc: string }[] = [
    { key: "pushMatches", title: t("Matches", "Αντιστοιχίσεις"), desc: t("A ping when a strong match appears.", "Ειδοποίηση για δυνατή αντιστοίχιση.") },
    { key: "pushMessages", title: t("Messages", "Μηνύματα"), desc: t("A ping for unread conversations.", "Ειδοποίηση για αδιάβαστα.") },
    { key: "pushEvents", title: t("Events", "Εκδηλώσεις"), desc: t("A reminder an hour before you attend.", "Υπενθύμιση μία ώρα πριν.") },
    { key: "pushMentors", title: t("Mentors", "Μέντορες"), desc: t("Session changes and new requests.", "Αλλαγές συνεδρίας και νέα αιτήματα.") },
  ];

  const visibility: { key: keyof Switches; title: string; desc: string }[] = [
    { key: "publicProfile", title: t("Public profile", "Δημόσιο προφίλ"), desc: t("People can open your profile from discovery.", "Το προφίλ ανοίγει από την εξερεύνηση.") },
    { key: "discoverable", title: t("Appear in discovery", "Εμφάνιση στην εξερεύνηση"), desc: t("Your card is included in search results.", "Η κάρτα σου μπαίνει στα αποτελέσματα.") },
    { key: "showEmail", title: t("Show email", "Εμφάνιση email"), desc: t("Visible on your profile to signed-in members.", "Φαίνεται σε συνδεδεμένα μέλη.") },
    { key: "showLocation", title: t("Show location", "Εμφάνιση τοποθεσίας"), desc: t("City and country on your card.", "Πόλη και χώρα στην κάρτα.") },
    { key: "showStartup", title: t("Show startup", "Εμφάνιση startup"), desc: t("Company, stage, and industry stay visible.", "Εταιρεία, στάδιο και κλάδος μένουν ορατά.") },
    { key: "mentorAvailability", title: t("Open to mentor", "Διαθέσιμος ως μέντορας"), desc: t("A badge that you can take mentor requests.", "Σήμα ότι δέχεσαι αιτήματα.") },
    { key: "openToCofounder", title: t("Looking for a co-founder", "Ψάχνω συνιδρυτή"), desc: t("Shown on your card and in matches.", "Φαίνεται στην κάρτα και στις αντιστοιχίσεις.") },
    { key: "openToInvestors", title: t("Open to investors", "Ανοιχτός σε επενδυτές"), desc: t("Investors can request an intro.", "Οι επενδυτές μπορούν να ζητήσουν γνωριμία.") },
    { key: "openToAdvisors", title: t("Open to advisors", "Ανοιχτός σε συμβούλους"), desc: t("Advisors can offer a session.", "Οι σύμβουλοι μπορούν να προτείνουν συνεδρία.") },
  ];

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">{t("Settings", "Ρυθμίσεις")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-stone-500">
            {t(
              "Account, alerts, privacy, and billing for this workspace. Changes stay in this browser.",
              "Λογαριασμός, ειδοποιήσεις, απόρρητο και χρέωση. Οι αλλαγές μένουν σε αυτόν τον browser.",
            )}
          </p>
        </div>
        <p className="text-sm text-stone-500 truncate">
          {form.email || user?.email || t("Demo account", "Λογαριασμός δείγματος")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
              activeTab === tab.id
                ? "bg-stone-900 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "account" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title={t("Personal information", "Προσωπικά στοιχεία")} subtitle={t("What members see on your profile.", "Ό,τι βλέπουν τα μέλη στο προφίλ.")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("Full name", "Ονοματεπώνυμο")}>
                <input className={inputClass} value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
              </Field>
              <Field label={t("Email", "Email")}>
                <input className={inputClass} type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </Field>
              <Field label={t("Phone", "Τηλέφωνο")}>
                <input className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+30 …" />
              </Field>
              <Field label={t("Location", "Τοποθεσία")}>
                <input className={inputClass} value={form.location} onChange={(e) => setField("location", e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label={t("Headline", "Τίτλος")}>
                  <input className={inputClass} value={form.headline} onChange={(e) => setField("headline", e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={t("Bio", "Βιογραφικό")} hint={t("A few lines on what you are building.", "Λίγες γραμμές για αυτό που χτίζεις.")}>
                  <textarea className={cn(inputClass, "min-h-28 resize-y")} value={form.bio} onChange={(e) => setField("bio", e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title={t("Profile photo", "Φωτογραφία")} subtitle={t("Square image, under 1.5 MB.", "Τετράγωνη εικόνα, κάτω από 1,5 MB.")}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                  {form.photo ? (
                    <img src={form.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-400">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">{form.fullName || t("Your name", "Το όνομά σου")}</p>
                  <p className="mt-1 text-sm text-stone-500">{t("Profile completion", "Ολοκλήρωση προφίλ")} · {completion}%</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full bg-stone-900" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </div>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onPhoto(file); }} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => photoRef.current?.click()}>{t("Upload new", "Νέα φωτογραφία")}</Button>
                <Button type="button" variant="ghost" className="text-red-600" onClick={() => setField("photo", "")}>{t("Remove", "Αφαίρεση")}</Button>
              </div>
              <NavLink to="/profile" className="text-sm font-medium text-stone-900 underline-offset-4 hover:underline">
                {t("Open public profile", "Άνοιγμα δημόσιου προφίλ")}
              </NavLink>
            </div>
          </Card>

          <Card className="lg:col-span-2" title={t("Startup", "Startup")} subtitle={t("Used by discovery, matches, and fundraising.", "Χρησιμοποιείται στην εξερεύνηση, τις αντιστοιχίσεις και τη χρηματοδότηση.")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("Company", "Εταιρεία")}>
                <input className={inputClass} value={form.company} onChange={(e) => setField("company", e.target.value)} />
              </Field>
              <Field label={t("Role", "Ρόλος")}>
                <input className={inputClass} value={form.role} onChange={(e) => setField("role", e.target.value)} />
              </Field>
              <Field label={t("Stage", "Στάδιο")}>
                <select className={inputClass} value={form.stage} onChange={(e) => setField("stage", e.target.value)}>
                  {["", "Idea", "MVP", "Pre-seed", "Seed", "Series A"].map((item) => (
                    <option key={item || "blank"} value={item}>{item || t("Choose a stage", "Επίλεξε στάδιο")}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Industry", "Κλάδος")}>
                <input className={inputClass} value={form.industry} onChange={(e) => setField("industry", e.target.value)} />
              </Field>
              <Field label={t("Commitment", "Δέσμευση")}>
                <select className={inputClass} value={form.commitment} onChange={(e) => setField("commitment", e.target.value)}>
                  {["", "Exploring", "Part-time", "Full-time"].map((item) => (
                    <option key={item || "blank"} value={item}>{item || t("Choose commitment", "Επίλεξε δέσμευση")}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Website", "Ιστότοπος")}>
                <input className={inputClass} value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://" />
              </Field>
            </div>
          </Card>

          <Card title={t("Links", "Σύνδεσμοι")} subtitle={t("Shown on your profile when filled in.", "Φαίνονται στο προφίλ όταν συμπληρωθούν.")}>
            <div className="space-y-4">
              <Field label="LinkedIn">
                <input className={inputClass} value={form.linkedin} onChange={(e) => setField("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" />
              </Field>
              <Field label="GitHub">
                <input className={inputClass} value={form.github} onChange={(e) => setField("github", e.target.value)} placeholder="https://github.com/…" />
              </Field>
            </div>
          </Card>

          <Card className="lg:col-span-3" title={t("How you show up", "Πώς εμφανίζεσαι")} subtitle={t("Each switch saves as soon as you tap it.", "Κάθε διακόπτης αποθηκεύεται μόλις τον πατήσεις.")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibility.map((item) => (
                <SwitchRow
                  key={item.key}
                  title={item.title}
                  desc={item.desc}
                  on={Boolean(switches[item.key])}
                  onClick={() => patchSwitches({ [item.key]: !switches[item.key] })}
                />
              ))}
            </div>
          </Card>

          <Card className="lg:col-span-2" title={t("Language and region", "Γλώσσα και περιοχή")} subtitle={t("The language choice is the same control as the button at the top of the app.", "Η γλώσσα είναι ο ίδιος διακόπτης με το κουμπί στην κορυφή.")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t("Interface language", "Γλώσσα διεπαφής")}>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["both", "EN · EL"],
                    ["en", "EN"],
                    ["el", "EL"],
                  ] as [LangMode, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMode(id)}
                      className={cn(
                        "min-h-11 rounded-xl border text-sm font-semibold",
                        mode === id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-700",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t("Timezone", "Ζώνη ώρας")}>
                <select className={inputClass} value={form.timezone} onChange={(e) => setField("timezone", e.target.value)}>
                  {["Europe/Athens", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Singapore"].map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Currency", "Νόμισμα")}>
                <select className={inputClass} value={form.currency} onChange={(e) => setField("currency", e.target.value)}>
                  {["EUR", "USD", "GBP"].map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title={t("Save", "Αποθήκευση")} subtitle={t("Name, startup, links, and region.", "Όνομα, startup, σύνδεσμοι και περιοχή.")}>
            <div className="flex h-full flex-col justify-between gap-4">
              <p className="text-sm text-stone-500">
                {t("Switches above are already saved. This button stores the text fields.", "Οι διακόπτες έχουν ήδη αποθηκευτεί. Αυτό το κουμπί κρατά τα πεδία κειμένου.")}
              </p>
              <Button type="button" onClick={saveForm} className="w-full">{t("Save changes", "Αποθήκευση αλλαγών")}</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2" title={t("Email", "Email")} subtitle={t("Choose what reaches your inbox.", "Διάλεξε τι φτάνει στα εισερχόμενα.")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {emailNotes.map((item) => (
                <SwitchRow
                  key={item.id}
                  title={item.title}
                  desc={item.desc}
                  on={notifications[item.id]}
                  onClick={() => toggleNotification(item.id)}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card title={t("Browser alerts", "Ειδοποιήσεις browser")} subtitle={t("This device only.", "Μόνο αυτή η συσκευή.")}>
              <p className="text-sm text-stone-500">
                {t("Ask the browser for permission, then the push switches below apply.", "Ζήτα άδεια από τον browser και μετά ισχύουν οι διακόπτες push.")}
              </p>
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={() => {
                  if ("Notification" in window) void Notification.requestPermission();
                  info(t("Permission requested", "Ζητήθηκε άδεια"));
                }}
              >
                {t("Enable browser notifications", "Ενεργοποίηση ειδοποιήσεων")}
              </Button>
            </Card>
            <Card title={t("Digest", "Σύνοψη")} subtitle={t("How often email is grouped.", "Πόσο συχνά ομαδοποιούνται τα email.")}>
              <div className="grid grid-cols-2 gap-2">
                {(["instant", "daily", "weekly", "off"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patchSwitches({ digest: id })}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 text-sm font-semibold capitalize",
                      switches.digest === id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-700",
                    )}
                  >
                    {id === "instant" ? t("Instant", "Άμεσα") : id === "daily" ? t("Daily", "Ημερήσια") : id === "weekly" ? t("Weekly", "Εβδομαδιαία") : t("Off", "Κλειστή")}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="xl:col-span-2" title={t("Push", "Push")} subtitle={t("Real-time alerts after the browser allows them.", "Άμεσες ειδοποιήσεις αφού το επιτρέψει ο browser.")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {pushNotes.map((item) => (
                <SwitchRow
                  key={item.key}
                  title={item.title}
                  desc={item.desc}
                  on={Boolean(switches[item.key])}
                  onClick={() => patchSwitches({ [item.key]: !switches[item.key] })}
                />
              ))}
            </div>
          </Card>

          <Card title={t("Quiet hours", "Ώρες ησυχίας")} subtitle={t("Push waits until the window ends.", "Το push περιμένει μέχρι να τελειώσει το παράθυρο.")}>
            <SwitchRow
              title={t("Pause push overnight", "Παύση push τη νύχτα")}
              desc={t("Email still follows the digest setting.", "Το email ακολουθεί τη σύνοψη.")}
              on={switches.quietHours}
              onClick={() => patchSwitches({ quietHours: !switches.quietHours })}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label={t("From", "Από")}>
                <input className={inputClass} type="time" value={switches.quietStart} onChange={(e) => patchSwitches({ quietStart: e.target.value })} />
              </Field>
              <Field label={t("Until", "Έως")}>
                <input className={inputClass} type="time" value={switches.quietEnd} onChange={(e) => patchSwitches({ quietEnd: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card className="xl:col-span-3" title={t("Product news", "Νέα προϊόντος")} subtitle={t("Separate from match and message alerts.", "Ξεχωριστά από αντιστοιχίσεις και μηνύματα.")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SwitchRow
                title={t("Product updates", "Ενημερώσεις προϊόντος")}
                desc={t("Occasional notes when a tool you use changes.", "Σπάνιες σημειώσεις όταν αλλάζει εργαλείο που χρησιμοποιείς.")}
                on={switches.productUpdates}
                onClick={() => patchSwitches({ productUpdates: !switches.productUpdates })}
              />
              <SwitchRow
                title={t("Weekly founder digest", "Εβδομαδιαία σύνοψη ιδρυτή")}
                desc={t("One email with programs, events, and unread intros.", "Ένα email με προγράμματα, εκδηλώσεις και αδιάβαστες γνωριμίες.")}
                on={switches.weeklyDigest}
                onClick={() => patchSwitches({ weeklyDigest: !switches.weeklyDigest })}
              />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "privacy" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2" title={t("Security", "Ασφάλεια")} subtitle={t("Password and a second step at sign-in.", "Κωδικός και δεύτερο βήμα στην είσοδο.")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 text-stone-500" />
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{t("Password", "Κωδικός")}</p>
                    <p className="mt-1 text-sm text-stone-500">{t("Last changed", "Τελευταία αλλαγή")} · {passwordWhen}</p>
                  </div>
                </div>
                <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => setPasswordOpen((open) => !open)}>
                  {t("Update password", "Αλλαγή κωδικού")}
                </Button>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-4 w-4 text-stone-500" />
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{t("Two-factor authentication", "Έλεγχος δύο βημάτων")}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {switches.twoFactor
                        ? t("On for this browser.", "Ενεργό σε αυτόν τον browser.")
                        : t("Off. A code would be asked at the next sign-in.", "Κλειστό. Στην επόμενη είσοδο θα ζητηθεί κωδικός.")}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => patchSwitches({ twoFactor: !switches.twoFactor })}>
                  {switches.twoFactor ? t("Turn off", "Απενεργοποίηση") : t("Turn on", "Ενεργοποίηση")}
                </Button>
              </div>
            </div>
            {passwordOpen && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("New password", "Νέος κωδικός")}>
                  <input className={inputClass} type="password" value={password.next} onChange={(e) => setPassword((prev) => ({ ...prev, next: e.target.value }))} />
                </Field>
                <Field label={t("Confirm password", "Επιβεβαίωση")}>
                  <input className={inputClass} type="password" value={password.confirm} onChange={(e) => setPassword((prev) => ({ ...prev, confirm: e.target.value }))} />
                </Field>
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (password.next.length < 8 || password.next !== password.confirm) {
                        info(t("Check the password", "Έλεγξε τον κωδικό"), t("Use 8 or more characters and matching fields.", "Τουλάχιστον 8 χαρακτήρες και ίδια πεδία."));
                        return;
                      }
                      setPassword({ next: "", confirm: "" });
                      setPasswordOpen(false);
                      setPasswordWhen(t("just now", "μόλις τώρα"));
                      success(t("Password updated on this device", "Ο κωδικός ενημερώθηκε σε αυτή τη συσκευή"));
                    }}
                  >
                    {t("Save password", "Αποθήκευση κωδικού")}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title={t("Who can message you", "Ποιοι σου στέλνουν μήνυμα")} subtitle={t("Intros still appear in your requests.", "Οι γνωριμίες μένουν στα αιτήματα.")}>
            <div className="space-y-2">
              {([
                ["anyone", t("Anyone", "Οποιοσδήποτε"), t("Members can start a chat.", "Τα μέλη ξεκινούν συνομιλία.")],
                ["connections", t("Connections", "Συνδέσεις"), t("Only people you already know.", "Μόνο άτομα που ήδη γνωρίζεις.")],
                ["none", t("No one", "Κανείς"), t("New chats stay closed.", "Οι νέες συνομιλίες μένουν κλειστές.")],
              ] as const).map(([id, title, desc]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => patchSwitches({ messagesFrom: id })}
                  className={cn(
                    "flex w-full min-h-11 flex-col items-start rounded-xl border px-4 py-3 text-left",
                    switches.messagesFrom === id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-800",
                  )}
                >
                  <span className="text-sm font-semibold">{title}</span>
                  <span className={cn("mt-0.5 text-sm", switches.messagesFrom === id ? "text-white/70" : "text-stone-500")}>{desc}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="xl:col-span-3" title={t("Sessions", "Συνεδρίες")} subtitle={t("Devices that can stay signed in.", "Συσκευές που μένουν συνδεδεμένες.")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-500">
                    <th className="py-3 pr-4 font-medium">{t("Device", "Συσκευή")}</th>
                    <th className="py-3 pr-4 font-medium">{t("Where", "Πού")}</th>
                    <th className="py-3 pr-4 font-medium">{t("Last active", "Τελευταία δραστηριότητα")}</th>
                    <th className="py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {[
                    [t("This browser", "Αυτός ο browser"), t("Current session", "Τρέχουσα συνεδρία"), t("Now", "Τώρα"), true],
                    ["Safari · iPhone", "Athens", t("2 hours ago", "πριν από 2 ώρες"), false],
                    ["Chrome · Mac", "London", t("Yesterday", "Χθες"), false],
                  ].map(([device, where, when, current]) => (
                    <tr key={String(device)} className="border-b border-stone-50">
                      <td className="py-3 pr-4 font-medium text-stone-900">{device}</td>
                      <td className="py-3 pr-4 text-stone-500">{where}</td>
                      <td className="py-3 pr-4 text-stone-500">{when}</td>
                      <td className="py-3 text-right">
                        {current ? (
                          <span className="text-xs font-semibold text-emerald-700">{t("This device", "Αυτή η συσκευή")}</span>
                        ) : (
                          <button type="button" className="min-h-11 px-3 text-sm font-medium text-stone-700 hover:text-stone-900" onClick={() => info(t("Session closed", "Η συνεδρία έκλεισε"), String(device))}>
                            {t("Sign out", "Αποσύνδεση")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="xl:col-span-2" title={t("Your data", "Τα δεδομένα σου")} subtitle={t("A file of what this browser has stored for you.", "Αρχείο με ό,τι έχει κρατήσει αυτός ο browser.")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={downloadMyData} className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left hover:bg-stone-50">
                <FileText className="h-4 w-4 text-stone-500" />
                <span>
                  <span className="block text-sm font-semibold text-stone-900">{t("Download my data", "Λήψη δεδομένων")}</span>
                  <span className="mt-0.5 block text-sm text-stone-500">JSON</span>
                </span>
              </button>
              <button type="button" onClick={() => setDeleteOpen(true)} className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left hover:bg-red-50">
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>
                  <span className="block text-sm font-semibold text-red-700">{t("Delete account", "Διαγραφή λογαριασμού")}</span>
                  <span className="mt-0.5 block text-sm text-stone-500">{t("Signs you out of this browser.", "Σε αποσυνδέει από αυτόν τον browser.")}</span>
                </span>
              </button>
            </div>
            {deleteOpen && (
              <div className="mt-4 space-y-3 rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  {t('Type DELETE to leave this account.', "Γράψε DELETE για να φύγεις από τον λογαριασμό.")}
                </p>
                <input className={inputClass} value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={() => { setDeleteOpen(false); setDeleteText(""); }}>{t("Cancel", "Άκυρο")}</Button>
                  <Button
                    type="button"
                    className="bg-red-700 hover:bg-red-800"
                    disabled={deleteText !== "DELETE"}
                    onClick={() => { void leave(); }}
                  >
                    {t("Delete and sign out", "Διαγραφή και έξοδος")}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title={t("Blocked", "Αποκλεισμένοι")} subtitle={t("People who cannot message you.", "Άτομα που δεν μπορούν να σου στείλουν μήνυμα.")}>
            <p className="text-sm text-stone-500">
              {t("No one is blocked. Block from a conversation’s more menu, then they appear here.", "Κανείς δεν είναι αποκλεισμένος. Ο αποκλεισμός γίνεται από το μενού μιας συνομιλίας.")}
            </p>
            <NavLink to="/messages" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-stone-900 underline-offset-4 hover:underline">
              {t("Open messages", "Άνοιγμα μηνυμάτων")}
            </NavLink>
          </Card>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-3" title={t("Current plan", "Τρέχον πλάνο")} subtitle={t("Pro Founder, billed once a year.", "Pro Founder, ετήσια χρέωση.")}>
            <div className="rounded-xl bg-stone-900 p-5 text-white sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">Pro Founder</p>
                  <p className="mt-1 text-sm text-white/70">{form.currency === "USD" ? "$240" : form.currency === "GBP" ? "£190" : "€220"} · {t("per year", "τον χρόνο")}</p>
                </div>
                <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 px-3 text-xs font-semibold">{t("Active", "Ενεργό")}</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  [t("Matches", "Αντιστοιχίσεις"), t("Unlimited", "Απεριόριστες")],
                  [t("Mentor sessions", "Συνεδρίες μεντόρων"), "5 / " + t("month", "μήνα")],
                  [t("Communities", "Κοινότητες"), t("All", "Όλες")],
                  [t("Perks", "Παροχές"), "€50k"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-white/50">{label}</p>
                    <p className="mt-1 text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <NavLink to="/settings/billing"><Button variant="secondary">{t("Billing history", "Ιστορικό χρέωσης")}</Button></NavLink>
                <NavLink to="/pricing"><Button variant="ghost" className="text-white hover:bg-white/10">{t("Compare plans", "Σύγκριση πλάνων")}</Button></NavLink>
              </div>
            </div>
          </Card>

          <Card className="xl:col-span-3" title={t("Usage this month", "Χρήση αυτού του μήνα")} subtitle={t("Resets on the first of the month.", "Μηδενίζει την πρώτη του μήνα.")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [t("Intro requests", "Αιτήματα γνωριμίας"), "12", "40"],
                [t("Mentor sessions", "Συνεδρίες μεντόρων"), "2", "5"],
                [t("Data room files", "Αρχεία data room"), "8", "50"],
                [t("Tracked applications", "Αιτήσεις"), "4", "20"],
              ].map(([label, used, max]) => (
                <div key={label} className="rounded-xl border border-stone-100 p-4">
                  <p className="text-sm text-stone-500">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{used}<span className="text-sm font-medium text-stone-400"> / {max}</span></p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full bg-stone-900" style={{ width: `${(Number(used) / Number(max)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="xl:col-span-2" title={t("Payment methods", "Τρόποι πληρωμής")} subtitle={t("The card charged for the annual plan.", "Η κάρτα της ετήσιας χρέωσης.")}>
            <div className="space-y-3">
              {cards.map((card) => (
                <div key={card.id} className="flex flex-col gap-3 rounded-xl border border-stone-100 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 min-w-14 items-center justify-center rounded-lg border border-stone-200 bg-white px-2 text-xs font-semibold text-stone-600">{card.brand}</div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">•••• {card.last4}</p>
                      <p className="text-sm text-stone-500">{t("Expires", "Λήγει")} {card.expiry}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" className="text-red-600" onClick={() => saveCards(cards.filter((item) => item.id !== card.id))}>
                    {t("Remove", "Αφαίρεση")}
                  </Button>
                </div>
              ))}
              {addingCard ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label={t("Brand", "Τύπος")}>
                    <select className={inputClass} value={cardDraft.brand} onChange={(e) => setCardDraft((prev) => ({ ...prev, brand: e.target.value }))}>
                      {["Visa", "Mastercard", "Amex"].map((brand) => <option key={brand}>{brand}</option>)}
                    </select>
                  </Field>
                  <Field label={t("Last 4 digits", "4 τελευταία ψηφία")}>
                    <input className={inputClass} inputMode="numeric" maxLength={4} value={cardDraft.last4} onChange={(e) => setCardDraft((prev) => ({ ...prev, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
                  </Field>
                  <Field label={t("Expiry", "Λήξη")}>
                    <input className={inputClass} placeholder="MM/YY" value={cardDraft.expiry} onChange={(e) => setCardDraft((prev) => ({ ...prev, expiry: e.target.value }))} />
                  </Field>
                  <div className="flex flex-wrap gap-2 sm:col-span-3">
                    <Button
                      type="button"
                      onClick={() => {
                        if (cardDraft.last4.length !== 4) return;
                        saveCards([{ id: `${cardDraft.brand}-${cardDraft.last4}`, ...cardDraft }, ...cards]);
                        setCardDraft({ brand: "Visa", last4: "", expiry: "" });
                        setAddingCard(false);
                        success(t("Card added", "Η κάρτα προστέθηκε"));
                      }}
                    >
                      {t("Save card", "Αποθήκευση κάρτας")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setAddingCard(false)}>{t("Cancel", "Άκυρο")}</Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => setAddingCard(true)}>
                  <Plus className="h-4 w-4" /> {t("Add payment method", "Προσθήκη τρόπου πληρωμής")}
                </Button>
              )}
            </div>
          </Card>

          <Card title={t("Billing details", "Στοιχεία χρέωσης")} subtitle={t("Printed on invoices.", "Τυπώνονται στα τιμολόγια.")}>
            <div className="space-y-4">
              <Field label={t("Name on invoice", "Όνομα στο τιμολόγιο")}>
                <input className={inputClass} value={form.company || form.fullName} onChange={(e) => setField("company", e.target.value)} />
              </Field>
              <Field label={t("Billing email", "Email χρέωσης")}>
                <input className={inputClass} type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </Field>
              <Field label={t("Country", "Χώρα")}>
                <input className={inputClass} value={form.location} onChange={(e) => setField("location", e.target.value)} />
              </Field>
              <Button type="button" variant="outline" className="w-full" onClick={saveForm}>{t("Save billing details", "Αποθήκευση στοιχείων")}</Button>
            </div>
          </Card>

          <Card className="xl:col-span-3" title={t("Invoices", "Τιμολόγια")} subtitle={t("The last year on this plan.", "Ο τελευταίος χρόνος σε αυτό το πλάνο.")}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-500">
                    <th className="py-3 pr-4 font-medium">{t("Date", "Ημερομηνία")}</th>
                    <th className="py-3 pr-4 font-medium">{t("Description", "Περιγραφή")}</th>
                    <th className="py-3 pr-4 font-medium">{t("Amount", "Ποσό")}</th>
                    <th className="py-3 pr-4 font-medium">{t("Status", "Κατάσταση")}</th>
                    <th className="py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["12 Mar 2026", "Pro Founder · annual", form.currency === "USD" ? "$240.00" : "€220.00", t("Paid", "Πληρωμένο")],
                    ["12 Mar 2025", "Pro Founder · annual", "€220.00", t("Paid", "Πληρωμένο")],
                    ["12 Mar 2024", "Starter · annual", "€0.00", t("Paid", "Πληρωμένο")],
                  ] as [string, string, string, string][]).map(([date, description, amount, status]) => (
                    <tr key={date} className="border-b border-stone-50">
                      <td className="py-3 pr-4 text-stone-700">{date}</td>
                      <td className="py-3 pr-4 font-medium text-stone-900">{description}</td>
                      <td className="py-3 pr-4 text-stone-700">{amount}</td>
                      <td className="py-3 pr-4 text-emerald-700">{status}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          className="min-h-11 px-3 text-sm font-medium text-stone-700"
                          onClick={() => {
                            const blob = new Blob([`${description}\n${date}\n${amount}\n${status}\n`], { type: "text/plain" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `invoice-${date.replace(/\s/g, "-")}.txt`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          {t("Download", "Λήψη")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="xl:col-span-3" title={t("Plans", "Πλάνα")} subtitle={t("You can change plan from the pricing page.", "Η αλλαγή πλάνου γίνεται από τη σελίδα τιμών.")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                [t("Starter", "Starter"), "€0", t("Profile, discovery, and communities.", "Προφίλ, εξερεύνηση και κοινότητες."), false],
                [t("Pro Founder", "Pro Founder"), "€220", t("Matches, mentors, data room, and perks.", "Αντιστοιχίσεις, μέντορες, data room και παροχές."), true],
                [t("Studio", "Studio"), t("Talk to us", "Επικοινώνησε"), t("A private workspace for a team.", "Ιδιωτικός χώρος για ομάδα."), false],
              ].map(([name, price, desc, current]) => (
                <div key={String(name)} className={cn("flex flex-col rounded-xl border p-4", current ? "border-stone-900" : "border-stone-200")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-900">{name}</p>
                    {current ? <span className="text-xs font-semibold text-stone-500">{t("Current", "Τρέχον")}</span> : null}
                  </div>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{price}</p>
                  <p className="mt-2 flex-1 text-sm text-stone-500">{desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-stone-500">
                    <Globe className="h-4 w-4" />
                    {current ? t("Renews 12 Mar 2027", "Ανανέωση 12 Μαρ 2027") : t("Available on the pricing page", "Διαθέσιμο στη σελίδα τιμών")}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-900">{t("Sign out", "Έξοδος")}</p>
          <p className="mt-1 text-sm text-stone-500">{t("Leaves this account and returns to the start.", "Φεύγει από τον λογαριασμό και γυρίζει στην αρχή.")}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => { void leave(); }}>
          <LogOut className="h-4 w-4" /> {t("Log out", "Έξοδος")}
        </Button>
      </div>
    </div>
  );
}
