@extends('layouts.app')

@section('title', '500 - Server Error | Agnel Futsal Arena')

@section('content')
<div class="max-w-4xl mx-auto px-6 py-32 text-center">
    <div class="mb-8">
        <h1 class="text-9xl font-black text-red-500 opacity-20">500</h1>
        <div class="relative -mt-20">
            <h2 class="text-4xl font-black uppercase italic tracking-tighter text-white">TECHNICAL <span class="text-red-500">FOUL</span></h2>
            <p class="text-gray-500 mt-4 text-lg">Something went wrong on our end. We're fixing the turf!</p>
        </div>
    </div>
    
    <div class="flex flex-col sm:flex-row gap-4 justify-center mt-12">
        <a href="{{ route('home') }}" class="px-10 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all">BACK TO HOME</a>
        <a href="mailto:support@futsalgoa.com" class="px-10 py-4 glass text-white rounded-full font-black text-xs tracking-widest hover:bg-white/5 transition-all">CONTACT SUPPORT</a>
    </div>
</div>
@endsection
