@extends('layouts.app')

@section('title', 'Booking Successful')

@section('content')
<div class="max-w-2xl mx-auto px-6 py-20 text-center">
    <div class="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8">
        <span class="material-symbols-outlined text-primary text-5xl">check_circle</span>
    </div>
    <h1 class="text-4xl font-black mb-4 italic text-primary">BOOKING CONFIRMED!</h1>
    <p class="text-white/60 mb-8">Thank you for your booking. Your ticket reference is <span class="text-white font-bold">{{ $ref }}</span>.</p>
    
    <div class="bg-white/5 border border-white/10 rounded-xl p-8 mb-10 text-left">
        <p class="text-xs text-white/40 uppercase mb-4 tracking-widest">Next Steps</p>
        <ul class="space-y-4">
            <li class="flex gap-4">
                <span class="text-primary font-black">01</span>
                <span>You will receive a confirmation on your mobile/email shortly.</span>
            </li>
            <li class="flex gap-4">
                <span class="text-primary font-black">02</span>
                <span>Show your ticket reference at the arena entry.</span>
            </li>
            <li class="flex gap-4">
                <span class="text-primary font-black">03</span>
                <span>Enjoy your game!</span>
            </li>
        </ul>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="{{ route('home') }}" class="px-8 py-4 bg-primary text-black rounded-lg font-black hover:opacity-90">BOOK ANOTHER</a>
        <a href="#" class="px-8 py-4 border border-white/20 rounded-lg font-bold hover:bg-white/5">MY BOOKINGS</a>
    </div>
</div>
@endsection
