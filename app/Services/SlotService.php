<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\SlotLock;
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
        $bookingDate = Carbon::parse($date)->toDateString();

        $query = SlotLock::where('arena_id', $arenaId)
            ->whereDate('booking_date', $bookingDate)
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
        $bookingDate = \Illuminate\Support\Carbon::parse($date)->toDateString();
        $expires = now()->addSeconds(self::SLOT_LOCK_DURATION);
        $locked = [];
        $failed = [];

        foreach ($slots as $slot) {
            try {
                \Illuminate\Support\Facades\DB::transaction(function () use ($arenaId, $bookingDate, $slot, $sessionId, $expires, &$locked, &$failed) {
                    // Check if already booked
                    $isBooked = Booking::where('arena_id', $arenaId)
                        ->whereDate('booking_date', $bookingDate)
                        ->where('time_slot', $slot)
                        ->whereIn('payment_status', ['confirmed', 'pending'])
                        ->lockForUpdate()
                        ->exists();

                    if ($isBooked) {
                        $failed[] = $slot;
                        return;
                    }

                    // Atomic check and update/create
                    $existingLock = SlotLock::where('arena_id', $arenaId)
                        ->whereDate('booking_date', $bookingDate)
                        ->where('time_slot', $slot)
                        ->lockForUpdate()
                        ->first();

                    if ($existingLock) {
                        // If it's locked by others and NOT expired, we fail
                        if ($existingLock->session_id !== $sessionId && $existingLock->expires_at > now()) {
                            $failed[] = $slot;
                            return;
                        }
                        
                        // Overwrite expired lock or update our own lock
                        $existingLock->update([
                            'session_id' => $sessionId,
                            'expires_at' => $expires,
                            'locked_at' => now(),
                        ]);
                    } else {
                        // Create new lock
                        SlotLock::create([
                            'arena_id' => $arenaId,
                            'booking_date' => $bookingDate,
                            'time_slot' => $slot,
                            'session_id' => $sessionId,
                            'expires_at' => $expires,
                            'locked_at' => now(),
                        ]);
                    }
                    $locked[] = $slot;
                });
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Slot locking failure for slot ' . $slot . ': ' . $e->getMessage());
                $failed[] = $slot;
            }
        }

        return ['locked' => $locked, 'failed' => $failed];
    }

    /**
     * Release locks for a session
     */
    public function releaseLocks(string $sessionId, ?int $arenaId = null, ?string $date = null, ?array $slots = null): void
    {
        $query = SlotLock::where('session_id', $sessionId);
        
        if ($arenaId) {
            $query->where('arena_id', $arenaId);
        }
        
        if ($date) {
            $query->whereDate('booking_date', Carbon::parse($date)->toDateString());
        }

        if (is_array($slots) && count($slots) > 0) {
            $query->whereIn('time_slot', $slots);
        }

        $query->delete();
    }

    /**
     * Get slots locked by other users
     */
    public function getLockedSlots(int $arenaId, string $date, ?string $sessionId = null): array
    {
        $bookingDate = Carbon::parse($date)->toDateString();

        $query = SlotLock::where('arena_id', $arenaId)
            ->whereDate('booking_date', $bookingDate)
            ->where('expires_at', '>', now());

        if ($sessionId) {
            $query->where('session_id', '!=', $sessionId);
        }

        return $query->pluck('time_slot')->toArray();
    }

    /**
     * Get confirmed/pending booking slots (with caching)
     */
    public function getBookedSlots(int $arenaId, string $date): array
    {
        $bookingDate = Carbon::parse($date)->toDateString();
        $cacheKey = "arena_{$arenaId}_booked_{$bookingDate}";

        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 60, function () use ($arenaId, $bookingDate) {
            return Booking::where('arena_id', $arenaId)
                ->whereDate('booking_date', $bookingDate)
                ->whereIn('payment_status', ['confirmed', 'pending'])
                ->pluck('time_slot')
                ->toArray();
        });
    }

    /**
     * Invalidate availability cache for an arena and date
     */
    public function invalidateAvailabilityCache(int $arenaId, string $date): void
    {
        $bookingDate = Carbon::parse($date)->toDateString();
        \Illuminate\Support\Facades\Cache::forget("arena_{$arenaId}_booked_{$bookingDate}");
    }
}
