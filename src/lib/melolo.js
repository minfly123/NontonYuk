import * as cheerio from 'cheerio';

const BASE = 'https://melolo.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DEFAULT_LANG = 'id';
const SIGN_TTL_SECONDS = 300;

const WEB_STREAM = {
  quality: {
    label: '720p',
    width: 720,
    height: 1280,
    codec: 'avc1.640028',
    container: 'mp4',
    source: 'melolo-web',
  },
  audio: [
    {
      codec: 'aac',
      profile: 'LC',
      channels: 2,
      sample_rate: 44100,
      language: 'und',
    },
  ],
  subtitles: [],
  subtitle_note:
    'Melolo web streams use burned-in subtitles. No separate subtitle track is exposed by the public web API.',
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const localePath = (lang, pathname) => `${lang === 'en' ? '' : `/${lang}`}${pathname}`;
const pageUrl = (lang, pathname) => `${BASE}${localePath(lang, pathname)}`;
const seriesUrl = (lang, slug) => pageUrl(lang, `/dramas/${slug}`);
const apiUrl = (lang, slug, episode = 1) =>
  `${BASE}/api/series/getSeriesBySlug?language=${encodeURIComponent(lang)}&series_slug=${encodeURIComponent(slug)}&pageType=play&episode_id=${episode}`;

async function request(url, options = {}) {
  const { json = false, timeout = 25000, retries = 1 } = options;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: json ? 'application/json' : 'text/html,application/xhtml+xml',
        Referer: `${BASE}/`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeout),
    });

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      throw err;
    }

    return json ? await res.json() : await res.text();
  } catch (err) {
    const retryable = !err.status || err.status === 429 || err.status >= 500;
    if (retries > 0 && retryable) {
      await delay(err.status === 429 ? 1500 : 600);
      return request(url, { ...options, retries: retries - 1 });
    }
    throw err;
  }
}

function signInfo(url) {
  try {
    const sign = new URL(url).searchParams.get('sign');
    if (!sign) {
      return { signed: false, issued_at: null, expires_at: null, expires_in: null, ttl_seconds: null };
    }

    const issued = Number(sign.split('-')[0]);
    if (!issued) {
      return { signed: true, issued_at: null, expires_at: null, expires_in: null, ttl_seconds: null };
    }

    const expires = issued + SIGN_TTL_SECONDS;
    return {
      signed: true,
      issued_at: new Date(issued * 1000).toISOString(),
      expires_at: new Date(expires * 1000).toISOString(),
      expires_in: Math.max(0, expires - Math.floor(Date.now() / 1000)),
      ttl_seconds: SIGN_TTL_SECONDS,
    };
  } catch {
    return { signed: false, issued_at: null, expires_at: null, expires_in: null, ttl_seconds: null };
  }
}

function normalizeGenres(list) {
  return (list || [])
    .map((genre) => {
      if (typeof genre === 'string') return { slug: null, name: genre };
      return {
        slug: genre.genre_slug || genre.slug || null,
        name: genre.name || genre.genre_slug || null,
      };
    })
    .filter((genre) => genre.name);
}

function normalizeCard({ slug, title, cover, rating, rank, episode_count, description, genres }, lang) {
  return {
    series_slug: slug,
    title: title || null,
    cover: cover || null,
    rating: rating || null,
    rank: rank ?? null,
    episode_count: episode_count ?? null,
    description: description || null,
    genres: normalizeGenres(genres),
    url: seriesUrl(lang, slug),
  };
}

function cleanCover(url) {
  if (!url) return null;
  return url.split('!')[0] || null;
}

function cardFromLink($, link, lang) {
  const a = $(link);
  if (a.find('img').length) return null;

  const rawText = a.text().replace(/\s+/g, ' ').trim();
  if (!rawText) return null;

  const href = a.attr('href') || '';
  const match = href.match(/\/dramas\/([a-z0-9-]+)/i);
  if (!match) return null;

  const rankMatch = rawText.match(/^(\d+)[.)]\s+/);
  const rank = rankMatch ? Number(rankMatch[1]) : null;
  const title = (a.attr('aria-label') || rawText.replace(/^\d+[.)]\s+/, '')).trim();
  if (!title) return null;

  const slug = match[1];
  let box = a.closest('div');
  let cover = null;
  let rating = null;
  let genres = [];

  for (let depth = 0; depth < 4 && box.length; depth += 1) {
    if (!cover) {
      const image = box.find('img[alt]').first().attr('src') || box.find('img').first().attr('src');
      cover = cleanCover(image);
    }

    if (!rating) {
      const texts = box
        .find('div')
        .map((_, element) => $(element).text().trim())
        .get();
      rating =
        texts.find((text) => /^\d+(\.\d+)?$/.test(text) && Number(text) > 0 && Number(text) <= 10) || null;
    }

    if (!genres.length) {
      genres = box
        .find('a[href*="/category/"]')
        .map((_, element) => $(element).attr('aria-label') || $(element).text().trim())
        .get()
        .filter(Boolean);
    }

    box = box.parent();
  }

  return normalizeCard({ slug, title, cover, rating, rank, genres: [...new Set(genres)] }, lang);
}

function parseSections($, lang) {
  const sections = [];
  let current = null;

  $('h1,h2,h3,a[href*="/dramas/"]').each((_, element) => {
    const tag = (element.tagName || '').toLowerCase();

    if (/^h[1-3]$/.test(tag)) {
      const title = $(element).text().replace(/\s+/g, ' ').trim();
      if (!title) return;
      current = { title, items: [], seen: new Set() };
      sections.push(current);
      return;
    }

    if (!current) return;

    const card = cardFromLink($, element, lang);
    if (!card || current.seen.has(card.series_slug)) return;

    current.seen.add(card.series_slug);
    current.items.push(card);
  });

  return sections
    .filter((section) => section.items.length)
    .map((section) => ({
      title: section.title,
      items: section.items,
    }));
}

function parseGenres($, lang) {
  const genres = [];
  const seen = new Set();

  $('a[href*="/category/"]').each((_, element) => {
    const a = $(element);
    const match = (a.attr('href') || '').match(/\/category\/([a-z0-9-]+)/i);
    if (!match) return;

    const slug = match[1];
    const name = a.attr('aria-label') || a.text().replace(/\s+/g, ' ').trim();
    if (!name || seen.has(slug)) return;

    seen.add(slug);
    genres.push({ slug, name, url: pageUrl(lang, `/category/${slug}`) });
  });

  return genres;
}

function normalizeEpisode(episode) {
  const info = signInfo(episode.url);

  return {
    episode_id: episode.episode_id,
    episode_number: episode.episode_id,
    title: `Episode ${episode.episode_id}`,
    stream_url: info.signed ? episode.url : null,
    url: episode.url,
    playable: info.signed,
    signed: info.signed,
    needs_sign: !info.signed,
    issued_at: info.issued_at,
    expires_at: info.expires_at,
    expires_in: info.expires_in,
    ttl_seconds: info.ttl_seconds,
  };
}

function streamPayload({ slug, title, episode, lang }) {
  const info = signInfo(episode.url);
  const streamUrl = info.signed ? episode.url : null;

  return {
    series_slug: slug,
    series_title: title,
    episode_id: episode.episode_id,
    episode_number: episode.episode_id,
    stream_url: streamUrl,
    download_url: streamUrl,
    signed: info.signed,
    issued_at: info.issued_at,
    expires_at: info.expires_at,
    expires_in: info.expires_in,
    ttl_seconds: info.ttl_seconds,
    qualities: [{ ...WEB_STREAM.quality }],
    audio: WEB_STREAM.audio,
    subtitles: WEB_STREAM.subtitles,
    subtitle_note: WEB_STREAM.subtitle_note,
    download: {
      filename: `${slug}-ep-${episode.episode_id}.mp4`,
      headers: {
        Referer: `${BASE}/`,
        'User-Agent': UA,
      },
    },
    watch_url: pageUrl(lang, `/dramas/${slug}/${episode.episode_id}`),
  };
}

function normalizeRecommendations(list, lang) {
  return (list || [])
    .map((item) => {
      const slug = item.series_slug || item.novels_slug;
      if (!slug) return null;

      return normalizeCard(
        {
          slug,
          title: item.name,
          cover: item.cover_url,
          rating: item.rating,
          episode_count: item.episode_num,
          description: item.short_desc || item.desc,
          genres: item.genre_list,
        },
        lang
      );
    })
    .filter(Boolean);
}

function normalizeDetail(detail, lang, episodes, requestedEpisode) {
  const dubbedVersions = [];
  const seenVersions = new Set();
  for (const item of detail.watch_list || []) {
    const key = `${item.language}|${item.web_url}`;
    if (seenVersions.has(key)) continue;
    seenVersions.add(key);
    dubbedVersions.push({
      language: item.language || null,
      platform: item.web_name || null,
      url: item.web_url || null,
    });
  }

  const stream = requestedEpisode
    ? streamPayload({
        slug: detail.series_slug,
        title: detail.name,
        episode: requestedEpisode,
        lang,
      })
    : null;

  return {
    series_slug: detail.series_slug,
    title: detail.name,
    description: detail.desc,
    short_description: detail.short_desc,
    cover: detail.cover_url,
    photos: (detail.photo_list || '')
      .split(',')
      .map((photo) => photo.trim())
      .filter(Boolean),
    rating: detail.rating || null,
    reviewers: detail.reviewers_num ?? null,
    episode_count: detail.episode_num ?? episodes.length,
    release_date: detail.release_date || null,
    country: detail.country_of_origin || null,
    languages: (detail.langs || '')
      .split(',')
      .map((language) => language.trim())
      .filter(Boolean),
    genres: normalizeGenres(detail.genre_list),
    cast: detail.actor_list || [],
    dubbed_versions: dubbedVersions,
    recommendations: normalizeRecommendations(detail.recommend_series_slugs_play, lang),
    episodes,
    stream,
    source_url: seriesUrl(lang, detail.series_slug),
  };
}

export async function getMeloloHomepage(lang = DEFAULT_LANG, limit = 12) {
  const html = await request(pageUrl(lang, '/category'));
  const $ = cheerio.load(html);
  const genres = parseGenres($, lang);
  const sections = parseSections($, lang).map((section) => ({
    ...section,
    items: section.items.slice(0, limit),
  }));

  return [
    {
      type: 'genres',
      title: 'Genres',
      items: genres,
    },
    ...sections.map((section) => ({
      type: 'section',
      ...section,
    })),
  ];
}

export async function getMeloloGenres(lang = DEFAULT_LANG) {
  const html = await request(pageUrl(lang, '/category'));
  const $ = cheerio.load(html);
  return parseGenres($, lang);
}

export async function getMeloloCategory(lang = DEFAULT_LANG, genre, page = 1, limit = 18) {
  const currentPage = Math.max(1, num(page, 1));
  const pathname = currentPage === 1 ? `/category/${genre}` : `/category/${genre}/${currentPage}`;
  const html = await request(pageUrl(lang, pathname));
  const $ = cheerio.load(html);

  const seen = new Set();
  const items = parseSections($, lang)
    .flatMap((section) => section.items)
    .filter((item) => {
      if (seen.has(item.series_slug)) return false;
      seen.add(item.series_slug);
      return true;
    })
    .slice(0, clamp(num(limit, 18), 1, 50));

  const pageNumbers = [];
  $(`a[href*="/category/${genre}/"]`).each((_, element) => {
    const match = ($(element).attr('href') || '').match(new RegExp(`/category/${genre}/(\\d+)$`));
    if (match) pageNumbers.push(Number(match[1]));
  });

  const totalPages = Math.max(currentPage, ...pageNumbers);
  const hasNext = $('a[rel="next"]').length > 0 || currentPage < totalPages;

  return {
    genre,
    page: currentPage,
    total_pages: totalPages,
    has_next: hasNext,
    next_page: hasNext ? currentPage + 1 : null,
    items,
  };
}

export async function searchMelolo(lang = DEFAULT_LANG, query, page = 1, limit = 18, type = 'series') {
  const currentPage = Math.max(1, num(page, 1));
  const safeLimit = clamp(num(limit, 18), 1, 50);
  const url =
    `${BASE}/api/novels/searchNovelsByQuery?language=${encodeURIComponent(lang)}` +
    `&query=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}` +
    `&page=${currentPage}&page_size=${safeLimit}`;

  const response = await request(url, { json: true });
  const payload = response?.data || {};
  const items = (payload.page_data || [])
    .filter((item) => item && item.series_slug)
    .map((item) =>
      normalizeCard(
        {
          slug: item.series_slug,
          title: item.name,
          cover: item.cover_url,
          rating: item.rating,
          episode_count: item.episode_num,
          description: item.short_desc,
          genres: item.genre_list,
        },
        lang
      )
    );

  const totalPages = payload.total_pages ?? 0;
  const hasNext = currentPage < totalPages;

  return {
    query,
    type,
    page: currentPage,
    total: payload.total_count ?? items.length,
    total_pages: totalPages,
    has_next: hasNext,
    next_page: hasNext ? currentPage + 1 : null,
    items,
  };
}

export async function getMeloloTrending(lang = DEFAULT_LANG, limit = 12) {
  const html = await request(pageUrl(lang, '/ranking'));
  const $ = cheerio.load(html);

  return parseSections($, lang).map((section) => ({
    title: section.title,
    items: section.items.slice(0, clamp(num(limit, 12), 1, 50)),
  }));
}

export async function getMeloloDetail(lang = DEFAULT_LANG, slug, episodeId = 1) {
  const epNum = Math.max(1, num(episodeId, 1));
  const response = await request(apiUrl(lang, slug, epNum), { json: true });

  if (!response || !Array.isArray(response.data) || response.data.length === 0) {
    const err = new Error(`Drama tidak ditemukan: ${slug}`);
    err.status = 404;
    throw err;
  }

  const data = response.data[0];
  const episodes = (data.episode_list || []).map(normalizeEpisode);
  const requestedEpisode =
    episodes.find((episode) => Number(episode.episode_id) === Number(epNum)) ||
    episodes[0] ||
    null;

  return normalizeDetail(data, lang, episodes, requestedEpisode);
}

export async function getMeloloStream(lang = DEFAULT_LANG, slug, episodeId = 1) {
  const data = await getMeloloDetail(lang, slug, episodeId);

  if (!data.stream || !data.stream.stream_url) {
    const err = new Error(`Episode ${episodeId} tidak memiliki stream aktif`);
    err.status = 404;
    throw err;
  }

  return {
    series_slug: data.series_slug,
    series_title: data.title,
    cover: data.cover,
    ...data.stream,
  };
  }
      
