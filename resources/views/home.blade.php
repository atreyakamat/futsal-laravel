@extends('layouts.app')

@section('content')
<style>
    .arena-card:hover { transform: translateY(-8px); box-shadow: 0 12px 30px -8px rgba(13,242,32,0.35); }
    .hero-overlay { background: linear-gradient(rgba(16,34,17,0.7), rgba(16,34,17,0.95)); }
</style>

<section class="relative h-[550px] flex items-center justify-center bg-cover bg-center" style="background-image:url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')">
    <div class="absolute inset-0 hero-overlay"></div>
    <div class="relative z-10 text-center px-6 max-w-3xl">
        <h1 class="text-5xl md:text-6xl font-black leading-tight mb-6">BOOK YOUR TURF.<br><span class="text-primary">PLAY WITHOUT LIMITS.</span></h1>
        <p class="text-gray-300 text-lg mb-10">Fast, easy booking for futsal enthusiasts. No hassle, just play.</p>
        <a href="#arenas" class="inline-flex px-8 py-4 bg-primary text-black rounded-lg font-black text-lg shadow-xl shadow-primary/40 hover:bg-green-400 transition-all">START BOOKING</a>
    </div>
</section>

<section id="arenas" class="py-20">
    <div class="max-w-6xl mx-auto px-6">
        <h2 class="text-3xl font-black mb-2 uppercase">Featured Arenas</h2>
        <p class="text-gray-500 mb-10">Select an arena to book your slot</p>
        
        @if($arenas->isEmpty())
            <div class="text-center py-16 bg-white/5 rounded-xl border border-gray-800">
                <span class="material-symbols-outlined text-6xl text-gray-600 mb-4">sports_soccer</span>
                <p class="text-gray-500">No arenas available at the moment.</p>
            </div>
        @else
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            @foreach($arenas as $arena)
            <a href="{{ route('arena.show', $arena->slug) }}" class="arena-card block bg-white/5 rounded-xl border border-gray-800 overflow-hidden transition-all duration-300 hover:border-primary/50">
                <div class="h-48 bg-cover bg-center" style="background-image:url('{{ $arena->cover_image ?: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80' }}')"></div>
                <div class="p-5">
                    <h3 class="text-lg font-extrabold mb-2">{{ $arena->name }}</h3>
                    <p class="text-gray-500 text-sm mb-4 line-clamp-2 flex items-start gap-1">
                        <span class="material-symbols-outlined text-base mt-0.5">location_on</span> 
                        {{ $arena->address }}
                    </p>
                    <div class="flex justify-between items-center border-t border-gray-800 pt-4">
                        <span class="text-primary font-black text-lg">₹{{ number_format($arena->min_price) }}<small class="text-gray-500 font-normal">/hr</small></span>
                        <span class="text-sm text-primary font-bold flex items-center gap-1">Book <span class="material-symbols-outlined text-base">arrow_forward</span></span>
                    </div>
                </div>
            </a>
            @endforeach
        </div>
        @endif
    </div>
</section>

<section class="py-16 border-t border-gray-800">
    <div class="max-w-6xl mx-auto px-6">
        <h2 class="text-2xl font-bold mb-10 text-center">How It Works</h2>
        <div class="grid md:grid-cols-3 gap-8">
            <div class="text-center">
                <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-primary text-3xl">search</span>
                </div>
                <h3 class="font-bold mb-2">1. Choose Arena</h3>
                <p class="text-gray-500 text-sm">Browse available futsal arenas in your area</p>
            </div>
            <div class="text-center">
                <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-primary text-3xl">calendar_month</span>
                </div>
                <h3 class="font-bold mb-2">2. Select Slot</h3>
                <p class="text-gray-500 text-sm">Pick your preferred date and time slot</p>
            </div>
            <div class="text-center">
                <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-primary text-3xl">sports_soccer</span>
                </div>
                <h3 class="font-bold mb-2">3. Play!</h3>
                <p class="text-gray-500 text-sm">Pay online and show up to play</p>
            </div>
        </div>
    </div>
</section>
@endsection
