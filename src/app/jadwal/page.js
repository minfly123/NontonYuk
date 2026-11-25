'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

function JadwalRow({ item, day }) {
  const [imgError, setImgError] = useState(false);

  const rawPoster =
    item.image_cover ||
    item.cover ||
    item.poster ||
    item.image ||
    item.thumbnail ||
    '';

  const poster =
    typeof rawPoster === 'string' && rawPoster.trim()
      ? `/api/image?url=${encodeURIComponent(rawPoster.trim())}`
      : '';

  return (
    <Link
      href={`/anime/${item.id}`}
      className="glass-card rounded-2xl p-3 flex items-center justify-between hover:bg-white transition"
    >
      <div className="flex items-center gap-3 min-w-0">
        {poster && !imgError ? (
          <img
            src={poster}
            alt={item.title || 'Anime'}
            onError={() => setImgError(true)}
            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm shrink-0 bg-purple-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm shrink-0 bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center text-xs font-extrabold text-purple-700">
            NY
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-bold text-sm text-slate-800 truncate">{item.title}</h3>
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white glow-badge">
            {day}
          </span>
        </div>
      </div>
      <span className="px-3.5 py-1.5 rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm shrink-0 ml-2">
        Tonton
      </span>
    </Link>
  );
}

export default function JadwalPage() {
  const [selectedDay, setSelectedDay] = useState('SENIN');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/anime?action=schedule&day=${selectedDay}`)
      .then((r) => r.json())
      .then((res) => setList(res.data?.movie || []))
      .finally(() => setLoading(false));
  }, [selectedDay]);

  return (
    <div className="space-y-4">
      <h2 className="font-extrabold text-lg text-slate-800">Jadwal Rilis Anime</h2>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition shrink-0 ${
              selectedDay === day
                ? 'glow-badge text-white'
                : 'glass-card text-slate-700 hover:bg-white'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm">
          Memuat jadwal {selectedDay}...
        </div>
      ) : list.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-500">
          Tidak ada jadwal rilis untuk hari {selectedDay}.
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((item, idx) => (
            <JadwalRow key={`${item.id}-${idx}`} item={item} day={selectedDay} />
          ))}
        </div>
      )}
    </div>
  );
}
