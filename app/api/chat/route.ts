import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getBooleanSetting, getActiveArenas, getArenaPricing } from '@/lib/domain';

const bodySchema = z.object({
  message: z.string().min(1),
});

function makeReply(message: string, arenaNames: string[]) {
  const lower = message.toLowerCase();

  if (lower.includes('arena')) {
    return `Available arenas: ${arenaNames.join(', ')}.`;
  }

  if (lower.includes('price') || lower.includes('cost')) {
    return 'Send me an arena name and I will fetch its slot pricing.';
  }

  if (lower.includes('book')) {
    return 'Choose an arena, date, and slot, then continue to checkout.';
  }

  return 'I can help with arena availability, pricing, booking, and ticket checks.';
}

export async function POST(request: Request) {
  const isEnabled = await getBooleanSetting('global_ai_enabled', true);

  if (!isEnabled) {
    return NextResponse.json({ reply: 'AI Assistant is currently disabled globally.' }, { status: 403 });
  }

  const payload = bodySchema.parse(await request.json());
  const arenas = await getActiveArenas();
  const reply = makeReply(payload.message, arenas.map((arena) => arena.name));

  if (arenas.length > 0 && /pricing|price|cost/.test(payload.message.toLowerCase())) {
    const pricing = await getArenaPricing(arenas[0].id);
    return NextResponse.json({
      reply: `${reply} First arena pricing starts at Rs. ${pricing[0]?.price ?? arenas[0].min_price}.`,
    });
  }

  return NextResponse.json({ reply });
}