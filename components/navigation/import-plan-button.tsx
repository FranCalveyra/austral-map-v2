"use client";

import React from 'react';
import {
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  GripVertical,
  Sparkles,
  X,
} from 'lucide-react';
import { HarvestedPlan } from '@/types/curriculum';
import { parseHarvestedText } from '@/lib/plan-import';
import { buildBookmarkletHref } from '@/lib/siu-bookmarklet';

interface ImportPlanButtonProps {
  onImport: (plan: HarvestedPlan) => void;
}

const BOOKMARKLET_NAME = 'Austral Map';
const BOOKMARKLET_LABEL = 'Austral Map — Importar SIU';

export function ImportPlanButton({ onImport }: ImportPlanButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [origin, setOrigin] = React.useState('');
  const [pasteValue, setPasteValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const bookmarkletRef = React.useRef<HTMLAnchorElement>(null);
  const bookmarkletHref = React.useMemo(
    () => (origin ? buildBookmarkletHref(origin) : '#'),
    [origin]
  );

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // React sanea las URLs `javascript:` en href, así que lo seteamos por DOM.
  React.useEffect(() => {
    if (open && origin && bookmarkletRef.current) {
      bookmarkletRef.current.setAttribute('href', bookmarkletHref);
      bookmarkletRef.current.setAttribute('title', BOOKMARKLET_NAME);
    }
  }, [bookmarkletHref, open, origin]);

  const handlePaste = () => {
    setError(null);
    try {
      const plan = parseHarvestedText(pasteValue);
      onImport(plan);
      setOpen(false);
      setPasteValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON inválido');
    }
  };

  const handleCopyBookmarklet = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(bookmarkletHref);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No pude copiar automáticamente. Copiá el link del botón verde manualmente.');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Importar mi plan</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#21262d] p-6 text-gray-100 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Importar tu plan desde SIU</h2>
              <button onClick={() => setOpen(false)} aria-label="Cerrar">
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Paso 1: bookmarklet */}
            <ol className="space-y-3 text-sm text-gray-300">
              <li>
                <span className="font-semibold text-white">1.</span> Arrastrá este botón a tu
                barra de favoritos (una sola vez):
                <div className="mt-2">
                  <a
                    ref={bookmarkletRef}
                    onClick={(e) => e.preventDefault()}
                    draggable
                    className="group inline-flex w-full items-center gap-3 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-left text-white shadow-lg shadow-emerald-950/30 transition-all hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-900/40 active:cursor-grabbing sm:w-auto"
                    aria-label={`Arrastrar ${BOOKMARKLET_LABEL} a la barra de favoritos`}
                    title={BOOKMARKLET_NAME}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-white/40">
                      <img src="/assets/austral-logo.png" alt="" className="h-6 w-6 rounded-sm" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-sm font-bold leading-tight">
                        {BOOKMARKLET_LABEL}
                        <Sparkles className="h-3.5 w-3.5 opacity-80" />
                      </span>
                    </span>
                    <GripVertical className="ml-auto h-5 w-5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" />
                  </a>
                  <p className="mt-1 text-xs text-emerald-100/80">
                    Arrastrame a favoritos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBookmarklet}
                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-xs text-gray-200 hover:bg-gray-700"
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar código del favorito'}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  Si arrastrarlo no funciona, tocá “Copiar código del favorito”, creá un favorito manual y pegá ese código como URL.
                  Si el navegador le deja un ícono genérico, no pasa nada: el favorito funciona igual.
                </p>
              </li>
              <li>
                <span className="font-semibold text-white">2.</span> Entrá a SIU Guaraní →
                <em> Reportes → Plan de estudios</em>.
              </li>
              <li>
                <span className="font-semibold text-white">3.</span> Hacé click en el favorito.
                Se carga tu plan solo y volvés acá con todo listo.
              </li>
            </ol>

            {/* Fallback: pegar JSON */}
            <details className="mt-5">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                ¿Preferís pegar el JSON a mano?
              </summary>
              <div className="mt-3">
                <textarea
                  value={pasteValue}
                  onChange={(e) => setPasteValue(e.target.value)}
                  placeholder="Pegá acá el JSON del harvester…"
                  className="w-full h-32 rounded-md border border-gray-600 bg-gray-900 p-2 text-xs font-mono text-gray-200"
                />
                {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
                <button
                  onClick={handlePaste}
                  disabled={!pasteValue.trim()}
                  className="mt-2 flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 text-sm"
                >
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                  Cargar plan
                </button>
              </div>
            </details>
          </div>
        </div>
      )}
    </>
  );
}
