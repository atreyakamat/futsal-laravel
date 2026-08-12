function toMinutes(time?: string) {
  if (!time) return 0;
  const parts = time.trim().split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

function parseSlotTimes(slot: string): { startMin: number; endMin: number } | null {
  if (!slot || typeof slot !== 'string') return null;
  // Extract all time-like strings (e.g. "20:00") from the slot string
  const parts = slot.match(/\d{1,2}:\d{2}/g) || [];
  if (parts.length < 2) return null;

  const startMin = toMinutes(parts[0]);
  let endMin = toMinutes(parts[1]);

  if (endMin <= startMin && endMin === 0) {
    endMin = 24 * 60; // 00:00 midnight wrap
  }

  return { startMin, endMin };
}

function parseSlot(slot: string) {
  const times = parseSlotTimes(slot);
  return times ? times.startMin : 0;
}

export function mergeSlots(slots: string[]) {
  if (!slots || !Array.isArray(slots) || slots.length === 0) return [];
  
  const parsed = slots
    .map((slot) => {
      const times = parseSlotTimes(slot);
      return times ? { slot, start: times.startMin, end: times.endMin } : null;
    })
    .filter((s): s is { slot: string; start: number; end: number } => s !== null);

  if (parsed.length === 0) return slots;

  parsed.sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];

  for (const item of parsed) {
    if (merged.length === 0) {
      merged.push({ start: item.start, end: item.end });
      continue;
    }

    const last = merged[merged.length - 1];
    if (last.end === item.start) {
      last.end = item.end;
    } else {
      merged.push({ start: item.start, end: item.end });
    }
  }

  function toTimeString(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return merged.map((m) => `${toTimeString(m.start)}-${toTimeString(m.end)}`);
}

export function formatSlot(slot: string) {
  return slot;
}

export function getDurationText(slots: string[]): string {
  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    return '0 HRS';
  }

  let totalMinutes = 0;

  for (const slot of slots) {
    // Accept either a string slot ("09:00-10:00") or an object with `time_slot` property
    let slotStr: any = slot;
    if (slot && typeof slot === 'object' && typeof (slot as any).time_slot === 'string') {
      slotStr = (slot as any).time_slot;
    }
    const times = typeof slotStr === 'string' ? parseSlotTimes(slotStr) : null;
    if (times) {
      const diff = times.endMin - times.startMin;
      if (diff > 0) {
        totalMinutes += diff;
      }
    }
  }

  if (totalMinutes <= 0) return '0 HRS';

  const hours = totalMinutes / 60;
  const formattedHours = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1).replace(/\.0$/, '');

  return `${formattedHours} ${hours === 1 ? 'HR' : 'HRS'}`;
}