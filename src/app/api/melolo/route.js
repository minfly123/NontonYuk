import { NextResponse } from 'next/server';
import {
  getMeloloHomepage,
  getMeloloGenres,
  getMeloloCategory,
  searchMelolo,
  getMeloloTrending,
  getMeloloDetail,
  getMeloloStream,
} from '../../../lib/melolo.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = (searchParams.get('action') || 'home').toLowerCase();
  const lang = (searchParams.get('lang') || 'id').toLowerCase();
  const q = searchParams.get('q') || '';
  const slug = searchParams.get('slug') || '';
  const genre = searchParams.get('genre') || '';
  const episode = searchParams.get('episode') || 1;
  const page = searchParams.get('page') || 1;
  const limit = searchParams.get('limit') || 12;

  try {
    let data;
    switch (action) {
      case 'home':
      case 'homepage':
        data = await getMeloloHomepage(lang, limit);
        break;
      case 'genres':
        data = await getMeloloGenres(lang);
        break;
      case 'category':
        if (!genre) {
          return NextResponse.json({ status: 400, error: 'Parameter genre wajib diisi' }, { status: 400 });
        }
        data = await getMeloloCategory(lang, genre, page, limit);
        break;
      case 'search':
        if (!q.trim()) {
          return NextResponse.json({ status: 400, error: 'Parameter q wajib diisi' }, { status: 400 });
        }
        data = await searchMelolo(lang, q.trim(), page, limit, 'series');
        break;
      case 'trending':
        data = await getMeloloTrending(lang, limit);
        break;
      case 'detail':
        if (!slug) {
          return NextResponse.json({ status: 400, error: 'Parameter slug wajib diisi' }, { status: 400 });
        }
        data = await getMeloloDetail(lang, slug, episode);
        break;
      case 'stream':
        if (!slug) {
          return NextResponse.json({ status: 400, error: 'Parameter slug wajib diisi' }, { status: 400 });
        }
        data = await getMeloloStream(lang, slug, episode);
        break;
      default:
        return NextResponse.json({ status: 400, error: 'Action Melolo tidak valid' }, { status: 400 });
    }

    return NextResponse.json({ status: 200, data });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json(
      { status, error: error.message || 'Gagal mengambil data Melolo' },
      { status }
    );
  }
}
