-- CreateTable
CREATE TABLE "arena_images" (
    "id" SERIAL NOT NULL,
    "arena_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arena_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "arena_images_arena_id_idx" ON "arena_images"("arena_id");

-- CreateTable
CREATE TABLE "amenities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'check_circle',

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateTable
CREATE TABLE "arena_amenities" (
    "arena_id" INTEGER NOT NULL,
    "amenity_id" INTEGER NOT NULL,

    CONSTRAINT "arena_amenities_pkey" PRIMARY KEY ("arena_id","amenity_id")
);

-- Seed starter amenities
INSERT INTO "amenities" ("name", "icon") VALUES
    ('Parking', 'local_parking'),
    ('Washroom', 'wc'),
    ('Drinking Water', 'water_drop'),
    ('Floodlights', 'flare'),
    ('First Aid', 'medical_services'),
    ('Changing Room', 'checkroom'),
    ('Seating', 'event_seat'),
    ('CCTV', 'videocam'),
    ('Cafeteria', 'restaurant'),
    ('Locker', 'lock')
ON CONFLICT ("name") DO NOTHING;
