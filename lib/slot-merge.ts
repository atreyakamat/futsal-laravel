function parseSlot(slot: string) {
  const [start] = slot.split('-');
  return start;
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function mergeSlots(slots: string[]) {
  const sorted = [...slots].sort((a, b) => toMinutes(parseSlot(a)) - toMinutes(parseSlot(b)));
  const merged: string[] = [];

  for (const slot of sorted) {
    if (merged.length === 0) {
      merged.push(slot);
      continue;
    }

    const last = merged[merged.length - 1];
    const [lastStart, lastEnd] = last.split('-');
    const [currentStart, currentEnd] = slot.split('-');

    if (lastEnd === currentStart) {
      merged[merged.length - 1] = `${lastStart}-${currentEnd}`;
    } else {
      merged.push(slot);
    }
  }

  return merged;
}

export function formatSlot(slot: string) {
  return slot;
}

export function getDurationText(slots: string[]) {
  if (slots.length === 0) {
    return '0 hrs';
  }

  const first = slots[0].split('-')[0];
  const last = slots[slots.length - 1].split('-')[1];
  const durationMinutes = toMinutes(last) - toMinutes(first);
  const hours = durationMinutes / 60;

  return `${hours} hr${hours === 1 ? '' : 's'}`;
}