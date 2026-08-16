-- Converts AIEM Assagao's hardcoded "15:00-16:00 / 16:00-17:00 reserved for
-- college students on weekdays" rule (previously baked directly into
-- app/api/slots/status/route.ts) into real day-of-week pricing data, now
-- that the availability endpoint supports it natively. These two slots
-- were only ever actually bookable on weekends under the old hardcode (the
-- override forced 'booked' on every weekday, unconditionally) — this
-- migration preserves that exact behavior with real data: the "every day"
-- row is replaced with two day-specific rows (Saturday=6, Sunday=0) at the
-- same price, so the slot simply doesn't exist as an offering on weekdays
-- rather than being force-marked unavailable in code.
--
-- Idempotent and a no-op everywhere except the one arena/slots it targets;
-- safe to run on any environment (including ones where this arena/slots
-- don't exist, or have already been migrated).
DO $$
DECLARE
  v_arena_id INTEGER;
  v_row RECORD;
BEGIN
  SELECT id INTO v_arena_id FROM arenas WHERE slug = 'aiem-assagao';

  IF v_arena_id IS NOT NULL THEN
    FOR v_row IN
      SELECT id, time_slot, price FROM pricings
       WHERE arena_id = v_arena_id
         AND time_slot IN ('15:00-16:00', '16:00-17:00')
         AND day_of_week IS NULL
    LOOP
      INSERT INTO pricings (arena_id, time_slot, price, day_of_week, created_at, updated_at)
      VALUES (v_arena_id, v_row.time_slot, v_row.price, 0, NOW(), NOW())
      ON CONFLICT DO NOTHING;

      INSERT INTO pricings (arena_id, time_slot, price, day_of_week, created_at, updated_at)
      VALUES (v_arena_id, v_row.time_slot, v_row.price, 6, NOW(), NOW())
      ON CONFLICT DO NOTHING;

      DELETE FROM pricings WHERE id = v_row.id;
    END LOOP;
  END IF;
END $$;
