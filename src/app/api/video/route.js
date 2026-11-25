import { NextResponse } from 'next/server';

const WEB = 'https://animeinweb.com';
const UA = 'okhttp/4.12.0';

function isAllowedUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url') || '';

  if (!isAllowedUrl(targetUrl)) {
    return NextResponse.json({ error: 'URL video tidak valid' }, { status: 400 });
  }

  const rangeHeader = request.headers.get('range');
  const upstreamHeaders = {
    'User-Agent': UA,
    Referer: `${WEB}/`,
    Accept: '*/*'
  };

  if (rangeHeader) {
    upstreamHeaders.Range = rangeHeader;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
      cache: 'no-store'
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
  
