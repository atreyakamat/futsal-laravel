@extends('layouts.app')

@section('title', 'My Bookings | FutsalGoa')

@section('content')
<div class="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6">My Bookings</h2>

    @if($bookings->isEmpty())
        <p class="text-gray-600">You have no bookings yet.</p>
    @else
        <div class="space-y-6">
            @foreach($bookings as $ref => $group)
                @php
                    $slots = $group->pluck('time_slot')->toArray();
                    $mergedSlots = \App\Services\SlotMergeService::mergeSlots($slots);
                    $duration = \App\Services\SlotMergeService::getDurationText($slots);
                    $totalAmount = $group->sum('amount');
                    $firstBooking = $group->first();
                @endphp
                <div class="border rounded-lg overflow-hidden">
                    <div class="flex justify-between items-center bg-gray-50 p-4 border-b">
                        <div>
                            <span class="font-bold text-lg">{{ $firstBooking->arena->name }}</span>
                            <span class="text-sm text-gray-500 ml-2">Ref: {{ $ref }}</span>
                        </div>
                        <a href="{{ route('booking.ticket.download', $ref) }}" target="_blank" class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Ticket
                        </a>
                    </div>

                    <div class="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <span class="text-xs text-gray-500 uppercase tracking-wider block">Date</span>
                            <span class="font-semibold">{{ $firstBooking->booking_date->format('d M Y') }}</span>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500 uppercase tracking-wider block">Time</span>
                            <span class="font-semibold text-blue-600">{{ $mergedSlots }}</span>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500 uppercase tracking-wider block">Duration</span>
                            <span class="font-semibold">{{ $duration }}</span>
                        </div>
                        <div>
                            <span class="text-xs text-gray-500 uppercase tracking-wider block">Total</span>
                            <span class="font-semibold">Rs. {{ number_format($totalAmount, 0) }}</span>
                        </div>
                    </div>

                    <div class="px-4 pb-4">
                        <span class="px-3 py-1 text-xs rounded-full {{ $firstBooking->payment_status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }}">
                            {{ strtoupper($firstBooking->payment_status) }}
                        </span>
                    </div>
                </div>
            @endforeach
        </div>
    @endif
</div>
@endsection
