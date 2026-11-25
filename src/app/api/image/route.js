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
    return new NextResponse(null, { status: 400 });
  }

  const customReferer = (searchParams.get('referer') || '').trim();
  const refererUrl = customReferer || `${target.origin}/`;

  try {
    const res = await fetch(target.toString(), {
      headers: {
        'User-Agent': DEFAULT_UA,
        Referer: refererUrl,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
