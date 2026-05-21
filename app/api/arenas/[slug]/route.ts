import { NextResponse } from 'next/server';
import { getArenaBySlug, getArenaPricing } from '@/lib/domain';

export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const arena = await getArenaBySlug(slug);

  if (!arena) {
    return NextResponse.json({ success: false, message: 'Arena not found.' }, { status: 404 });
  }

  const pricing = await getArenaPricing(arena.id);
  return NextResponse.json({ success: true, arena, pricing });
}