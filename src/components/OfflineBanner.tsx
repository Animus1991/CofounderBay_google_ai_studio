/**
 * Connectivity indicator — shows a subtle, non-blocking pill when the browser
 * goes offline and a brief confirmation when connectivity is restored.
 */
import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [showRestored, setShowRestored] = useState(false);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShowRestored(true);
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
      restoreTimer.current = setTimeout(() => setShowRestored(false), 3000);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (restoreTimer.current) clearTimeout(restoreTimer.current);
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide shadow-lg backdrop-blur-sm transition-colors ${
        online ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-white'
      }`}
    >
      {online ? (
        <>
          <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
          Back online
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          You are offline — changes may not be saved
        </>
      )}
    </div>
  );
}
