<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\SlotLock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class SlotService
{
    const SLOT_LOCK_DURATION = 600;

    /**
     * Clean expired locks
     */
    public function cleanExpiredLocks(): void
    {
        SlotLock::where('expires_at', '<', now())->delete();
    }

    /**
     * Check if slot is locked by another user
     */
    public function isSlotLocked(int $arenaId, string $date, string $slot, ?string $sessionId = null): bool
    {
        $query = SlotLock::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->where('time_slot', $slot)
            ->where('expires_at', '>', now());

        if ($sessionId) {
            $query->where('session_id', '!=', $sessionId);
        }

        return $query->exists();
    }

    /**
     * Lock multiple slots for a session
     */
    public function lockSlots(int $arenaId, string $date, array $slots, string $sessionId): array
    {
        $this->cleanExpiredLocks();
        $expires = now()->addSeconds(self::SLOT_LOCK_DURATION);
        $locked = [];
        $failed = [];

        foreach ($slots as $slot) {
            // Check if already booked
            $isBooked = Booking::where('arena_id', $arenaId)
                ->where('booking_date', $date)
                ->where('time_slot', $slot)
                ->whereIn('payment_status', ['confirmed', 'pending'])
                ->exists();

            $isLocked = $this->isSlotLocked($arenaId, $date, $slot, $sessionId);

            if ($isBooked || $isLocked) {
                $failed[] = $slot;
                continue;
            }

            try {
                // Ensure we don't overwrite someone else's active lock
                $existingLock = SlotLock::where('arena_id', $arenaId)
                    ->where('booking_date', $date)
                    ->where('time_slot', $slot)
                    ->first();

                if ($existingLock && $existingLock->session_id !== $sessionId && $existingLock->expires_at > now()) {
                    $failed[] = $slot;
                    continue;
                }

                SlotLock::updateOrCreate(
                    [
                        'arena_id' => $arenaId,
                        'booking_date' => $date,
                        'time_slot' => $slot,
                    ],
                    [
                        'session_id' => $sessionId,
                        'expires_at' => $expires,
                        'locked_at' => now(),
                    ]
                );
                $locked[] = $slot;
            } catch (\Exception $e) {
                $failed[] = $slot;
            }
        }

        return ['locked' => $locked, 'failed' => $failed];
    }

    /**
     * Release locks for a session
     */
    public function releaseLocks(string $sessionId, ?int $arenaId = null, ?string $date = null): void
    {
        $query = SlotLock::where('session_id', $sessionId);
        
        if ($arenaId) {
            $query->where('arena_id', $arenaId);
        }
        
        if ($date) {
            $query->where('booking_date', $date);
        }

        $query->delete();
    }

    /**
     * Get slots locked by other users
     */
    public function getLockedSlots(int $arenaId, string $date, ?string $sessionId = null): array
    {
        $query = SlotLock::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->where('expires_at', '>', now());

        if ($sessionId) {
            $query->where('session_id', '!=', $sessionId);
        }

        return $query->pluck('time_slot')->toArray();
    }

    /**
     * Get confirmed/pending booking slots
     */
    public function getBookedSlots(int $arenaId, string $date): array
    {
        return Booking::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->whereIn('payment_status', ['confirmed', 'pending'])
            ->pluck('time_slot')
            ->toArray();
    }
}
