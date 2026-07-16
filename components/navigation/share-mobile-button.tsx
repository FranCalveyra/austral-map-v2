"use client";

import React from 'react';
import { CheckCircle2, Copy, Link2, Share2, Smartphone, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareMobileButtonProps {
  onCreateLink?: () => Promise<string>;
}

// Un QR estándar no puede contener de forma confiable una URL muy larga. El
// link completo sigue disponible para copiar/compartir sin truncarlo.
const MAX_QR_URL_LENGTH = 2_000;

export function ShareMobileButton({ onCreateLink }: ShareMobileButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [link, setLink] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generateLink = React.useCallback(async () => {
    if (!onCreateLink) return;
    setLoading(true);
    setError(null);
    try {
      const nextLink = await onCreateLink();
      setLink(nextLink);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude generar el link para el celular.');
    } finally {
      setLoading(false);
    }
  }, [onCreateLink]);

  const copyLink = async () => {
    setError(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('copy failed');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No pude copiar el link automáticamente.');
    }
  };

  const canRenderQr = link.length > 0 && link.length <= MAX_QR_URL_LENGTH;
  const isLocalLink = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\//.test(link);

  const shareLink = async () => {
    setError(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Austral Map',
          text: 'Abrí mi plan en Austral Map',
          url: link,
        });
        return;
      }
      await copyLink();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError('No pude abrir el menú de compartir. Probá copiando el link.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={generateLink}
        disabled={!onCreateLink || loading}
        className="flex items-center rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Smartphone className="mr-2 h-4 w-4" />
        {loading ? 'Generando…' : 'Pasar al celular'}
      </button>

      {error && !open ? <p className="text-xs text-red-400">{error}</p> : null}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#21262d] p-6 text-gray-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pasar tu plan al celular</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Este link incluye tu plan y tus cambios locales: estados, notas y posiciones.
                </p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar">
                <X className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-200">
                <Link2 className="h-4 w-4" />
                Link privado de este navegador
              </div>
              <textarea
                readOnly
                value={link}
                className="h-24 w-full rounded-md border border-gray-700 bg-black/30 p-2 text-xs text-gray-300"
              />
            </div>

            {canRenderQr ? (
              <div className="mt-3 flex flex-col items-center rounded-lg border border-gray-700 bg-white p-4 text-center">
                <QRCodeSVG value={link} size={192} level="L" includeMargin />
                <p className="mt-2 text-xs text-gray-600">Escaneá este QR desde el celular.</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-yellow-300">
                Este plan es demasiado grande para un QR estándar. El link completo de arriba funciona:
                copialo y abrilo directamente en Chrome, sin pasarlo por una app que lo recorte.
              </p>
            )}

            {isLocalLink ? (
              <p className="mt-2 text-xs text-yellow-300">
                Estás compartiendo una dirección local. En el celular usá una URL publicada o configurá
                <code className="mx-1">NEXT_PUBLIC_SHARE_ORIGIN</code> con una dirección accesible desde tu red.
              </p>
            ) : null}

            {link.length > 6000 ? (
              <p className="mt-2 text-xs text-yellow-300">
                El link es largo porque incluye todo el plan. Para conservarlo completo, usá Copiar link
                y pegalo directamente en Chrome, Notas, WhatsApp o AirDrop.
              </p>
            ) : null}

            {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={shareLink}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center justify-center rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
              >
                {copied ? (
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
