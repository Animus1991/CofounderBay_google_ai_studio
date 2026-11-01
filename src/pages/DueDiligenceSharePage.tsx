import { useEffect, useRef, useState } from 'react';
import { useT } from '../lib/language';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Download, FileText, Loader2 } from 'lucide-react';
import { DD_CATEGORIES, DD_STATUS_LABEL, fetchPublicDD, type DDPublic } from '../lib/dueDiligence';

/** Public, read-only due-diligence status an investor opens from a share link. */
export default function DueDiligenceSharePage() {
  const t = useT();  const { token = '' } = useParams();
  const [data, setData] = useState<DDPublic | null>(null);
  const [missing, setMissing] = useState(false);
  const fetched = useRef('');

  useEffect(() => {
    // One fetch per token — each fetch counts a view, and StrictMode runs effects twice in development.
    if (fetched.current === token) return;
    fetched.current = token;
    fetchPublicDD(token).then(setData).catch(() => setMissing(true));
  }, [token]);

  if (missing) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-50 p-6" data-testid="dd-public-missing">
        <div className="max-w-sm space-y-2 text-center">
          <h1 className="text-lg font-semibold text-stone-900">{t('This link is no longer available', 'Ο σύνδεσμος δεν είναι πλέον διαθέσιμος')}</h1>
          <p className="text-sm text-stone-500">{t('The founder may have revoked it. Ask them for a fresh link.', 'Ο ιδρυτής μπορεί να τον ανάκλησε. Ζήτα του νέο σύνδεσμο.')}</p>
        </div>
      </main>
    );
  }
  if (!data) {
    return <main className="flex min-h-dvh items-center justify-center bg-stone-50"><Loader2 className="h-5 w-5 animate-spin text-stone-400" /></main>;
  }

  const done = data.items.filter((item) => item.status === 'done').length;
  const pct = data.items.length ? Math.round((done / data.items.length) * 100) : 0;

  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-10" data-testid="dd-public-page">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Due diligence status · CoFounderBay</p>
          <h1 className="text-3xl font-semibold text-stone-900" data-testid="dd-public-venture">{data.ventureName || 'Startup'}</h1>
          {data.investorName && <p className="text-sm text-stone-500" data-testid="dd-public-investor">Prepared for {data.investorName}</p>}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-stone-900" data-testid="dd-public-progress">{done}/{data.items.length} ready</span>
          </div>
          <p className="text-xs text-stone-400">Updated {new Date(data.updatedAt).toLocaleString()}</p>
        </header>

        {DD_CATEGORIES.map((category) => {
          const rows = data.items.filter((item) => item.category === category.id);
          if (!rows.length) return null;
          return (
            <section key={category.id} className="rounded-xl border border-stone-200 bg-white">
              <h2 className="border-b border-stone-100 px-4 py-2.5 text-xs font-semibold text-stone-700">{category.en}</h2>
              <ul className="divide-y divide-stone-100">
                {rows.map((item, index) => (
                  <li key={`${item.title}-${index}`} className="flex items-start gap-3 px-4 py-3">
                    {item.status === 'done' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : item.status === 'in_progress' ? <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-stone-900">{item.title}</p>
                      {item.note && <p className="text-xs text-stone-500">{item.note}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-stone-500">{DD_STATUS_LABEL[item.status].en}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {data.files && data.files.length > 0 && (
          <section className="rounded-xl border border-stone-200 bg-white" data-testid="dd-public-files">
            <h2 className="border-b border-stone-100 px-4 py-2.5 text-xs font-semibold text-stone-700">Documents</h2>
            <ul className="divide-y divide-stone-100">
              {data.files.map((file) => (
                <li key={file.name} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="h-4 w-4 shrink-0 text-stone-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-stone-900">{file.name}</span>
                  <span className="text-xs text-stone-400">{file.size}</span>
                  <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-900" data-testid={`dd-public-file-${file.name.replace(/[^a-z0-9]/gi, '-')}`}>
                    <Download className="h-3.5 w-3.5" />Download
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-center text-xs text-stone-400">Read-only snapshot shared by the founder.</p>
      </div>
    </main>
  );
}
