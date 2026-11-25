'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  PlayCircle,
  ExternalLink,
  Film,
  ArrowUpDown,
  ListPlus,
  Search
} from 'lucide-react';

function formatEpisodeLabel(ep) {
  const raw = String(ep?.episode ?? ep?.title ?? '').trim();
  if (!raw) return 'Ep';
  return raw.replace(/^episode\s*/i, '').trim() || raw;
}

function episodeNumber(ep) {
  const label = formatEpisodeLabel(ep);
  const match = label.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : Number.MAX_SAFE_INTEGER;
}

function isSafeIframeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
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
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingAllEp, setLoadingAllEp] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [epFilter, setEpFilter] = useState('');

  const [activeEp, setActiveEp] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [videoSrc, setVideoSrc] = useState('');
  const [embedSrc, setEmbedSrc] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);
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
      setHasNextPage(Boolean(epRes.data?.has_next));
      if (epList.length > 0) {
        loadEpisodeStream(epList[0]);
      }
    }
    if (id) fetchAnime();
  }, [id]);

  async function handleLoadAllEpisodes() {
    if (!id || loadingAllEp) return;
    setLoadingAllEp(true);
    try {
      const res = await fetch(`/api/anime?action=episodes&id=${id}&all=1`).then((r) => r.json());
      const allList = res.data?.episodes || [];
      if (allList.length > 0) {
        setEpisodes(allList);
      }
      setHasNextPage(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAllEp(false);
    }
  }

  function selectDirectDownload(dl) {
    if (!dl?.url) return;
    setVideoFailed(false);
    setSelectedQuality(dl.quality || 'MP4');
    setVideoSrc(`/api/video?url=${encodeURIComponent(dl.url)}`);
    setEmbedSrc('');
  }

  async function loadEpisodeStream(ep) {
    setActiveEp(ep);
    setLoadingStream(true);
    setVideoFailed(false);
    setVideoSrc('');
    setEmbedSrc('');

    try {
      const res = await fetch(`/api/anime?action=stream&id=${ep.id}`).then((r) => r.json());
      const info = res.data || {};
      setStreamData(info);

      const downloads = info.downloads || [];
      const safeEmbeds = (info.servers || []).filter((s) => isSafeIframeUrl(s.embed));

      if (downloads.length > 0) {
        selectDirectDownload(downloads[0]);
      } else if (safeEmbeds.length > 0) {
        setEmbedSrc(safeEmbeds[0].embed);
      } else if (isSafeIframeUrl(info.iframe)) {
        setEmbedSrc(info.iframe);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStream(false);
    }
  }

  const visibleEpisodes = useMemo(() => {
    const query = epFilter.trim().toLowerCase();
    let list = [...episodes];

    if (sortAsc) {
      list.sort((a, b) => episodeNumber(a) - episodeNumber(b));
    }

    if (query) {
      list = list.filter((ep) => {
        const label = formatEpisodeLabel(ep).toLowerCase();
        const title = String(ep?.title ?? '').toLowerCase();
        return label === query || label.includes(query) || title.includes(query);
      });
    }

    return list;
  }, [episodes, sortAsc, epFilter]);

  if (!detail) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center text-sm font-semibold">
        Memuat detail anime...
      </div>
    );
  }

  const epLabel = activeEp ? `Episode ${formatEpisodeLabel(activeEp)}` : detail.title;
  const downloads = streamData?.downloads || [];

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
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black">
          {loadingStream ? (
            <div className="w-full h-full flex items-center justify-center text-white text-sm">
              Menyiapkan pemutar video...
            </div>
          ) : videoSrc && !videoFailed ? (
            <video
              key={videoSrc}
              src={videoSrc}
              controls
              playsInline
              autoPlay
              preload="metadata"
              onError={() => setVideoFailed(true)}
              className="w-full h-full object-contain bg-black"
            />
          ) : embedSrc ? (
            <iframe
              key={embedSrc}
              src={embedSrc}
              className="w-full h-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; encrypted-media"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-5 text-center text-white bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
              <Film className="w-8 h-8 text-pink-400" />
              <div className="space-y-1 max-w-sm">
                <p className="text-xs font-bold text-white">
                  {detail.title} — {epLabel}
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {videoFailed
                    ? 'Stream proxy terblokir oleh server sumber pada resolusi ini. Coba ganti kualitas di bawah atau unduh MP4.'
                    : 'Tidak ada stream yang bisa diputar di player bawaan untuk episode ini.'}
                </p>
              </div>
              {downloads[0]?.url && (
                <a
                  href={downloads[0].url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-full glow-badge text-xs font-bold text-white inline-flex items-center gap-1.5"
                >
                  Buka File MP4 <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Info Episode Aktif & Ganti Kualitas di Player */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center flex-wrap gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white glow-badge">
              SEDANG DIPUTAR
            </span>
            <span className="font-bold text-sm text-slate-800">{epLabel}</span>
            {selectedQuality && (
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold">
                {selectedQuality}
              </span>
            )}
          </div>

          {downloads.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {downloads.map((dl, idx) => (
                <button
                  key={idx}
                  onClick={() => selectDirectDownload(dl)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                    selectedQuality === (dl.quality || 'MP4') && videoSrc.includes(encodeURIComponent(dl.url))
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/80 text-slate-700 hover:bg-white'
                  }`}
                >
                  Putar {dl.quality || 'MP4'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Link Download Direct MP4 */}
        {downloads.length > 0 && (
          <div className="bg-white/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-pink-600" /> Unduh File MP4:
            </span>
            <div className="flex flex-wrap gap-2">
              {downloads.map((dl, idx) => (
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-purple-600" /> Daftar Episode ({episodes.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cari Nomor Episode */}
            <div className="flex items-center gap-1.5 bg-white/80 rounded-xl px-2.5 py-1 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={epFilter}
                onChange={(e) => setEpFilter(e.target.value)}
                placeholder="Ep (mis. 1)"
                className="w-20 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              />
            </div>

            {/* Balik Urutan Ep 1 <-> Terbaru */}
            <button
              onClick={() => setSortAsc((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 transition"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-600" />
              {sortAsc ? 'Ep 1 → Akhir' : 'Terbaru → Ep 1'}
            </button>

            {/* Tombol Muat Semua Episode */}
            {hasNextPage && (
              <button
                onClick={handleLoadAllEpisodes}
                disabled={loadingAllEp}
                className="px-3 py-1.5 rounded-xl glow-badge text-white text-[11px] font-bold inline-flex items-center gap-1 transition disabled:opacity-60"
              >
                <ListPlus className="w-3.5 h-3.5" />
                {loadingAllEp ? 'Memuat...' : 'Muat Semua Ep'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto pr-1">
          {visibleEpisodes.map((ep, idx) => {
            const isCurrent = activeEp?.id === ep.id;
            return (
              <button
                key={`${ep.id}-${idx}`}
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
            src={`/api/image?url=${encodeURIComponent(detail.image_cover || detail.poster)}`}
            alt={detail.title}
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
