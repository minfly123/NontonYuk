'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];

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

      {/* Tab Hari */}
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
        <div className="glass-card rounded-2xl p-8 text-center text-sm">Memuat jadwal {selectedDay}...</div>
      ) : (
        <div className="space-y-2.5">
          {list.map((item) => (
            <Link
              key={item.id}
              href={`/anime/${item.id}`}
              className="glass-card rounded-2xl p-3 flex items-center justify-between hover:bg-white transition"
            >
              <div className="flex items-center gap-3">
                <img
                  src={item.image_cover || item.poster}
                  alt={item.title}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-800 line-clamp-1">{item.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white glow-badge">
                    {selectedDay}
                  </span>
                </div>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm shrink-0">
                Tonton
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
        }
                    
