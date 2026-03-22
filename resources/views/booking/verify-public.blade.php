@extends('layouts.app')

@section('title', 'Verify Ticket | FutsalGoa')

@section('content')
<div class="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md text-center">
    <div class="mb-6">
        @if($booking->payment_status === 'confirmed')
            <div class="text-green-500 mb-4">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 class="text-2xl font-bold text-green-700">Valid Ticket</h2>
        @else
            <div class="text-red-500 mb-4">
                <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h2 class="text-2xl font-bold text-red-700">Invalid / Unpaid Ticket</h2>
        @endif
    </div>

    <div class="text-left bg-gray-50 p-4 rounded border">
        <div class="mb-2"><span class="font-bold">Arena:</span> {{ $booking->arena->name }}</div>
        <div class="mb-2"><span class="font-bold">Customer:</span> {{ $booking->customer_name }}</div>
        <div class="mb-2"><span class="font-bold">Date:</span> {{ $booking->booking_date->format('d M Y') }}</div>
        <div class="mb-2"><span class="font-bold">Slot:</span> {{ $booking->time_slot }}</div>
        <div class="mb-2"><span class="font-bold">Ticket #:</span> {{ $booking->ticket_number }}</div>
    </div>
</div>
@endsection
