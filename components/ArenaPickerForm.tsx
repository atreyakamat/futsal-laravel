'use client';

import { useRouter } from 'next/navigation';

interface Props {
  arenas: { id: number; name: string }[];
  selectedArenaId: number | null;
}

export default function ArenaPickerForm({ arenas, selectedArenaId }: Props) {
  const router = useRouter();

  return (
    <div className="glass-card flex flex-wrap items-end gap-4">
      <div className="space-y-2 flex-1 min-w-[200px]">
        <label className="label-classic">Arena</label>
        <select
          defaultValue={selectedArenaId ?? undefined}
          onChange={(e) => router.push(`?arena_id=${e.target.value}`)}
          className="input-field"
        >
          {arenas.map((arena) => (
            <option key={arena.id} value={arena.id}>{arena.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
