'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Server, PlayCircle, ExternalLink } from 'lucide-react';

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
      setStreamData(res.data);
      setSelectedEmbed(res.data?.iframe || res.data?.official || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStream(false);
    }
  }

  if (!detail) {
    return <div className="glass-card rounded-3xl p-10 text-center text-sm font-semibold">Memuat detail anime...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Tombol Kembali */}
      <Link href="/" className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:bg-white">
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
              src={selectedEmbed}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Pilih episode di bawah untuk mulai menonton
            </div>
          )}
        </div>

        {/* Info Episode Aktif & Ganti Server */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white glow-badge mr-2">
              SEDANG DIPUTAR
            </span>
            <span className="font-bold text-sm text-slate-800">
              {activeEp ? `Episode ${activeEp.episode || activeEp.title}` : detail.title}
            </span>
          </div>

          {/* Pilihan Server Embed */}
          {streamData?.servers?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-purple-600" />
              {streamData.servers.map((srv, idx) => (
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
            </div>
          )}
        </div>

        {/* Link Download Direct MP4 (Sesuai fitur scraper kamu) */}
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
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-60 overflow-y-auto pr-1">
          {episodes.map((ep) => {
            const isCurrent = activeEp?.id === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => loadEpisodeStream(ep)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition ${
                  isCurrent
                    ? 'glow-badge text-white'
                    : 'bg-white/80 text-slate-700 hover:bg-purple-100'
                }`}
              >
                Ep {ep.episode || ep.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sinopsis & Detail Anime */}
      <div className="glass-card rounded-3xl p-4 flex flex-col sm:flex-row gap-4">
        <img
          src={detail.image_cover || detail.poster}
          alt={detail.title}
          className="w-28 h-40 object-cover rounded-2xl shadow-sm shrink-0"
        />
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
    
