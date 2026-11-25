'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Flame,
  Clapperboard,
  Play,
  PlayCircle,
  ArrowLeft,
  Star,
  RefreshCw,
} from 'lucide-react';

const MELOLO_REFERER = 'https://melolo.com/';

function proxyImg(url) {
  if (!url) return '';
  return `/api/image?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(MELOLO_REFERER)}`;
}

function proxyVideo(url) {
  if (!url) return '';
  return `/api/video?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(MELOLO_REFERER)}`;
}

export default function DracinPage() {
  const [sections, setSections] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genreItems, setGenreItems] = useState([]);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const [activeDrama, setActiveDrama] = useState(null);
  const [activeEpNum, setActiveEpNum] = useState(1);
  const [streamInfo, setStreamInfo] = useState(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function initMelolo() {
      setLoading(true);
      setErrorMsg('');
      try {
        const [homeRes, trendRes] = await Promise.all([
          fetch('/api/melolo?action=home&limit=10').then(async (r) => {
            const json = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
            return json;
          }),
          fetch('/api/melolo?action=trending&limit=10').then(async (r) => {
            const json = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
            return json;
          }),
        ]);

        const homeArr = Array.isArray(homeRes.data) ? homeRes.data : [];
        const trendArr = Array.isArray(trendRes.data) ? trendRes.data : [];

        const genreBlock = homeArr.find((b) => b.type === 'genres');
        setGenres(genreBlock?.items || []);

        const contentSections = [
          ...trendArr.map((s) => ({ ...s, badge: 'TRENDING' })),
          ...homeArr.filter((b) => b.type !== 'genres'),
        ];
        setSections(contentSections);
      } catch (err) {
        setErrorMsg(err?.message || 'Gagal memuat katalog Melolo');
      } finally {
        setLoading(false);
      }
    }

    initMelolo();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `/api/melolo?action=search&q=${encodeURIComponent(query.trim())}&limit=18`
      ).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        return json;
      });
      setSearchResults(res.data?.items || []);
    } catch (err) {
      setErrorMsg(err?.message || 'Pencarian gagal');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectGenre(slug) {
    if (selectedGenre === slug) {
      setSelectedGenre('');
      setGenreItems([]);
      return;
    }
    setSelectedGenre(slug);
    setSearchResults(null);
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `/api/melolo?action=category&genre=${encodeURIComponent(slug)}&page=1&limit=18`
      ).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        return json;
      });
      setGenreItems(res.data?.items || []);
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal memuat genre');
    } finally {
      setLoading(false);
    }
  }

  async function openDrama(slug, ep = 1) {
    setLoadingDetail(true);
    setVideoFailed(false);
    setActiveEpNum(ep);
    try {
      const res = await fetch(
        `/api/melolo?action=detail&slug=${encodeURIComponent(slug)}&episode=${ep}`
      ).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        return json;
      });
      if (res.data) {
        setActiveDrama(res.data);
        setStreamInfo(res.data.stream || null);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal membuka detail drama');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function selectEpisode(epNumber) {
    if (!activeDrama?.series_slug) return;
    setActiveEpNum(epNumber);
    setVideoFailed(false);
    try {
      const res = await fetch(
        `/api/melolo?action=stream&slug=${encodeURIComponent(activeDrama.series_slug)}&episode=${epNumber}`
      ).then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
        return json;
      });
      if (res.data) {
        setStreamInfo(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (activeDrama) {
    const rawStreamUrl = streamInfo?.stream_url || '';
    const playableSrc = rawStreamUrl ? proxyVideo(rawStreamUrl) : '';
    const episodes = activeDrama.episodes || [];

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setActiveDrama(null);
              setStreamInfo(null);
            }}
            className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog Dracin
          </button>

          <button
            onClick={() => selectEpisode(activeEpNum)}
            className="inline-flex items-center gap-1.5 glass-card px-3.5 py-2 rounded-full text-xs font-bold text-purple-700 hover:bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Link Stream
          </button>
        </div>

        <div className="glass-card rounded-3xl overflow-hidden p-3 space-y-3">
          <div className="relative aspect-[9/16] max-h-[520px] mx-auto w-full max-w-[320px] rounded-2xl overflow-hidden bg-black">
            {loadingDetail ? (
              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                Memuat episode...
              </div>
            ) : playableSrc && !videoFailed ? (
              <video
                key={`${playableSrc}-${activeEpNum}`}
                src={playableSrc}
                controls
                playsInline
                autoPlay
                preload="metadata"
                onError={() => setVideoFailed(true)}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-white text-xs space-y-2">
                <p className="font-bold">Stream Episode {activeEpNum} belum tersedia</p>
                <p className="text-[11px] text-slate-300">
                  Klik Refresh Link Stream atau pilih episode lain.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white glow-badge">
                MELOLO MP4
              </span>
              <span className="font-bold text-sm text-slate-800">
                {activeDrama.title} — Ep {activeEpNum}
              </span>
            </div>
            {streamInfo?.expires_in != null && (
              <span className="text-[11px] font-semibold text-purple-700">
                Link valid ~{streamInfo.expires_in}d
              </span>
            )}
          </div>
        </div>

        {episodes.length > 0 && (
          <div className="glass-card rounded-3xl p-4 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-purple-600" /> Daftar Episode ({episodes.length})
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-60 overflow-y-auto pr-1">
              {episodes.map((ep) => {
                const epNo = ep.episode_number ?? ep.episode_id;
                const active = Number(epNo) === Number(activeEpNum);
                return (
                  <button
                    key={ep.episode_id}
                    onClick={() => selectEpisode(epNo)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition ${
                      active
                        ? 'glow-badge text-white'
                        : 'bg-white/80 text-slate-700 hover:bg-purple-100'
                    }`}
                  >
                    Ep {epNo}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="glass-card rounded-3xl p-4 flex flex-col sm:flex-row gap-4">
          {activeDrama.cover && (
            <img
              src={proxyImg(activeDrama.cover)}
              alt={activeDrama.title}
              className="w-24 h-36 object-cover rounded-2xl shrink-0"
            />
          )}
          <div className="space-y-2">
            <h2 className="font-extrabold text-base text-slate-800">{activeDrama.title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeDrama.description || activeDrama.short_description || 'Tidak ada deskripsi.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-pink-500" />
          <h2 className="font-extrabold text-lg text-slate-800">Dracin (Melolo)</h2>
        </div>
        <span className="text-xs font-semibold text-purple-700">Short Drama Sub Indo</span>
      </div>

      <form onSubmit={handleSearch} className="glass-card rounded-2xl p-2 flex items-center gap-2">
        <Search className="w-5 h-5 text-purple-500 ml-2 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value) setSearchResults(null);
          }}
          placeholder="Cari judul dracin di Melolo (mis. CEO, balas dendam)..."
          className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 py-1.5"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-purple-700 transition shrink-0"
        >
          Cari
        </button>
      </form>

      {genres.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {genres.slice(0, 15).map((g) => (
            <button
              key={g.slug}
              onClick={() => handleSelectGenre(g.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
                selectedGenre === g.slug
                  ? 'glow-badge text-white'
                  : 'glass-card text-slate-700 hover:bg-white'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="glass-card rounded-2xl p-4 text-xs font-semibold text-pink-700">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl h-56 animate-pulse" />
          ))}
        </div>
      ) : searchResults !== null ? (
        <section className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800">
            Hasil Pencarian: &ldquo;{query}&rdquo; ({searchResults.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {searchResults.map((item) => (
              <DramaCard
                key={item.series_slug}
                item={item}
                onSelect={() => openDrama(item.series_slug, 1)}
              />
            ))}
          </div>
        </section>
      ) : selectedGenre ? (
        <section className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase">Genre: {selectedGenre}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {genreItems.map((item) => (
              <DramaCard
                key={item.series_slug}
                item={item}
                onSelect={() => openDrama(item.series_slug, 1)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {sections.map((sec, sIdx) => (
            <section key={`${sec.title}-${sIdx}`} className="space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-500" />
                <h3 className="font-extrabold text-base text-slate-800">{sec.title}</h3>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {(sec.items || []).map((item) => (
                  <div key={item.series_slug} className="min-w-[145px] max-w-[145px] shrink-0">
                    <DramaCard
                      item={item}
                      badge={sec.badge}
                      onSelect={() => openDrama(item.series_slug, 1)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DramaCard({ item, badge, onSelect }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group glass-card rounded-2xl overflow-hidden flex flex-col text-left transition-transform duration-200 hover:-translate-y-1 w-full"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-purple-200 via-pink-100 to-sky-200">
        {item.cover && !imgErr ? (
          <img
            src={proxyImg(item.cover)}
            alt={item.title || 'Dracin'}
            loading="lazy"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
            <span className="text-xl font-black text-purple-600/40 mb-1">NY</span>
            <span className="text-[11px] font-bold text-slate-600 line-clamp-3">{item.title}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />

        {badge && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white glow-badge">
            {badge}
          </span>
        )}

        {item.rating && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/65 text-amber-300 text-[10px] font-bold inline-flex items-center gap-0.5">
            <Star className="w-2.5 h-2.5 fill-current" /> {item.rating}
          </span>
        )}

        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 text-purple-600 flex items-center justify-center shadow-md">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </div>
      </div>

      <div className="p-2.5 flex-1 flex flex-col justify-between w-full">
        <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">{item.title}</h4>
        {item.episode_count && (
          <span className="text-[11px] font-semibold text-purple-600 mt-1">
            {item.episode_count} Episode
          </span>
        )}
      </div>
    </button>
  );
}
