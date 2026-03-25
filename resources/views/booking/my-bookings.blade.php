@extends('layouts.app')

@section('title', 'My Bookings | FutsalGoa')

@section('content')
<div class="max-w-5xl mx-auto px-6 py-20">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
            <h1 class="text-4xl md:text-5xl font-black uppercase tracking-tighter italic mb-4">MY <span class="text-primary">BOOKINGS</span></h1>
            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">History of your arena reservations</p>
        </div>
        <div class="glass px-6 py-4 rounded-3xl">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] block mb-1">Total Bookings</span>
            <span class="text-2xl font-black text-white italic">{{ count($bookings) }}</span>
        </div>
    </div>

    @if($bookings->isEmpty())
        <div class="py-32 text-center glass rounded-[3rem] border-dashed border-white/10">
            <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <span class="material-symbols-outlined text-4xl text-gray-600">history</span>
            </div>
            <h2 class="text-xl font-bold uppercase mb-2 tracking-tight">No bookings found</h2>
            <p class="text-gray-500 text-sm mb-8">You haven't made any reservations yet. Ready to play?</p>
            <a href="{{ route('home') }}" class="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all">
                BROWSE ARENAS
                <span class="material-symbols-outlined text-sm font-black">arrow_forward</span>
            </a>
        </div>
    @else
        <div class="space-y-8">
            @foreach($bookings as $ref => $group)
                @php
                    $slots = $group->pluck('time_slot')->toArray();
                    $mergedSlots = \App\Services\SlotMergeService::mergeSlots($slots);
                    $duration = \App\Services\SlotMergeService::getDurationText($slots);
                    $totalAmount = $group->sum('amount');
                    $firstBooking = $group->first();
                @endphp
                <div class="glass rounded-[2.5rem] border border-white/10 overflow-hidden group hover:border-primary/30 transition-all duration-500">
                    <div class="p-8 md:p-10">
                        <div class="flex flex-col md:flex-row justify-between gap-8">
                            <div class="space-y-6 flex-1">
                                <div class="flex items-center gap-4">
                                    <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span class="material-symbols-outlined text-2xl">stadium</span>
                                    </div>
                                    <div>
                                        <h3 class="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">{{ $firstBooking->arena->name }}</h3>
                                        <div class="flex items-center gap-2">
                                            <span class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Reference</span>
                                            <span class="text-[10px] font-black text-white px-2 py-0.5 rounded bg-white/5 border border-white/5">{{ $ref }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                                    <div>
                                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Date</span>
                                        <span class="text-sm font-bold text-white">{{ $firstBooking->booking_date->format('D, d M Y') }}</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Time Slots</span>
                                        <span class="text-sm font-bold text-primary">{{ $mergedSlots }}</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Duration</span>
                                        <span class="text-sm font-bold text-white">{{ $duration }}</span>
                                    </div>
                                    <div>
                                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Status</span>
                                        <span class="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest {{ $firstBooking->payment_status === 'confirmed' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' }}">
                                            {{ $firstBooking->payment_status }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-white/5 pt-8 md:pt-0 md:pl-10">
                                <div class="text-right">
                                    <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Total Paid</span>
                                    <span class="text-3xl font-black text-white italic tracking-tighter">₹{{ number_format($totalAmount) }}</span>
                                </div>
                                
                                <a href="{{ route('booking.ticket.download', $ref) }}" target="_blank" 
                                   class="mt-6 inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold text-[10px] tracking-[0.2em] hover:bg-primary hover:text-black hover:border-primary transition-all group/btn">
                                    DOWNLOAD TICKET
                                    <span class="material-symbols-outlined text-lg group-hover/btn:translate-y-0.5 transition-transform">download</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    @endif
</div>
@endsection
