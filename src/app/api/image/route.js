import { NextResponse } from 'next/server';

const WEB = 'https://animeinweb.com';
const UA = 'okhttp/4.12.0';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url') || '';

  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return new NextResponse(null, { status: 400 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': UA,
        Referer: `${WEB}/`,
        Accept: 'image/*,*/*;q=0.8'
      },
      redirect: 'follow'
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const buf = await res.arrayBuffer();
    const type = res.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  }
