import React, { useEffect, useMemo, useState } from 'react';
import {
 User } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Plus,
 Search,
 Edit2,
 Trash2,
 Tag,
 Briefcase,
 Globe,
 Zap,
 X
} from "lucide-react";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useT } from '../../lib/language';
import { labelOf } from '../../lib/labels';
import { useAuth } from '../../App';

type TaxonomyKind = 'skill' | 'industry' | 'role' | 'tag';

interface TaxonomyItem {
 id: string;
 kind: TaxonomyKind;
 name: string;
 category?: string;
 description?: string;
}

const KIND_LABELS: Record<TaxonomyKind, [string, string]> = {
 skill: ['Skill', 'Δεξιότητα'],
 industry: ['Industry', 'Κλάδος'],
 role: ['Role', 'Ρόλος'],
 tag: ['Tag', 'Ετικέτα'],
};

// Platform-authored starter taxonomy — honest vocabulary, seeded once so the
// admin can edit real documents instead of an in-memory list.
const SEED_TAXONOMY: Omit<TaxonomyItem, 'id'>[] = [
 { kind: 'skill', name: 'Product Management', category: 'Business', description: 'Defining product vision and strategy' },
 { kind: 'skill', name: 'Full-stack Development', category: 'Technical', description: 'Building end-to-end web applications' },
 { kind: 'skill', name: 'Growth Marketing', category: 'Marketing', description: 'Scaling user acquisition and retention' },
 { kind: 'skill', name: 'UI/UX Design', category: 'Design', description: 'Creating user-centric interfaces and experiences' },
 { kind: 'skill', name: 'Venture Capital', category: 'Finance', description: 'Fundraising and investment strategy' },
 { kind: 'industry', name: 'Fintech', description: 'Financial technology products and services' },
 { kind: 'industry', name: 'AI & Machine Learning', description: 'Applied AI products and infrastructure' },
 { kind: 'industry', name: 'SaaS', description: 'Subscription software businesses' },
 { kind: 'industry', name: 'Climate Tech', description: 'Sustainability and climate solutions' },
 { kind: 'role', name: 'Founder', description: 'Building a company and looking for a co-founder' },
 { kind: 'role', name: 'Co-Founder Candidate', description: 'Ready to join an early-stage team' },
 { kind: 'role', name: 'Mentor', description: 'Guides founders through domain expertise' },
 { kind: 'role', name: 'Advisor', description: 'Advises startups on specific topics' },
 { kind: 'tag', name: 'B2B', description: 'Business-to-business focus' },
 { kind: 'tag', name: 'B2C', description: 'Consumer-facing focus' },
 { kind: 'tag', name: 'Pre-seed', description: 'Earliest fundraising stage' },
 { kind: 'tag', name: 'Seed', description: 'Seed-stage fundraising' },
];

interface TaxonomySettingsProps {
 user: User;
}

export default function TaxonomySettings({ user: _user }: TaxonomySettingsProps) {
 const t = useT();
 const { isDemoMode } = useAuth();
 const [activeTab, setActiveTab] = useState<TaxonomyKind>('skill');
 const [searchQuery, setSearchQuery] = useState('');
 const [items, setItems] = useState<TaxonomyItem[]>([]);
 const [usage, setUsage] = useState<Record<string, number>>({});
 const [editing, setEditing] = useState<TaxonomyItem | null>(null);
 const [draft, setDraft] = useState({ name: '', category: '', description: '' });
 const [loading, setLoading] = useState(true);
 const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

 useEffect(() => {
  // Sample account: the taxonomies collection denies signed-out reads — show the
  // platform starter vocabulary read-only.
  if (isDemoMode) {
   setItems(SEED_TAXONOMY.map((item, i) => ({ ...item, id: `seed-${item.kind}-${i}` })));
   setLoading(false);
   return;
  }
  const unsub = onSnapshot(collection(db, 'taxonomies'), async (snap) => {
   if (snap.empty) {
    // Seed the platform vocabulary once; merge writes keep it idempotent.
    await Promise.all(SEED_TAXONOMY.map((item, i) =>
     import('firebase/firestore').then(({ setDoc }) =>
      setDoc(doc(db, 'taxonomies', `seed-${item.kind}-${i}`), item, { merge: true })
     )
    )).catch((e) => console.error('Taxonomy seed failed:', e));
    return;
   }
   setItems(snap.docs.map((d) => ({ ...(d.data() as TaxonomyItem), id: d.id })));
   setLoading(false);
  }, () => setLoading(false));
  return () => unsub();
 }, [isDemoMode]);

 // Real usage counts: profiles listing the term in their skills/roles/industry text.
 useEffect(() => {
  if (items.length === 0 || isDemoMode) return;
  getDocs(collection(db, 'profiles')).then((snap) => {
   const counts: Record<string, number> = {};
   snap.docs.forEach((d) => {
    const p = d.data() as any;
    const text = [p.headline, p.bio, p.industry, p.role, p.skillsRaw, ...(Array.isArray(p.skills) ? p.skills : [])]
     .filter(Boolean).join(' ').toLowerCase();
    items.forEach((item) => {
     if (item.name && text.includes(item.name.toLowerCase())) counts[item.id] = (counts[item.id] || 0) + 1;
    });
   });
   setUsage(counts);
  }).catch(() => {});
 }, [items, isDemoMode]);

 const filtered = useMemo(() => items.filter((item) =>
  item.kind === activeTab &&
  (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
   (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()))
 ), [items, activeTab, searchQuery]);

 const openAdd = () => { setEditing(null); setDraft({ name: '', category: '', description: '' }); };
 const openEdit = (item: TaxonomyItem) => { setEditing(item); setDraft({ name: item.name, category: item.category || '', description: item.description || '' }); };

 const save = async () => {
  const name = draft.name.trim();
  if (!name || isDemoMode) return;
  if (editing) {
   await updateDoc(doc(db, 'taxonomies', editing.id), { name, category: draft.category, description: draft.description }).catch((e) => console.error(e));
  } else {
   await addDoc(collection(db, 'taxonomies'), { kind: activeTab, name, category: draft.category, description: draft.description }).catch((e) => console.error(e));
  }
  setEditing(null);
  setDraft({ name: '', category: '', description: '' });
 };

 const remove = (id: string) => {
  if (isDemoMode) return;
  setPendingDeleteId(id);
 };

 const editingOpen = editing !== null || draft.name !== '' || draft.category !== '' || draft.description !== '';

 return (
  <div className="max-w-6xl mx-auto space-y-8">
   <div className="flex items-center justify-between">
    <div>
     <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-stone-900">{t('Platform Taxonomies', 'Ταξινομίες πλατφόρμας')}</h1>
     <p className="text-stone-500 mt-1">{t('Manage the structured data that powers matching and discovery.', 'Διαχειρίσου τα δομημένα δεδομένα που τροφοδοτούν την αντιστοίχιση και την εξερεύνηση.')}</p>
     {isDemoMode && <p className="text-xs text-stone-500 mt-1">{t('Sample account — starter taxonomy shown read-only; edits apply to real accounts.', 'Δοκιμαστικός λογαριασμός — η αρχική ταξινόμηση εμφανίζεται μόνο για ανάγνωση.')}</p>}
    </div>
    <Button size="sm" onClick={openAdd}>
     <Plus className="w-4 h-4" />
     {t(`Add New ${KIND_LABELS[activeTab][0]}`, `Προσθήκη: ${KIND_LABELS[activeTab][1]}`)}
    </Button>
   </div>

   <div className="scroll-tabs p-1 bg-stone-100 rounded-xl">
    {(Object.keys(KIND_LABELS) as TaxonomyKind[]).map((kind) => (
     <button
      key={kind}
      onClick={() => setActiveTab(kind)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
       activeTab === kind ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
      }`}
     >
      {kind === 'skill' ? <Zap className="w-4 h-4" /> : kind === 'industry' ? <Globe className="w-4 h-4" /> : kind === 'role' ? <Briefcase className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
      {t(`${kind}s`, { skill: 'Δεξιότητες', industry: 'Κλάδοι', role: 'Ρόλοι', tag: 'Ετικέτες' }[kind])}
     </button>
    ))}
   </div>

   {editingOpen && (
    <Card className="p-5 border-stone-300">
     <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-stone-900">{editing ? t('Edit term', 'Επεξεργασία όρου') : t('New term', 'Νέος όρος')} — {KIND_LABELS[activeTab][0]}</h3>
      <button type="button" aria-label={t('Close', 'Κλείσιμο')} onClick={() => { setEditing(null); setDraft({ name: '', category: '', description: '' }); }} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400"><X className="w-4 h-4" /></button>
     </div>
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder={t('Name', 'Όνομα')} className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none" />
      <input value={draft.category} onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} placeholder={t('Category', 'Κατηγορία')} className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none" />
      <input value={draft.description} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} placeholder={t('Description', 'Περιγραφή')} className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none" />
     </div>
     <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" size="sm" onClick={() => { setEditing(null); setDraft({ name: '', category: '', description: '' }); }}>{t('Cancel', 'Ακύρωση')}</Button>
      <Button size="sm" onClick={save}>{t('Save', 'Αποθήκευση')}</Button>
     </div>
    </Card>
   )}

   <Card noPadding>
    <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-4">
     <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
       type="text"
       placeholder={t(`Search ${KIND_LABELS[activeTab][0].toLowerCase()}s...`, `Αναζήτηση: ${KIND_LABELS[activeTab][1]}...`)}
       value={searchQuery}
       onChange={e => setSearchQuery(e.target.value)}
       className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
      />
     </div>
    </div>

    <div className="overflow-x-auto">
     <table className="w-full text-left">
      <thead>
       <tr className="bg-stone-50/50 text-xs font-medium text-stone-400 tracking-wide border-b border-stone-100">
        <th className="px-4 py-2">{t('Name', 'Όνομα')}</th>
        <th className="px-4 py-2">{t('Category', 'Κατηγορία')}</th>
        <th className="px-4 py-2">{t('Description', 'Περιγραφή')}</th>
        <th className="px-4 py-2">{t('Usage Count', 'Χρήσεις')}</th>
        <th className="px-4 py-2 text-right">{t('Actions', 'Ενέργειες')}</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
       {filtered.map((item) => (
        <tr key={item.id} className="hover:bg-stone-50/50 transition-colors group">
         <td className="px-4 py-2">
          <span className="font-medium text-stone-900">{item.name}</span>
         </td>
         <td className="px-4 py-2">
          <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-medium tracking-wider">
           {item.category ? labelOf(item.category) : '—'}
          </span>
         </td>
         <td className="px-4 py-2">
          <p className="text-xs text-stone-500 line-clamp-1">{item.description}</p>
         </td>
         <td className="px-4 py-2">
          <span className="text-xs font-medium text-stone-900">
           {usage[item.id] != null ? t(`${usage[item.id]} profiles`, `${usage[item.id]} προφίλ`) : '—'}
          </span>
         </td>
         <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button type="button" title={t('Edit', 'Επεξεργασία')} onClick={() => openEdit(item)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-colors">
            <Edit2 className="w-4 h-4" />
           </button>
           <button type="button" title={t('Delete', 'Διαγραφή')} onClick={() => remove(item.id)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
           </button>
          </div>
         </td>
        </tr>
       ))}
       {!loading && filtered.length === 0 && (
        <tr>
         <td colSpan={5} className="px-8 py-12 text-center text-stone-400 italic font-medium">
          {t('No terms here yet — add one above.', 'Δεν υπάρχουν όροι ακόμη — πρόσθεσε παραπάνω.')}
         </td>
        </tr>
       )}
      </tbody>
     </table>
    </div>
   </Card>
   <ConfirmDialog
    open={pendingDeleteId !== null}
    onClose={() => setPendingDeleteId(null)}
    onConfirm={() => {
     const id = pendingDeleteId;
     setPendingDeleteId(null);
     if (id) void deleteDoc(doc(db, 'taxonomies', id)).catch((e) => console.error(e));
    }}
    title={t('Delete this taxonomy term?', 'Διαγραφή αυτού του όρου;')}
    description={t('Matching and discovery stop using it. You can add it again later.', 'Η αντιστοίχιση και η εξερεύνηση σταματούν να τον χρησιμοποιούν. Μπορείς να τον προσθέσεις ξανά αργότερα.')}
    confirmLabel={t('Delete', 'Διαγραφή')}
    variant="danger"
   />
  </div>
 );
}
