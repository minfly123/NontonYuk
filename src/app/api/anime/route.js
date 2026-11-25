import { NextResponse } from 'next/server';

const API = 'https://xyz-api.animein.net';
const WEB = 'https://animeinweb.com';
const TIMEOUT = 30000;
const EPISODE_PAGE_SIZE = 30;

const AUTH = {
  id_user: '0',
  key_client: 'guest',
  apk_ver: '5.2.2'
};

const HEADERS = {
  'User-Agent': 'okhttp/4.12.0',
  apk_ver: '5.2.2',
  Accept: 'application/json'
};

const DAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const asPage = (value) => Math.max(1, Number(value) || 1);
const asId = (value) => String(value ?? '').trim();
const qualityRank = (value) => Number(String(value ?? '').replace(/\D/g, '')) || 0;

function apiUrl(path, params = {}) {
  const url = new URL(path, API);
  for (const [key, value] of Object.entries({ ...AUTH, ...params })) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function api(path, params = {}) {
  const res = await fetch(apiUrl(path, params), {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT),
    cache: 'no-store'
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON response (HTTP ${res.status}).`);
  }

  if (!res.ok || !body || body.error || (body.status && body.status !== 200)) {
    throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  }

  return body.data;
}

async function getHomepage() {
  return await api('/data/home/list');
}

async function getSchedule(day) {
  const selected = String(day || DAYS[new Date().getDay()]).toUpperCase();
  const data = await api('/3/2/schedule/data', { day: selected });
  return { day: selected, movie: data?.movie ?? [] };
}

async function searchAnime(query, page = 1) {
  const current = asPage(page);
  const data = await api('/3/2/explore/movie', {
    page: current - 1,
    sort: 'latest',
    keyword: String(query ?? '').trim()
  });
  return data?.movie ?? [];
}

async function getAnimeDetail(id) {
  const movieId = asId(id);
  const data = await api(`/3/2/movie/detail/${encodeURIComponent(movieId)}`);
  return {
    ...(data ?? {}),
    watch_url: `${WEB}/anime/${movieId}`
  };
}

async function getAnimeEpisodes(id, page = 1, all = false) {
  const movieId = asId(id);

  if (!all) {
    const current = asPage(page);
    const data = await api(`/3/2/movie/episode/${encodeURIComponent(movieId)}`, {
      page: current - 1
    });
    const list = data?.episode ?? [];
    return {
      episodes: list,
      page: current,
      has_next: list.length >= EPISODE_PAGE_SIZE
    };
  }

  const collected = [];
  const seenIds = new Set();

  for (let p = 0; p < 25; p++) {
    const data = await api(`/3/2/movie/episode/${encodeURIComponent(movieId)}`, {
      page: p
    });
    const batch = data?.episode ?? [];
    if (!Array.isArray(batch) || batch.length === 0) break;

    let added = 0;
    for (const ep of batch) {
      const key = String(ep?.id ?? `${ep?.episode ?? ''}-${ep?.title ?? ''}`);
      if (!seenIds.has(key)) {
        seenIds.add(key);
        collected.push(ep);
        added++;
      }
    }

    if (batch.length < EPISODE_PAGE_SIZE || added === 0) break;
  }

  return {
    episodes: collected,
    page: 1,
    has_next: false,
    loaded_all: true
  };
}

async function getLatestAnime(page = 1) {
  const current = asPage(page);
  const data = await api('/3/2/explore/movie', {
    page: current - 1,
    sort: 'latest'
  });
  return data?.movie ?? [];
}

async function getStreamData(episodeId) {
  const id = asId(episodeId);
  const data = await api(`/3/2/episode/streamnew/${encodeURIComponent(id)}`);
  const episode = data?.episode;

  if (!episode) {
    return { episode: null, next_episode: null, iframe: null, servers: [], downloads: [] };
  }

  const official = `${WEB}/anime/${episode.id_movie}?ep=${episode.id}`;
  const servers = (data.server ?? [])
    .map((server) => ({
      name: server.name ?? 'Server',
      quality: server.quality ?? 'Auto',
      type: server.type ?? null,
      embed: server.type === 'semi' && server.link ? server.link : null
    }))
    .filter((s) => s.embed)
    .sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));

  const downloads = (data.server ?? [])
    .filter((server) => server.type === 'direct' && server.link)
    .map((server) => ({
      name: server.name ?? 'Direct MP4',
      quality: server.quality ?? 'HD',
      url: server.link,
      size: server.key_file_size ?? ''
    }))
    .sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));

  const iframe = servers[0]?.embed ?? official;

  return {
    episode,
    next_episode: data.episode_next ?? null,
    official,
    iframe,
    servers,
    downloads
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'home';
  const query = searchParams.get('q') || '';
  const id = searchParams.get('id') || '';
  const page = searchParams.get('page') || 1;
  const day = searchParams.get('day') || '';

  try {
    let data;
    switch (action) {
      case 'home':
        data = await getHomepage();
        break;
      case 'latest':
        data = await getLatestAnime(page);
        break;
      case 'search':
        data = await searchAnime(query, page);
        break;
      case 'schedule':
        data = await getSchedule(day);
        break;
      case 'detail':
        data = await getAnimeDetail(id);
        break;
      case 'episodes': {
        const all = searchParams.get('all') === '1' || searchParams.get('all') === 'true';
        data = await getAnimeEpisodes(id, page, all);
        break;
      }
      case 'stream':
        data = await getStreamData(id);
        break;
      default:
        return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
    }
    return NextResponse.json({ status: 200, data });
  } catch (error) {
    return NextResponse.json(
      { status: 500, error: error.message || 'Gagal mengambil data dari server' },
      { status: 500 }
    );
  }
    }
    
