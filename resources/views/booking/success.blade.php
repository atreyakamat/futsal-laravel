@extends('layouts.app')

@section('title', 'Booking Successful')

@section('content')
<div class="max-w-4xl mx-auto px-6 py-20">
    <div class="text-center mb-12">
        <div class="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <span class="material-symbols-outlined text-primary text-5xl font-black">check_circle</span>
        </div>
        <h1 class="text-5xl md:text-7xl font-black mb-4 tracking-tighter italic text-primary uppercase">BOOKING CONFIRMED!</h1>
        <p class="text-gray-400 font-bold tracking-widest uppercase text-xs">Your slot at {{ $booking->arena->name }} is now yours.</p>

        <!-- Booking Summary -->
        <div class="mt-8 glass inline-block px-8 py-4 rounded-2xl border border-primary/30">
            <div class="flex items-center gap-6 text-sm">
                <div class="text-left">
                    <span class="text-gray-500 text-[10px] tracking-widest uppercase block">Date</span>
                    <span class="font-bold text-white">{{ $booking->booking_date->format('d M Y') }}</span>
                </div>
                <div class="w-px h-8 bg-primary/30"></div>
                <div class="text-left">
                    <span class="text-gray-500 text-[10px] tracking-widest uppercase block">Time</span>
                    <span class="font-bold text-primary">{{ $mergedSlots }}</span>
                </div>
                <div class="w-px h-8 bg-primary/30"></div>
                <div class="text-left">
                    <span class="text-gray-500 text-[10px] tracking-widest uppercase block">Duration</span>
                    <span class="font-bold text-white">{{ $duration }}</span>
                </div>
                <div class="w-px h-8 bg-primary/30"></div>
                <div class="text-left">
                    <span class="text-gray-500 text-[10px] tracking-widest uppercase block">Total</span>
                    <span class="font-bold text-white">Rs. {{ number_format($totalAmount, 0) }}</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
        <!-- Ticket Card -->
        <div class="glass p-10 rounded-[3rem] border border-primary/20 relative overflow-hidden flex flex-col items-center">
            <div class="absolute top-0 right-0 p-10 opacity-5">
                <span class="material-symbols-outlined text-8xl">qr_code_2</span>
            </div>
            
            <div class="bg-white p-6 rounded-3xl mb-8 shadow-2xl shadow-primary/30">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={{ $booking->ticket_number }}" alt="Ticket QR" class="w-48 h-48">
            </div>
            
            <div class="text-center space-y-2">
                <span class="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px]">Ticket Number</span>
                <h2 class="text-3xl font-black tracking-tight text-white">{{ $booking->ticket_number }}</h2>
                <div class="pt-4 flex justify-center">
                    <a href="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data={{ $booking->ticket_number }}" download="futsalgoa-ticket.png" 
                       class="flex items-center gap-2 px-6 py-2 glass rounded-full text-[10px] font-bold tracking-widest hover:bg-primary hover:text-black transition-all">
                        <span class="material-symbols-outlined text-sm">download</span> DOWNLOAD QR
                    </a>
                </div>
            </div>
        </div>

        <!-- Details List -->
        <div class="space-y-8">
            <div class="glass p-8 rounded-[2rem] border border-white/5">
                <h3 class="font-black text-xs text-primary uppercase tracking-widest mb-8 italic underline decoration-primary decoration-4 underline-offset-8">Next Steps</h3>
                <ul class="space-y-8">
                    <li class="flex gap-6">
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">01</div>
                        <div>
                            <p class="font-bold text-sm mb-1">Check Your Phone/Email</p>
                            <p class="text-xs text-gray-500 leading-relaxed">We've sent your digital ticket via WhatsApp and Email. Keep it safe!</p>
                        </div>
                    </li>
                    <li class="flex gap-6">
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">02</div>
                        <div>
                            <p class="font-bold text-sm mb-1">Show QR at Entry</p>
                            <p class="text-xs text-gray-500 leading-relaxed">Present the QR code above or the one in your WhatsApp message at the arena security desk.</p>
                        </div>
                    </li>
                    <li class="flex gap-6">
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">03</div>
                        <div>
                            <p class="font-bold text-sm mb-1">Play Your Match</p>
                            <p class="text-xs text-gray-500 leading-relaxed">Get your gear ready and enjoy your game at {{ $booking->arena->name }}.</p>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="flex gap-4">
                <a href="{{ route('home') }}" class="flex-1 py-5 bg-primary text-black rounded-2xl font-black text-xs tracking-widest text-center shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">BOOK ANOTHER</a>
                <a href="{{ route('my-bookings') }}" class="flex-1 py-5 glass text-white rounded-2xl font-black text-xs tracking-widest text-center hover:bg-white/5 transition-all">MY BOOKINGS</a>
            </div>
        </div>
    </div>
</div>
@endsection
