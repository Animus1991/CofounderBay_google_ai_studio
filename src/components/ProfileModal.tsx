import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Briefcase,
  CheckCircle,
  MessageSquare,
  Bookmark,
  Edit3,
  Check,
  BarChart2,
} from 'lucide-react';
import { FounderProfile, RoleCategory, StartupStage, CommitmentType } from '../types';
import CoverImage from './ui/CoverImage';

interface ProfileModalProps {
  profile: FounderProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateChat: (founder: FounderProfile) => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  isOwnProfile?: boolean;
  onSaveProfile?: (updated: FounderProfile) => void;
  onOpenMatchBreakdown?: (founder: FounderProfile) => void;
  lang?: 'en' | 'el';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onInitiateChat,
  isSaved,
  onToggleSave,
  isOwnProfile = false,
  onSaveProfile,
  onOpenMatchBreakdown,
  lang = 'en',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [role, setRole] = useState<RoleCategory>('Technical Co-Founder');
  const [location, setLocation] = useState('');
  const [stage, setStage] = useState<StartupStage>('Prototype / MVP');
  const [commitment, setCommitment] = useState<CommitmentType>('Full-Time');
  const [equity, setEquity] = useState('');
  const [bio, setBio] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [lookingForText, setLookingForText] = useState('');
  const [pastExperience, setPastExperience] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setHeadline(profile.headline);
      setRole(profile.role);
      setLocation(profile.location);
      setStage(profile.stage);
      setCommitment(profile.commitment);
      setEquity(profile.equityExpectation);
      setBio(profile.bio);
      setSkillsText(profile.skills.join(', '));
      setLookingForText(profile.lookingFor.join(', '));
      setPastExperience(profile.pastExperience);
      setIsEditing(false);
    }
  }, [profile]);

  if (!isOpen || !profile) return null;

  const handleSaveEdit = () => {
    if (onSaveProfile) {
      onSaveProfile({
        ...profile,
        name: name.trim() || profile.name,
        headline: headline.trim() || profile.headline,
        role,
        location: location.trim() || profile.location,
        stage,
        commitment,
        equityExpectation: equity.trim() || profile.equityExpectation,
        bio: bio.trim() || profile.bio,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        lookingFor: lookingForText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        pastExperience: pastExperience.trim() || profile.pastExperience,
      });
    }
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={profile.name}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="relative h-28 w-full bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-border">
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'en' ? 'Close' : 'Κλείσιμο'}
            className="absolute top-3 right-3 rounded-lg bg-black/50 p-1.5 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative px-6 pb-6 pt-0">
          <div className="-mt-12 flex items-end justify-between gap-4">
            <div className="relative">
              <CoverImage
                src={profile.avatar}
                alt={profile.name}
                className="h-24 w-24 rounded-2xl ring-4 ring-card shadow-xl"
                fallback={<span className="text-xl font-semibold text-stone-400">{profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>}
              />
              {profile.verified && (
                <div
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
                  title="Verified Profile"
                >
                  <CheckCircle className="h-4 w-4 stroke-[2.5]" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => (isEditing ? handleSaveEdit() : setIsEditing(true))}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {isEditing ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>
                        {lang === 'en'
                          ? 'Save & Recalculate Matches'
                          : 'Αποθήκευση & Επανυπολογισμός Σκορ'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>
                        {lang === 'en' ? 'Edit My Founder Profile' : 'Επεξεργασία Προφίλ Μου'}
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onToggleSave(profile.id)}
                    aria-label={isSaved ? (lang === 'en' ? 'Unsave profile' : 'Αφαίρεση αποθήκευσης') : (lang === 'en' ? 'Save profile' : 'Αποθήκευση προφίλ')}
                    className={`rounded-xl border border-border p-2.5 transition-colors ${
                      isSaved ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-primary' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onInitiateChat(profile);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{lang === 'en' ? 'Send Message' : 'Αποστολή Μηνύματος'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    {lang === 'en' ? 'Full Name' : 'Ονοματεπώνυμο'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    {lang === 'en' ? 'Primary Founding Role' : 'Κύριος Ρόλος Συνιδρυτή'}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as RoleCategory)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  >
                    <option value="Technical Co-Founder">Technical Co-Founder</option>
                    <option value="Business & Growth">Business & Growth</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Domain & Operations">Domain & Operations</option>
                    <option value="Mentor & Advisor">Mentor & Advisor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Headline' : 'Επαγγελματικός Τίτλος / Headline'}
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    {lang === 'en' ? 'Stage' : 'Στάδιο Venture'}
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as StartupStage)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  >
                    <option value="Idea / Concept">Idea / Concept</option>
                    <option value="Prototype / MVP">Prototype / MVP</option>
                    <option value="Pre-Seed (Traction)">Pre-Seed (Traction)</option>
                    <option value="Seed Funded">Seed Funded</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    {lang === 'en' ? 'Commitment' : 'Δέσμευση'}
                  </label>
                  <select
                    value={commitment}
                    onChange={(e) => setCommitment(e.target.value as CommitmentType)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time (Transition to FT)">Part-Time (Transition to FT)</option>
                    <option value="Evenings & Weekends">Evenings & Weekends</option>
                    <option value="Advisory">Advisory</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    {lang === 'en' ? 'Equity Expectation' : 'Προσδοκία Equity'}
                  </label>
                  <input
                    type="text"
                    value={equity}
                    onChange={(e) => setEquity(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Location' : 'Τοποθεσία'}
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Your Superpowers & Skills (comma-separated)' : 'Δεξιότητες (με κόμμα)'}
                </label>
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en'
                    ? 'Roles / Co-Founder Capabilities Sought (comma-separated)'
                    : 'Ρόλοι / Δεξιότητες Συνιδρυτή που Αναζητάς (με κόμμα)'}
                </label>
                <input
                  type="text"
                  value={lookingForText}
                  onChange={(e) => setLookingForText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  {lang === 'en' ? 'Bio & Venture Vision' : 'Βιογραφικό & Όραμα'}
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-3 text-foreground"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
                  <span className="text-xs font-medium text-primary-accessible">
                    · {profile.role}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-foreground/90">{profile.headline}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{profile.location}</span>
                </p>
              </div>

              {!isOwnProfile && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-primary" />
                      {lang === 'en'
                        ? '6-Axis Compatibility Breakdown'
                        : 'Συμβατότητα Αλγορίθμου 6 Αξόνων'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-xs font-extrabold text-primary">
                        {profile.matchScore}% Match
                      </span>
                      {onOpenMatchBreakdown && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenMatchBreakdown(profile);
                          }}
                          className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                        >
                          {lang === 'en' ? 'Full Matrix' : 'Αναλυτικός Πίνακας'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1">
                    {profile.matchHighlights.map((hl, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">
                        · {hl}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {lang === 'en' ? 'Commitment' : 'Δέσμευση'}
                  </span>
                  <div className="font-bold text-foreground mt-1">{profile.commitment}</div>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {lang === 'en' ? 'Venture Stage' : 'Στάδιο'}
                  </span>
                  <div className="font-bold text-foreground mt-1">{profile.stage}</div>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {lang === 'en' ? 'Equity Target' : 'Στόχος Equity'}
                  </span>
                  <div className="font-bold font-mono tabular-nums text-primary mt-1">
                    {profile.equityExpectation}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <h4 className="text-xs font-bold text-muted-foreground mb-1.5">
                  {lang === 'en' ? 'Founder Vision & Background' : 'Βιογραφικό & Όραμα Συνιδρυτή'}
                </h4>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-background/40 rounded-xl border border-border p-3.5">
                  {profile.bio}
                </p>
              </div>

              <div className="mt-5">
                <h4 className="text-xs font-bold text-muted-foreground mb-1.5">
                  {lang === 'en' ? 'Core Superpowers & Stack' : 'Κύριες Δεξιότητες & Τεχνολογίες'}
                </h4>
                <p className="text-xs text-foreground font-medium">
                  {profile.skills.join(' · ')}
                </p>
              </div>

              <div className="mt-5">
                <h4 className="text-xs font-bold text-muted-foreground mb-1.5">
                  {lang === 'en' ? 'Seeking in a Co-Founder' : 'Αναζητά σε Συνιδρυτή'}
                </h4>
                <div className="rounded-xl border border-border bg-background/50 p-3 space-y-1">
                  {profile.lookingFor.map((lf, i) => (
                    <div key={i} className="text-xs text-foreground font-medium">
                      · {lf}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-foreground">Track Record:</span>
                  <span>{profile.pastExperience}</span>
                </div>
                {profile.education && (
                  <div>
                    <span className="font-semibold text-foreground">Education: </span>
                    <span>{profile.education}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
