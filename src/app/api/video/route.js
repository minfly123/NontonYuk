import { NextResponse } from 'next/server';

const DEFAULT_UA = 'okhttp/4.12.0';

function parseSafeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, '')}`;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = parseSafeUrl(searchParams.get('url') || '');

  if (!target) {
    return NextResponse.json({ error: 'URL video tidak valid' }, { status: 400 });
  }

  const customReferer = (searchParams.get('referer') || '').trim();
  const refererUrl = customReferer || `${target.origin}/`;
  const rangeHeader = request.headers.get('range');

  const upstreamHeaders = {
    'User-Agent': DEFAULT_UA,
    Referer: refererUrl,
    Accept: '*/*'
  };

  if (rangeHeader) {
    upstreamHeaders.Range = rangeHeader;
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: upstreamHeaders,
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(30000)
    });

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Accept-Ranges', 'bytes');

    for (const h of ['content-length', 'content-range', 'cache-control']) {
      const val = upstream.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Gagal memuat stream video' },
      { status: 502 }
    );
  }
}
