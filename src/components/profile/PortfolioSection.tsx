import { useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { useT } from '../../lib/language';
import { safeWebUrl } from '../../lib/webUrl';
import type { PortfolioItem } from '../../types';

const MAX_ITEMS = 20;

/**
 * Work a person can point to (title, role, link, image), on the same profile
 * document as the rest. A link or an image that is not http(s) never reaches a
 * page: it is refused here and again by the rules.
 */
export default function PortfolioSection({ items, editable, onChange }: {
 items: PortfolioItem[];
 editable: boolean;
 onChange: (next: PortfolioItem[]) => void;
}) {
 const t = useT();
 const [adding, setAdding] = useState(false);
 const [draft, setDraft] = useState({ title: '', role: '', url: '', imageUrl: '' });
 const [error, setError] = useState('');
 if (!editable && items.length === 0) return null;

 const add = () => {
  const title = draft.title.trim();
  if (!title) { setError(t('Give it a title', 'Δώσε έναν τίτλο')); return; }
  const url = draft.url.trim();
  const imageUrl = draft.imageUrl.trim();
  if ((url && !safeWebUrl(url)) || (imageUrl && !safeWebUrl(imageUrl))) {
   setError(t('Links must start with http:// or https://', 'Οι σύνδεσμοι πρέπει να ξεκινούν με http:// ή https://'));
   return;
  }
  onChange([...items, { id: String(Date.now()), title, role: draft.role.trim(), url, imageUrl }].slice(0, MAX_ITEMS));
  setDraft({ title: '', role: '', url: '', imageUrl: '' });
  setError('');
  setAdding(false);
 };
 const input = 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900';

 return (
  <section aria-labelledby="profile-portfolio" data-testid="profile-portfolio" className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm space-y-4">
   <div className="flex items-center justify-between gap-2">
    <h3 id="profile-portfolio" className="text-sm font-semibold text-stone-900">{t('Portfolio', 'Portfolio')}</h3>
    {editable && !adding && items.length < MAX_ITEMS && (
     <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
      <Plus className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> {t('Add work', 'Προσθήκη δουλειάς')}
     </Button>
    )}
   </div>
   {items.length === 0 && !adding && (
    <p className="text-sm text-stone-500">{t('Show what you have built: it says more than a headline.', 'Δείξε τι έχεις φτιάξει: λέει περισσότερα από έναν τίτλο.')}</p>
   )}
   {items.length > 0 && (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     {items.map((item) => {
      const link = safeWebUrl(item.url ?? '');
      const image = safeWebUrl(item.imageUrl ?? '');
      return (
       <li key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-stone-100">
        {image && <img src={image} alt="" loading="lazy" className="h-28 w-full object-cover" />}
        <div className="flex items-start justify-between gap-2 p-3">
         <div className="min-w-0">
          <p className="text-sm font-medium text-stone-900 break-words">{item.title}</p>
          {item.role && <p className="text-sm text-stone-500 break-words">{item.role}</p>}
          {link && (
           <a href={link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-stone-700 underline">
            {t('Open', 'Άνοιγμα')} <ExternalLink className="w-3 h-3" aria-hidden="true" />
           </a>
          )}
         </div>
         {editable && (
          <button type="button" aria-label={t(`Remove ${item.title}`, `Αφαίρεση: ${item.title}`)} onClick={() => onChange(items.filter((row) => row.id !== item.id))} className="rounded-lg p-1 text-stone-400 hover:bg-stone-50 hover:text-red-600 tap-area">
           <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
         )}
        </div>
       </li>
      );
     })}
    </ul>
   )}
   {adding && (
    <div className="space-y-2" data-testid="portfolio-form">
     <input className={input} aria-label={t('Title', 'Τίτλος')} placeholder={t('Title', 'Τίτλος')} value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
     <input className={input} aria-label={t('Your role', 'Ο ρόλος σου')} placeholder={t('Your role', 'Ο ρόλος σου')} value={draft.role} maxLength={120} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
     <input className={input} aria-label={t('Link', 'Σύνδεσμος')} placeholder="https://" value={draft.url} maxLength={300} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
     <input className={input} aria-label={t('Image link', 'Σύνδεσμος εικόνας')} placeholder={t('Image link (optional)', 'Σύνδεσμος εικόνας (προαιρετικά)')} value={draft.imageUrl} maxLength={300} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} />
     {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
     <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setError(''); }}>{t('Cancel', 'Άκυρο')}</Button>
      <Button type="button" size="sm" onClick={add}>{t('Add', 'Προσθήκη')}</Button>
     </div>
    </div>
   )}
  </section>
 );
}
