const API = 'https://xyz-api.animein.net';
const WEB = 'https://animeinweb.com';
const TIMEOUT = 30000;
const PAGE_SIZE = 60;
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

export async function getHomepage() {
  return await api('/data/home/list');
}

export async function getSchedule(day) {
  const selected = String(day || DAYS[new Date().getDay()]).toUpperCase();
  const data = await api('/3/2/schedule/data', { day: selected });
  return { day: selected, movie: data?.movie ?? [] };
}

export async function searchAnime(query, page = 1) {
  const current = asPage(page);
  const data = await api('/3/2/explore/movie', {
    page: current - 1,
    sort: 'latest',
    keyword: String(query ?? '').trim()
  });
  return data?.movie ?? [];
}

export async function getAnimeDetail(id) {
  const movieId = asId(id);
  const data = await api(`/3/2/movie/detail/${encodeURIComponent(movieId)}`);
  return {
    ...(data ?? {}),
    watch_url: `${WEB}/anime/${movieId}`
  };
}

export async function getAnimeEpisodes(id, page = 1) {
  const movieId = asId(id);
  const current = asPage(page);
  const data = await api(`/3/2/movie/episode/${encodeURIComponent(movieId)}`, {
    page: current - 1
  });
  return {
    episodes: data?.episode ?? [],
    has_next: (data?.episode ?? []).length >= EPISODE_PAGE_SIZE
  };
}

export async function getLatestAnime(page = 1) {
  const current = asPage(page);
  const data = await api('/3/2/explore/movie', {
    page: current - 1,
    sort: 'latest'
  });
  return data?.movie ?? [];
}

export async function getStreamData(episodeId) {
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
