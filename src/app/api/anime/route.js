import { NextResponse } from 'next/server';
import {
  getHomepage,
  getSchedule,
  searchAnime,
  getAnimeDetail,
  getAnimeEpisodes,
  getLatestAnime,
  getStreamData
} from '../../../lib/animein.js';

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
      case 'episodes':
        data = await getAnimeEpisodes(id, page);
        break;
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
