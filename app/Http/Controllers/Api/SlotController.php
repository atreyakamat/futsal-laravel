<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Arena;
use App\Models\Pricing;
use App\Services\SlotService;
use Illuminate\Http\Request;

class SlotController extends Controller
{
    protected $slotService;

    public function __construct(SlotService $slotService)
    {
        $this->slotService = $slotService;
    }

    public function status(Request $request)
    {
        $arenaId = $request->query('arena_id');
        $date = $request->query('date');
        $sessionId = session()->getId();

        if (!$arenaId || !$date) {
            return response()->json(['error' => 'Missing parameters'], 400);
        }

        $arena = Arena::findOrFail($arenaId);
        
        // Get all possible slots for this arena from pricing table
        $allSlots = Pricing::where('arena_id', $arenaId)->get();

        $bookedSlots = $this->slotService->getBookedSlots($arenaId, $date);
        $lockedByOthers = $this->slotService->getLockedSlots($arenaId, $date, $sessionId);
        $lockedByMe = $this->slotService->getLockedSlots($arenaId, $date) ?? []; // Actually get mine too if needed or just filter session
        
        // Refine locked by me
        $lockedByMe = \App\Models\SlotLock::where('arena_id', $arenaId)
            ->where('booking_date', $date)
            ->where('session_id', $sessionId)
            ->where('expires_at', '>', now())
            ->pluck('time_slot')
            ->toArray();

        $slotsData = $allSlots->map(function($p) use ($bookedSlots, $lockedByOthers, $lockedByMe) {
            $status = 'available';
            if (in_array($p->time_slot, $bookedSlots)) {
                $status = 'booked';
            } elseif (in_array($p->time_slot, $lockedByOthers)) {
                $status = 'locked';
            } elseif (in_array($p->time_slot, $lockedByMe)) {
                $status = 'selected'; // already in my cart
            }

            return [
                'time_slot' => $p->time_slot,
                'price' => $p->price,
                'status' => $status
            ];
        });

        return response()->json([
            'arena' => $arena->name,
            'date' => $date,
            'slots' => $slotsData
        ]);
    }

    public function lock(Request $request)
    {
        $arenaId = $request->input('arena_id');
        $date = $request->input('date');
        $slots = $request->input('slots', []);
        $sessionId = session()->getId();

        $result = $this->slotService->lockSlots($arenaId, $date, $slots, $sessionId);

        return response()->json([
            'success' => count($result['failed']) === 0,
            'locked' => $result['locked'],
            'failed' => $result['failed']
        ]);
    }

    public function unlock(Request $request)
    {
        $sessionId = session()->getId();
        $arenaId = $request->input('arena_id');
        $date = $request->input('date');

        $this->slotService->releaseLocks($sessionId, $arenaId, $date);

        return response()->json(['success' => true]);
    }
}
