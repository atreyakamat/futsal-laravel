-- Multi-turf admin support: an ArenaAdmin row with arena_id NULL can now be
-- scoped to a specific SUBSET of arenas (rather than only "every arena")
-- by holding 1+ rows in arena_managers keyed to its user_id, instead of
-- exactly one arena_id on the arena_admins row itself (that stays the
-- single-turf "Manager" representation, unchanged).
--
-- arena_managers was previously a 1:1 mirror of a Manager's single arena_id
-- (enforced by a unique index on user_id alone, and never read back
-- anywhere per the dead-code note in lib/super-admin.ts's createArenaAdmin)
-- -- this widens it into a true many-to-many junction: unique on
-- (user_id, arena_id) instead of user_id alone, so an admin can hold
-- multiple rows, one per assigned turf. Existing single-turf Manager /
-- SecurityStaff rows are completely unaffected (still exactly one
-- arena_managers row each, so this migration changes zero existing data).
-- See lib/admin.ts's getAdminContext and lib/super-admin.ts's
-- getAdminArenaAssignments/setAdminArenaAssignments for how this is read
-- and written.
DROP INDEX "arena_managers_user_id_key";
CREATE UNIQUE INDEX "arena_managers_user_id_arena_id_key" ON "arena_managers"("user_id", "arena_id");
