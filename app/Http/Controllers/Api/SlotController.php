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
        $validated = $request->validate([
            'arena_id' => 'required|exists:arenas,id',
            'date' => 'required|date_format:Y-m-d',
        ]);

        $arenaId = $validated['arena_id'];
        $date = \Illuminate\Support\Carbon::parse($validated['date'])->toDateString();
        $sessionId = session()->getId();

        $arena = Arena::findOrFail($arenaId);
        
        $allSlots = Pricing::where('arena_id', $arenaId)->get();

        $bookedSlots = $this->slotService->getBookedSlots($arenaId, $date);
        $lockedByOthers = $this->slotService->getLockedSlots($arenaId, $date, $sessionId);
        
        $lockedByMe = \App\Models\SlotLock::where('arena_id', $arenaId)
            ->whereDate('booking_date', $date)
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
                $status = 'selected';
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
        $validated = $request->validate([
            'arena_id' => 'required|exists:arenas,id',
            'date' => 'required|date_format:Y-m-d',
            'slots' => 'required|array',
            'slots.*' => 'string'
        ]);

        $arenaId = $validated['arena_id'];
        $date = \Illuminate\Support\Carbon::parse($validated['date'])->toDateString();
        $slots = $validated['slots'];
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
        $validated = $request->validate([
            'arena_id' => 'required|exists:arenas,id',
            'date' => 'required|date_format:Y-m-d',
            'slots' => 'nullable|array',
            'slots.*' => 'string',
        ]);

        $sessionId = session()->getId();
        $arenaId = $validated['arena_id'];
        $date = \Illuminate\Support\Carbon::parse($validated['date'])->toDateString();
        $slots = $validated['slots'] ?? null;

        $this->slotService->releaseLocks($sessionId, $arenaId, $date, $slots);

        return response()->json(['success' => true]);
    }
}
