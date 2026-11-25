'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Flame, Sparkles, Play } from 'lucide-react';

export default function HomePage() {
  const [homeData, setHomeData] = useState(null);
  const [latest, setLatest] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [homeRes, latestRes] = await Promise.all([
          fetch('/api/anime?action=home').then((r) => r.json()),
          fetch('/api/anime?action=latest&page=1').then((r) => r.json())
        ]);
        if (homeRes.data) setHomeData(homeRes.data);
        if (latestRes.data) setLatest(latestRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/anime?action=search&q=${encodeURIComponent(searchQuery)}`).then((r) => r.json());
      setSearchResults(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  const hotList =
    homeData?.hot ||
    homeData?.popular ||
    homeData?.slider ||
    homeData?.movie ||
    [];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="glass-card rounded-2xl p-2 flex items-center gap-2">
        <Search className="w-5 h-5 text-purple-500 ml-2 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value) setSearchResults(null);
          }}
          placeholder="Cari judul anime favoritmu (Naruto, One Piece)..."
          className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 py-1.5"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-purple-700 transition shrink-0"
        >
          {searching ? '...' : 'Cari'}
        </button>
      </form>

      {/* Hasil Pencarian */}
      {searchResults !== null && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-800">
              Hasil Pencarian: &ldquo;{searchQuery}&rdquo;
            </h2>
            <button
              onClick={() => { setSearchResults(null); setSearchQuery(''); }}
              className="text-xs font-semibold text-pink-600"
            >
              Tutup
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-500">
              Anime tidak ditemukan. Coba kata kunci lain.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {searchResults.map((item, idx) => (
                <AnimeCard key={`${item.id}-${idx}`} anime={item} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tampilan Utama */}
      {searchResults === null && (
        <>
          {hotList.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-pink-500" />
                <h2 className="font-extrabold text-base text-slate-800">Sedang Populer</h2>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {hotList.slice(0, 10).map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="min-w-[145px] max-w-[145px] shrink-0">
                    <AnimeCard anime={item} badge="HOT" />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="font-extrabold text-base text-slate-800">Update Anime Terbaru</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">Sub Indo</span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl h-56 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {latest.map((item, idx) => (
                  <AnimeCard key={`${item.id}-${idx}`} anime={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AnimeCard({ anime, badge }) {
  const [imgError, setImgError] = useState(false);

  const rawPoster =
    anime.image_cover ||
    anime.cover ||
    anime.poster ||
    anime.image ||
    anime.thumbnail ||
    '';

  const poster =
    typeof rawPoster === 'string' && rawPoster.trim()
      ? rawPoster.startsWith('http')
        ? rawPoster
        : `https://${rawPoster.replace(/^\/+/, '')}`
      : '';

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group glass-card rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-purple-200 via-pink-100 to-sky-200">
        {poster && !imgError ? (
          <img
            src={`/api/image?url=${encodeURIComponent(poster)}`}

            alt={anime.title || 'Anime'}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
            <span className="text-2xl font-black text-purple-600/40 mb-1">NY</span>
            <span className="text-[11px] font-bold text-slate-600 line-clamp-3">
              {anime.title}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white glow-badge">
              {badge}
            </span>
          )}
          {anime.status && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-800">
              {anime.status}
            </span>
          )}
        </div>

        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 text-purple-600 flex items-center justify-center shadow-md">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </div>
      </div>

      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <h3 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">
          {anime.title}
        </h3>
        {anime.score && (
          <span className="text-[11px] font-semibold text-purple-600 mt-1">
            ★ {anime.score}
          </span>
        )}
      </div>
    </Link>
  );
}
