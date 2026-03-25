@extends('layouts.app')

@section('title', 'Verify Ticket | FutsalGoa')

@section('content')
<div class="max-w-md mx-auto mt-20 px-6 py-20">
    <div class="glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/50 text-center relative overflow-hidden">
        
        @if($booking->payment_status === 'confirmed')
            <div class="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <div class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8 border-4 border-primary/20">
                <span class="material-symbols-outlined text-5xl text-primary">verified</span>
            </div>
            <h2 class="text-3xl font-black uppercase tracking-tighter italic text-white mb-2">VALID <span class="text-primary">TICKET</span></h2>
            <p class="text-[10px] font-bold text-primary uppercase tracking-widest mb-10">Entry Authorized</p>
        @else
            <div class="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
            <div class="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-8 border-4 border-red-500/20">
                <span class="material-symbols-outlined text-5xl text-red-500">gpp_bad</span>
            </div>
            <h2 class="text-3xl font-black uppercase tracking-tighter italic text-white mb-2">INVALID <span class="text-red-500">TICKET</span></h2>
            <p class="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-10">Entry Denied / Unpaid</p>
        @endif

        <div class="text-left bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
            <div class="flex justify-between items-center border-b border-white/5 pb-4">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Arena</span>
                <span class="text-sm font-bold text-white">{{ $booking->arena->name }}</span>
            </div>
            <div class="flex justify-between items-center border-b border-white/5 pb-4">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Customer</span>
                <span class="text-sm font-bold text-white">{{ $booking->customer_name }}</span>
            </div>
            <div class="flex justify-between items-center border-b border-white/5 pb-4">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</span>
                <span class="text-sm font-bold text-white">{{ $booking->booking_date->format('d M Y') }}</span>
            </div>
            <div class="flex justify-between items-center border-b border-white/5 pb-4">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Slot</span>
                <span class="text-sm font-bold text-primary">{{ $booking->time_slot }}</span>
            </div>
            <div class="flex justify-between items-center pt-2">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ticket #</span>
                <span class="text-[10px] font-black tracking-[0.2em] text-white px-3 py-1 bg-black/50 rounded-lg">{{ $booking->ticket_number }}</span>
            </div>
        </div>
        
        <div class="mt-8 pt-8 border-t border-white/5">
            <a href="/" class="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-sm">home</span>
                Back to Home
            </a>
        </div>
    </div>
</div>
@endsection