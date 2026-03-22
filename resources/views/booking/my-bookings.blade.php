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
                <div class="border rounded p-4">
                    <div class="flex justify-between items-center border-b pb-2 mb-4">
                        <div>
                            <span class="font-bold text-lg">Booking Ref: {{ $ref }}</span>
                            <span class="text-sm text-gray-500 ml-2">({{ $group->first()->arena->name }})</span>
                        </div>
                        <a href="{{ route('booking.ticket.download', $ref) }}" target="_blank" class="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">
                            Download PDF Ticket
                        </a>
                    </div>
                    
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                <th class="border-b py-2">Date</th>
                                <th class="border-b py-2">Slot</th>
                                <th class="border-b py-2">Amount</th>
                                <th class="border-b py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($group as $booking)
                                <tr>
                                    <td class="border-b py-2">{{ $booking->booking_date->format('d M Y') }}</td>
                                    <td class="border-b py-2">{{ $booking->time_slot }}</td>
                                    <td class="border-b py-2">₹{{ $booking->amount }}</td>
                                    <td class="border-b py-2">
                                        <span class="px-2 py-1 text-xs rounded {{ $booking->payment_status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800' }}">
                                            {{ strtoupper($booking->payment_status) }}
                                        </span>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endforeach
        </div>
    @endif
</div>
@endsection
