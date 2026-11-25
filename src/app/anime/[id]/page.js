'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Server, PlayCircle, ExternalLink, Tv } from 'lucide-react';

function formatEpisodeLabel(ep) {
  const raw = String(ep?.episode ?? ep?.title ?? '').trim();
  if (!raw) return 'Ep';
  return raw.replace(/^episode\s*/i, '').trim() || raw;
}

function isSafeIframeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Halaman resmi animeinweb.com memakai X-Frame-Options: SAMEORIGIN sehingga ditolak di iframe
    if (parsed.hostname.includes('animeinweb.com')) return false;
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function AnimeDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [activeEp, setActiveEp] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [selectedEmbed, setSelectedEmbed] = useState('');
  const [loadingStream, setLoadingStream] = useState(false);

  useEffect(() => {
    async function fetchAnime() {
      const [detRes, epRes] = await Promise.all([
        fetch(`/api/anime?action=detail&id=${id}`).then((r) => r.json()),
        fetch(`/api/anime?action=episodes&id=${id}&page=1`).then((r) => r.json())
      ]);
      if (detRes.data) setDetail(detRes.data);
      const epList = epRes.data?.episodes || [];
      setEpisodes(epList);
      if (epList.length > 0) {
        loadEpisodeStream(epList[0]);
      }
    }
    if (id) fetchAnime();
  }, [id]);

  async function loadEpisodeStream(ep) {
    setActiveEp(ep);
    setLoadingStream(true);
    try {
      const res = await fetch(`/api/anime?action=stream&id=${ep.id}`).then((r) => r.json());
      const info = res.data || {};
      setStreamData(info);

      const embedServers = (info.servers || []).filter((s) => isSafeIframeUrl(s.embed));
      if (embedServers.length > 0) {
        setSelectedEmbed(embedServers[0].embed);
      } else if (isSafeIframeUrl(info.iframe)) {
        setSelectedEmbed(info.iframe);
      } else {
        setSelectedEmbed('');
      }
    } catch (err) {
      console.error(err);
      setSelectedEmbed('');
    } finally {
      setLoadingStream(false);
    }
  }

  if (!detail) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center text-sm font-semibold">
        Memuat detail anime...
      </div>
    );
  }

  const epLabel = activeEp ? `Episode ${formatEpisodeLabel(activeEp)}` : detail.title;
  const watchExternalUrl = streamData?.official || detail.watch_url || '';
  const safeServers = (streamData?.servers || []).filter((s) => isSafeIframeUrl(s.embed));

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:bg-white"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
      </Link>

      {/* Video Player */}
      <div className="glass-card rounded-3xl overflow-hidden p-3 space-y-3">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900">
          {loadingStream ? (
            <div className="w-full h-full flex items-center justify-center text-white text-sm">
              Menyiapkan pemutar video...
            </div>
          ) : selectedEmbed ? (
            <iframe
              key={selectedEmbed}
              src={selectedEmbed}
              className="w-full h-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; encrypted-media"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-5 text-center text-white bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
              <Tv className="w-8 h-8 text-pink-400" />
              <div className="space-y-1 max-w-sm">
                <p className="text-xs font-bold text-white">
                  {detail.title} — {epLabel}
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Sumber stream episode ini memblokir pemutar di dalam frame web. Buka langsung atau unduh MP4 di bawah.
                </p>
              </div>
              {watchExternalUrl && (
                <a
                  href={watchExternalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-full glow-badge text-xs font-bold text-white inline-flex items-center gap-1.5 shadow-lg"
                >
                  Tonton di Tab Baru <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Info Episode Aktif & Ganti Server */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center flex-wrap gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white glow-badge">
              SEDANG DIPUTAR
            </span>
            <span className="font-bold text-sm text-slate-800">{epLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {safeServers.length > 0 && (
              <>
                <Server className="w-3.5 h-3.5 text-purple-600" />
                {safeServers.map((srv, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEmbed(srv.embed)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                      selectedEmbed === srv.embed
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/80 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {srv.name} ({srv.quality})
                  </button>
                ))}
              </>
            )}

            {watchExternalUrl && (
              <a
                href={watchExternalUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-pink-100 text-pink-700 hover:bg-pink-200 transition inline-flex items-center gap-1"
              >
                Sumber Asli <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Link Download Direct MP4 */}
        {streamData?.downloads?.length > 0 && (
          <div className="bg-white/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-pink-600" /> Download MP4 Langsung:
            </span>
            <div className="flex flex-wrap gap-2">
              {streamData.downloads.map((dl, idx) => (
                <a
                  key={idx}
                  href={dl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold hover:bg-pink-600 transition flex items-center gap-1"
                >
                  {dl.quality} {dl.size ? `(${dl.size})` : ''} <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Daftar Episode */}
      <div className="glass-card rounded-3xl p-4 space-y-3">
        <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-purple-600" /> Daftar Episode ({episodes.length})
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-60 overflow-y-auto pr-1">
          {episodes.map((ep) => {
            const isCurrent = activeEp?.id === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => loadEpisodeStream(ep)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition truncate ${
                  isCurrent
                    ? 'glow-badge text-white'
                    : 'bg-white/80 text-slate-700 hover:bg-purple-100'
                }`}
              >
                Ep {formatEpisodeLabel(ep)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sinopsis & Detail Anime */}
      <div className="glass-card rounded-3xl p-4 flex flex-col sm:flex-row gap-4">
        {(detail.image_cover || detail.poster) && (
          <img
            src={detail.image_cover || detail.poster}
            alt={detail.title}
            referrerPolicy="no-referrer"
            className="w-28 h-40 object-cover rounded-2xl shadow-sm shrink-0"
          />
        )}
        <div className="space-y-2">
          <h2 className="font-extrabold text-lg text-slate-800">{detail.title}</h2>
          <div className="flex flex-wrap gap-1.5">
            {detail.status && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                {detail.status}
              </span>
            )}
            {detail.type && (
              <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[11px] font-bold">
                {detail.type}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {detail.sinopsis || detail.synopsis || 'Tidak ada sinopsis.'}
          </p>
        </div>
      </div>
    </div>
  );
}
