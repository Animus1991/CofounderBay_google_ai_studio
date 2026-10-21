import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
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
import PageShell from "../components/ui/PageShell";
import { cn } from "../lib/utils";
import { bothText, labelOf } from "../lib/labels";
import { useLanguage, type LangMode } from "../lib/language";
import { keys, readNotificationPrefs, readPlan, readValue, resetAllLists, writeNotificationPrefs, writePlan, writeProfileLocal, writeValue, type NotificationPrefs, type PlanId } from "../lib/localLists";
import { applySwitches, readSwitches, seedSwitchesFromProfile, type Switches } from "../lib/privacySwitches";
import { useStored } from "../lib/useStored";
import { safeWebUrl } from "../lib/webUrl";
import { useBlocks, unblockPerson } from "../lib/social";
import { useSyncStatus } from "../lib/cloudSync";
import Avatar from "../components/ui/Avatar";
import { findPerson, avatarOf } from "../lib/peopleSource";
import { AskLink } from "../components/ui/EmptyHint";
import { usePageControls } from "../lib/pageControls";
import { useAuth } from "../App";
import { useToast } from "../context/ToastContext";
import { changeAccountPassword, deleteAccount, persistAccount, signOutAccount } from "../lib/account";
import { exportMyData } from "../lib/dataExport";

const FORM_KEY = keys.accountForm;
const SWITCH_KEY = keys.accountSwitches;
const CARDS_KEY = keys.paymentCards;

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

function readStored<T>(key: string, fallback: T): T {
  const parsed = readValue<T | null>(key, null);
  if (parsed == null) return fallback;
  if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
  if (parsed && typeof parsed === "object") return { ...(fallback as object), ...(parsed as object) } as T;
  return fallback;
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
  const isGuest = !user && !isDemoMode;
  const { mode, setMode } = useLanguage();
  const { success, info, error: toastError } = useToast();
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

  type SettingsTab = "account" | "notifications" | "privacy" | "billing";
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const activeTab: SettingsTab = tabParam === "notifications" || tabParam === "privacy" || tabParam === "billing" ? tabParam : "account";
  const setActiveTab = (id: SettingsTab) => {
    const next = new URLSearchParams(params);
    if (id === "account") next.delete("tab");
    else next.set("tab", id);
    setParams(next, { replace: true });
  };
  usePageControls(() => [
    { id: 'tab-account', en: 'Account', el: 'Λογαριασμός', run: () => setActiveTab('account') },
    { id: 'tab-notifications', en: 'Notifications', el: 'Ειδοποιήσεις', run: () => setActiveTab('notifications') },
    { id: 'tab-privacy', en: 'Privacy', el: 'Απόρρητο', run: () => setActiveTab('privacy') },
    { id: 'tab-billing', en: 'Billing', el: 'Χρέωση', run: () => setActiveTab('billing') },
  ], []);
  const [form, setForm] = useState<AccountForm>(() => readStored(FORM_KEY, seedForm()));
  const formDirtyRef = useRef(false);
  const formSeededRef = useRef(false);
  // The profile may arrive after first render; re-seed once unless the user already typed or a draft exists.
  useEffect(() => {
    if (formDirtyRef.current || formSeededRef.current) return;
    if (readStored<AccountForm | null>(FORM_KEY, null)) {
      formSeededRef.current = true;
      return;
    }
    setForm(seedForm());
    formSeededRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);
  const blocks = useBlocks();
  const syncStatus = useSyncStatus();
  const switches = useStored(readSwitches, [SWITCH_KEY]);
  // A real account seeds the switches from what is already saved on the profile, so two devices agree.
  useEffect(() => {
    if (isDemoMode || !profile) return;
    const stored = readSwitches();
    const merged = seedSwitchesFromProfile(profile as Parameters<typeof seedSwitchesFromProfile>[0], stored);
    const differs = (Object.keys(merged) as (keyof Switches)[]).some((key) => merged[key] !== stored[key]);
    if (differs) writeValue(SWITCH_KEY, merged);
  }, [profile, isDemoMode]);
  const notifications = useStored(readNotificationPrefs, [keys.notificationPrefs]);
  const cards = useStored<PayCard[]>(() => readValue<PayCard[]>(CARDS_KEY, []), [CARDS_KEY]);
  // The demo sample card is written once, only while the key has never been set.
  useEffect(() => {
    if (isDemoMode && cards.length === 0 && readValue<PayCard[] | null>(CARDS_KEY, null) == null) {
      writeValue<PayCard[]>(CARDS_KEY, [{ id: "visa-4242", brand: "Visa", last4: "4242", expiry: "12/28" }]);
    }
  }, [isDemoMode, cards.length]);
  const plan = useStored<PlanId>(() => {
    if (isDemoMode && readValue<PlanId | null>(keys.plan, null) == null) return "pro";
    return readPlan();
  }, [keys.plan]);
  const [addingCard, setAddingCard] = useState(false);
  const [cardDraft, setCardDraft] = useState({ brand: "Visa", last4: "", expiry: "" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState({ next: "", confirm: "" });
  const [passwordWhen, setPasswordWhen] = useState(isDemoMode ? t("3 months ago", "πριν από 3 μήνες") : t("Not recorded yet", "Δεν έχει καταγραφεί ακόμη"));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const setField = (key: keyof AccountForm, value: string) => {
    formDirtyRef.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveForm = async () => {
    // Reject non-http(s) link values instead of storing a scriptable scheme.
    const saved = { ...form };
    let rejected = false;
    for (const key of ["website", "linkedin", "github"] as const) {
      if (saved[key].trim() && !safeWebUrl(saved[key])) {
        saved[key] = "";
        rejected = true;
      }
    }
    if (rejected) {
      toastError(t("Links must start with http:// or https://", "Οι σύνδεσμοι πρέπει να ξεκινούν με http:// ή https://"));
    }
    writeValue(FORM_KEY, saved);
    if (!isDemoMode && user) {
      try {
        await persistAccount(user.uid, saved);
        success(t("Account saved", "Ο λογαριασμός αποθηκεύτηκε"), t("These details are on your profile.", "Τα στοιχεία είναι στο προφίλ σου."));
        return;
      } catch {
        success(t("Saved on this device", "Αποθηκεύτηκε σε αυτή τη συσκευή"), t("The server could not be reached. They stay in this browser until you are back online.", "Ο διακομιστής δεν απάντησε. Μένουν σε αυτόν τον περιηγητή μέχρι να επανέλθεις."));
        return;
      }
    }
    if (isDemoMode) {
      // Mirror of persistAccount's mapping, minus photo (a data URL does not
      // belong in localStorage) and email (the demo identity keeps its own).
      const linkedin = saved.linkedin.trim() ? (/^https?:\/\//i.test(saved.linkedin.trim()) ? saved.linkedin.trim() : `https://${saved.linkedin.trim()}`) : "";
      const github = saved.github.trim() ? (/^https?:\/\//i.test(saved.github.trim()) ? saved.github.trim() : `https://${saved.github.trim()}`) : "";
      const website = saved.website.trim() ? (/^https?:\/\//i.test(saved.website.trim()) ? saved.website.trim() : `https://${saved.website.trim()}`) : "";
      writeProfileLocal({
        fullName: saved.fullName,
        headline: saved.headline,
        bio: saved.bio,
        location: saved.location,
        role: saved.role,
        stage: saved.stage,
        industry: saved.industry,
        commitment: saved.commitment,
        company: saved.company,
        timezone: saved.timezone,
        linkedinUrl: linkedin,
        githubUrl: github,
        socialLinks: {
          ...(linkedin ? { linkedin } : {}),
          ...(github ? { github } : {}),
          ...(website ? { website } : {}),
        },
      });
    }
    success(t("Account saved", "Ο λογαριασμός αποθηκεύτηκε"), t("These details stay in this browser.", "Τα στοιχεία μένουν σε αυτόν τον περιηγητή."));
  };

  const patchSwitches = (patch: Partial<Switches>) => {
    applySwitches(patch, { uid: user?.uid ?? null, demo: isDemoMode });
  };

  const toggleNotification = (key: keyof NotificationPrefs) => {
    writeNotificationPrefs({ ...notifications, [key]: !notifications[key] });
  };

  const saveCards = (next: PayCard[]) => {
    writeValue(CARDS_KEY, next);
  };

  const downloadMyData = () => {
    if (isGuest) return;
    exportMyData(profile ?? null);
    success(t("Download started", "Η λήψη ξεκίνησε"));
  };

  const leave = async () => {
    if (isDemoMode) {
      toggleDemoMode(false);
      navigate("/");
      return;
    }
    try {
      await signOutAccount();
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
    { key: "discoverable", title: t("Appear in Matches and Explore", "Εμφάνιση σε Αντιστοιχίσεις και Εξερεύνηση"), desc: t("Your card is included in lists and search results.", "Η κάρτα σου περιλαμβάνεται στις λίστες και στα αποτελέσματα αναζήτησης.") },
    { key: "sharePresence", title: t("Show when you are online", "Εμφάνιση όταν είσαι σε σύνδεση"), desc: t("Members see “online now” and “last seen” on your profile and in Messages.", "Τα μέλη βλέπουν «σε σύνδεση» και «τελευταία φορά» στο προφίλ σου και στα Μηνύματα.") },
    { key: "showEmail", title: t("Show email", "Εμφάνιση email"), desc: t("Visible on your profile to signed-in members.", "Φαίνεται σε συνδεδεμένα μέλη.") },
    { key: "showLocation", title: t("Show location", "Εμφάνιση τοποθεσίας"), desc: t("City and country on your card.", "Πόλη και χώρα στην κάρτα.") },
    { key: "showStartup", title: t("Show startup", "Εμφάνιση startup"), desc: t("Company, stage, and industry stay visible.", "Εταιρεία, στάδιο και κλάδος μένουν ορατά.") },
    { key: "mentorAvailability", title: t("Open to mentor", "Διάθεση για καθοδήγηση"), desc: t("A badge that you can take mentor requests.", "Σήμα ότι δέχεσαι αιτήματα.") },
    { key: "openToCofounder", title: t("Looking for a co-founder", "Ψάχνω συνιδρυτή"), desc: t("Shown on your card and in matches.", "Φαίνεται στην κάρτα και στις αντιστοιχίσεις.") },
    { key: "openToInvestors", title: t("Open to investors", "Ανοιχτός σε επενδυτές"), desc: t("Investors can request an intro.", "Οι επενδυτές μπορούν να στείλουν αίτημα σύστασης.") },
    { key: "openToAdvisors", title: t("Open to advisors", "Ανοιχτός σε συμβούλους"), desc: t("Advisors can offer a session.", "Οι σύμβουλοι μπορούν να προτείνουν συνεδρία.") },
  ];

  const syncLabel = !isDemoMode
    ? syncStatus === "synced" ? t("Saved", "Αποθηκεύτηκε") : syncStatus === "syncing" ? t("Saving…", "Αποθήκευση…") : syncStatus === "offline" ? t("Offline — will save when back online", "Εκτός σύνδεσης — θα αποθηκευτεί μόλις επανέλθεις") : syncStatus === "error" ? t("Could not save", "Η αποθήκευση απέτυχε") : ""
    : "";

  return (
    <PageShell
      sample={isDemoMode}
      title={t("Settings", "Ρυθμίσεις")}
      description={
        isDemoMode
          ? t("Account, notifications, privacy and plan. In the demo, changes stay in this browser.", "Λογαριασμός, ειδοποιήσεις, απόρρητο και πλάνο. Στη δοκιμαστική λειτουργία, οι αλλαγές μένουν σε αυτόν τον περιηγητή.")
          : t("Account, notifications, privacy and plan. Changes are saved to your account and follow you to every device.", "Λογαριασμός, ειδοποιήσεις, απόρρητο και πλάνο. Οι αλλαγές αποθηκεύονται στον λογαριασμό σου και σε ακολουθούν σε κάθε συσκευή.")
      }
      actions={
        <div className="flex flex-wrap items-center gap-3">
          {syncLabel ? (
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", syncStatus === "error" || syncStatus === "offline" ? "text-amber-600" : "text-stone-400")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", syncStatus === "synced" ? "bg-emerald-500" : syncStatus === "syncing" ? "bg-stone-400 animate-pulse" : syncStatus === "idle" ? "bg-stone-300" : "bg-amber-500")} />
              {syncLabel}
            </span>
          ) : null}
          <AskLink prompt="What am I marked open to?">{t("Ask what matching reads from these toggles", "Ρώτα τι επηρεάζει την αντιστοίχιση από εδώ")}</AskLink>
          <p className="text-sm text-stone-500 truncate">
            {form.email || user?.email || t("Demo account", "Δοκιμαστικός λογαριασμός")}
          </p>
        </div>
      }
    >
    <div className="space-y-6">

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

          <Card className="lg:col-span-2" title={t("Startup", "Νεοφυής επιχείρηση")} subtitle={t("Used by discovery, matches, and fundraising.", "Χρησιμοποιείται στην εξερεύνηση, τις αντιστοιχίσεις και τη χρηματοδότηση.")}>
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
                    <option key={item || "blank"} value={item}>{item ? labelOf(item) : t("Choose a stage", "Επίλεξε στάδιο")}</option>
                  ))}
                </select>
              </Field>
              <Field label={t("Industry", "Κλάδος")}>
                <input className={inputClass} value={form.industry} onChange={(e) => setField("industry", e.target.value)} />
              </Field>
              <Field label={t("Commitment", "Δέσμευση")}>
                <select className={inputClass} value={form.commitment} onChange={(e) => setField("commitment", e.target.value)}>
                  {["", "Exploring", "Part-time", "Full-time"].map((item) => (
                    <option key={item || "blank"} value={item}>{item ? labelOf(item) : t("Choose commitment", "Επίλεξε δέσμευση")}</option>
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
                <div className="grid grid-cols-2 gap-2">
                  {([
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
            <Card title={t("Browser alerts", "Ειδοποιήσεις περιηγητή")} subtitle={t("This device only.", "Μόνο αυτή η συσκευή.")}>
              <p className="text-sm text-stone-500">
                {t("Ask the browser for permission, then the push switches below apply.", "Ζήτα άδεια από τον περιηγητή και μετά ισχύουν οι διακόπτες push.")}
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
                    {id === "instant" ? t("Instant", "Άμεσα") : id === "daily" ? t("Daily", "Ημερήσια") : id === "weekly" ? t("Weekly", "Εβδομαδιαία") : t("Off", "Ανενεργή")}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="xl:col-span-2" title={t("Push", "Push")} subtitle={t("Real-time alerts after the browser allows them.", "Άμεσες ειδοποιήσεις αφού το επιτρέψει ο περιηγητής.")}>
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
                desc={t("One email with programs, events, and unread intros.", "Ένα email με προγράμματα, εκδηλώσεις και αναπάντητα αιτήματα σύνδεσης.")}
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
                      {isDemoMode
                        ? (switches.twoFactor
                          ? t("On for this browser.", "Ενεργό σε αυτόν τον περιηγητή.")
                          : t("Off. A code would be asked at the next sign-in.", "Κλειστό. Στην επόμενη είσοδο θα ζητηθεί κωδικός."))
                        : t("Saved as a preference on this device. Firebase MFA is not enabled on this project yet.", "Αποθηκεύεται ως προτίμηση σε αυτή τη συσκευή. Το Firebase MFA δεν είναι ενεργό ακόμη σε αυτό το project.")}
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
                    onClick={async () => {
                      if (password.next.length < 8 || password.next !== password.confirm) {
                        info(t("Check the password", "Έλεγξε τον κωδικό"), t("Use 8 or more characters and matching fields.", "Τουλάχιστον 8 χαρακτήρες και ίδια πεδία."));
                        return;
                      }
                      if (isDemoMode) {
                        setPassword({ next: "", confirm: "" });
                        setPasswordOpen(false);
                        setPasswordWhen(t("just now", "μόλις τώρα"));
                        success(t("Password updated on this device", "Ο κωδικός ενημερώθηκε σε αυτή τη συσκευή"));
                        return;
                      }
                      try {
                        await changeAccountPassword(password.next);
                        setPassword({ next: "", confirm: "" });
                        setPasswordOpen(false);
                        setPasswordWhen(t("just now", "μόλις τώρα"));
                        success(t("Password updated", "Ο κωδικός ενημερώθηκε"));
                      } catch (err: unknown) {
                        const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
                        if (code === "auth/requires-recent-login") {
                          info(t("Sign in again", "Ξανασυνδέσου"), t("Firebase asks for a recent sign-in before changing the password.", "Το Firebase ζητά πρόσφατη είσοδο πριν αλλάξει ο κωδικός."));
                        } else {
                          info(t("Could not update password", "Ο κωδικός δεν άλλαξε"), t("If you sign in with Google, add an email password after a fresh sign-in.", "Αν μπαίνεις με Google, πρόσθεσε κωδικό email μετά από νέα είσοδο."));
                        }
                      }
                    }}
                  >
                    {t("Save password", "Αποθήκευση κωδικού")}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title={t("Who can message you", "Ποιοι σου στέλνουν μήνυμα")} subtitle={t("Intros still appear in your requests.", "Τα αιτήματα σύνδεσης εμφανίζονται πάντα στα Αιτήματα.")}>
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
                    "flex w-full min-h-11 flex-col items-start justify-center rounded-xl border px-4 py-3 text-left",
                    switches.messagesFrom === id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-800",
                  )}
                >
                  <span className="text-sm font-semibold leading-snug">{title}</span>
                  <span className={cn("mt-0.5 text-sm leading-snug", switches.messagesFrom === id ? "text-white/70" : "text-stone-500")}>{desc}</span>
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
                  {(isDemoMode
                    ? [
                        [t("This browser", "Αυτός ο περιηγητής"), t("Current session", "Τρέχουσα συνεδρία"), t("Now", "Τώρα"), true],
                        ["Safari · iPhone", "Athens", t("2 hours ago", "πριν από 2 ώρες"), false],
                        ["Chrome · Mac", "London", t("Yesterday", "Χθες"), false],
                      ]
                    : [
                        [t("This browser", "Αυτός ο περιηγητής"), t("Current session", "Τρέχουσα συνεδρία"), t("Now", "Τώρα"), true],
                      ]
                  ).map(([device, where, when, current]) => (
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

          <Card className="xl:col-span-2" title={t("Your data", "Τα δεδομένα σου")} subtitle={t("A file of what this browser has stored for you.", "Αρχείο με ό,τι έχει κρατήσει αυτός ο περιηγητής.")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={downloadMyData}
                disabled={isGuest}
                title={isGuest ? t("Sign in or open the demo to export your data.", "Συνδέσου ή άνοιξε τη δοκιμαστική λειτουργία για εξαγωγή.") : undefined}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="h-4 w-4 shrink-0 text-stone-500" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug text-stone-900">{t("Export my data", "Εξαγωγή των δεδομένων μου")}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-stone-500">JSON</span>
                </span>
              </button>
              <button type="button" onClick={() => setDeleteOpen(true)} className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left hover:bg-red-50">
                <Trash2 className="h-4 w-4 shrink-0 text-red-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug text-red-700">{t("Delete account", "Διαγραφή λογαριασμού")}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-stone-500">{t("Removes your profile and this account.", "Διαγράφει το προφίλ και αυτόν τον λογαριασμό.")}</span>
                </span>
              </button>
            </div>
            <p className="mt-3 text-sm text-stone-500">
              {t("The export contains your profile and every list this browser stores for you — matches, requests, settings and drafts — as one JSON file.", "Η εξαγωγή περιέχει το προφίλ σου και κάθε λίστα που κρατά αυτός ο περιηγητής — αντιστοιχίσεις, αιτήματα, ρυθμίσεις και πρόχειρα — σε ένα αρχείο JSON.")}
            </p>
            {deleteOpen && (
              <div className="mt-4 space-y-3 rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  {t('Type DELETE to leave this account.', "Γράψε DELETE για να διαγράψεις τον λογαριασμό.")}
                </p>
                <input className={inputClass} value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE" />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={() => { setDeleteOpen(false); setDeleteText(""); }}>{t("Cancel", "Ακύρωση")}</Button>
                  <Button
                    type="button"
                    className="bg-red-700 hover:bg-red-800"
                    disabled={deleteText !== "DELETE"}
                    onClick={async () => {
                      if (isDemoMode) {
                        void leave();
                        return;
                      }
                      try {
                        await deleteAccount();
                        resetAllLists();
                        navigate("/");
                      } catch (err: unknown) {
                        const code = typeof err === "object" && err && "code" in err ? String((err as { code: string }).code) : "";
                        if (code === "auth/requires-recent-login") {
                          info(t("Sign in again to delete", "Ξανασυνδέσου για διαγραφή"), t("Firebase needs a recent sign-in before deleting an account.", "Το Firebase ζητά πρόσφατη είσοδο πριν διαγράψει λογαριασμό."));
                        } else {
                          info(t("Could not delete the account", "Ο λογαριασμός δεν διαγράφηκε"), t("Try again after a fresh sign-in.", "Δοκίμασε ξανά μετά από νέα είσοδο."));
                        }
                      }
                    }}
                  >
                    {t("Delete and sign out", "Διαγραφή και αποσύνδεση")}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title={t("Blocked members", "Αποκλεισμένα μέλη")} subtitle={t("They cannot message you or see you in their lists.", "Δεν μπορούν να σου στείλουν μήνυμα ούτε να σε δουν στις λίστες τους.")}>
            {blocks.length === 0 ? (
              <>
                <p className="text-sm text-stone-500">
                  {t("No one is blocked. You can block a member from the “more” menu of a conversation; they will appear here.", "Δεν έχεις αποκλείσει κανέναν. Μπορείς να αποκλείσεις ένα μέλος από το μενού «περισσότερα» μιας συνομιλίας· θα εμφανιστεί εδώ.")}
                </p>
                <NavLink to="/messages" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-stone-900 underline-offset-4 hover:underline">
                  {t("Open messages", "Άνοιγμα μηνυμάτων")}
                </NavLink>
              </>
            ) : (
              <ul className="divide-y divide-stone-100">
                {blocks.map((item) => {
                  const person = findPerson(item.id);
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <Avatar src={person ? avatarOf(person) : undefined} fallback={person?.fullName || item.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900">{person?.fullName || item.name || t("Member", "Μέλος")}</p>
                        <p className="text-xs text-stone-400">{t("Blocked", "Αποκλεισμένο μέλος")}</p>
                      </div>
                      <Button type="button" variant="outline" className="min-h-10 px-3 text-xs" onClick={() => void unblockPerson(item.id).then(() => success(t("Member unblocked", "Ο αποκλεισμός αφαιρέθηκε")))}>
                        {t("Unblock", "Άρση αποκλεισμού")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-3" title={t("Current plan", "Τρέχον πλάνο")} subtitle={plan === "pro" ? t("Pro Founder, billed once a year.", "Pro Founder, ετήσια χρέωση.") : plan === "studio" ? t("Studio workspace.", "Χώρος Studio.") : t("Starter. No charge until you upgrade.", "Starter. Χωρίς χρέωση μέχρι να αναβαθμίσεις.")}>
            <div className="rounded-xl bg-stone-900 p-5 text-white sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold">{plan === "pro" ? "Pro Founder" : plan === "studio" ? "Studio" : "Starter"}</p>
                  <p className="mt-1 text-sm text-white/70">{plan === "starter" ? t("Free", "Δωρεάν") : plan === "studio" ? t("Talk to us", "Επικοινώνησε") : (form.currency === "USD" ? "$240" : form.currency === "GBP" ? "£190" : "€220") + " · " + t("per year", "τον χρόνο")}</p>
                </div>
                <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 px-3 text-xs font-semibold">{t("Active", "Ενεργό")}</span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {(plan === "starter"
                  ? [
                      [t("Matches", "Αντιστοιχίσεις"), t("Open directory", "Ανοιχτός κατάλογος")],
                      [t("Mentor sessions", "Συνεδρίες μεντόρων"), t("On request", "Κατόπιν αιτήματος")],
                      [t("Communities", "Κοινότητες"), t("Public", "Δημόσιες")],
                      [t("Perks", "Παροχές"), t("None yet", "Καμία ακόμη")],
                    ]
                  : [
                      [t("Matches", "Αντιστοιχίσεις"), t("Unlimited", "Απεριόριστες")],
                      [t("Mentor sessions", "Συνεδρίες μεντόρων"), "5 / " + t("month", "μήνα")],
                      [t("Communities", "Κοινότητες"), t("All", "Όλες")],
                      [t("Perks", "Παροχές"), "€50k"],
                    ]
                ).map(([label, value]) => (
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
              {(isDemoMode
                ? [
                    [t("Intro requests", "Αιτήματα σύνδεσης"), "12", "40"],
                    [t("Mentor sessions", "Συνεδρίες μεντόρων"), "2", "5"],
                    [t("Data room files", "Αρχεία data room"), "8", "50"],
                    [t("Tracked applications", "Αιτήσεις"), "4", "20"],
                  ]
                : [
                    [t("Intro requests", "Αιτήματα σύνδεσης"), "0", "10"],
                    [t("Mentor sessions", "Συνεδρίες μεντόρων"), "0", "1"],
                    [t("Data room files", "Αρχεία data room"), "0", "5"],
                    [t("Tracked applications", "Αιτήσεις"), "0", "5"],
                  ]
              ).map(([label, used, max]) => (
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
                  {!isDemoMode && (
                    <tr>
                      <td colSpan={5} className="py-6 text-sm text-stone-500">
                        {t("No invoices yet. Starter has no charge.", "Δεν υπάρχουν τιμολόγια. Το Starter δεν έχει χρέωση.")}
                      </td>
                    </tr>
                  )}
                  {(isDemoMode
                    ? ([
                        ["12 Mar 2026", "Pro Founder · annual", form.currency === "USD" ? "$240.00" : "€220.00", t("Paid", "Πληρωμένο")],
                        ["12 Mar 2025", "Pro Founder · annual", "€220.00", t("Paid", "Πληρωμένο")],
                        ["12 Mar 2024", "Starter · annual", "€0.00", t("Paid", "Πληρωμένο")],
                      ] as [string, string, string, string][])
                    : []
                  ).map(([date, description, amount, status]) => (
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
              {([
                ["starter", t("Starter", "Starter"), "€0", t("Profile, discovery, and communities.", "Προφίλ, εξερεύνηση και κοινότητες.")] as const,
                ["pro", t("Pro Founder", "Pro Founder"), "€220", t("Matches, mentors, data room, and perks.", "Αντιστοιχίσεις, μέντορες, data room και παροχές.")] as const,
                ["studio", t("Studio", "Studio"), t("Talk to us", "Επικοινώνησε"), t("A private workspace for a team.", "Ιδιωτικός χώρος για ομάδα.")] as const,
              ]).map(([id, name, price, desc]) => {
                const current = plan === id;
                return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    writePlan(id);
                    success(
                      t("Plan selected", "Επιλέχθηκε πλάνο"),
                      id === "starter"
                        ? t("Starter is live. Checkout is not required.", "Το Starter είναι ενεργό. Δεν χρειάζεται πληρωμή.")
                        : t("Saved on this account. Paid checkout is not live yet, so Starter stays until billing is connected.", "Αποθηκεύτηκε σε αυτόν τον λογαριασμό. Η διαδικασία πληρωμής δεν είναι ακόμη διαθέσιμη, οπότε μένεις στο Starter μέχρι να συνδεθεί χρέωση."),
                    );
                  }}
                  className={cn("flex flex-col rounded-xl border p-4 text-left", current ? "border-stone-900" : "border-stone-200")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-900">{name}</p>
                    {current ? <span className="text-xs font-semibold text-stone-500">{t("Current", "Τρέχον")}</span> : null}
                  </div>
                  <p className="mt-2 text-lg font-semibold text-stone-900">{price}</p>
                  <p className="mt-2 flex-1 text-sm text-stone-500">{desc}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-stone-500">
                    <Globe className="h-4 w-4" />
                    {current && id !== "starter" ? t("Renews after checkout", "Ανανέωση μετά την πληρωμή") : t("Available on this account", "Διαθέσιμο σε αυτόν τον λογαριασμό")}
                  </div>
                </button>
                );
              })}
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
    </PageShell>
  );
}
