@extends('layouts.app')

@section('title', '404 - Page Not Found | Agnel Futsal Arena')

@section('content')
<div class="max-w-4xl mx-auto px-6 py-32 text-center">
    <div class="mb-8">
        <h1 class="text-9xl font-black text-primary opacity-20">404</h1>
        <div class="relative -mt-20">
            <h2 class="text-4xl font-black uppercase italic tracking-tighter">OUT OF <span class="text-primary">BOUNDS</span></h2>
            <p class="text-gray-500 mt-4 text-lg">The page you're looking for has left the pitch.</p>
        </div>
    </div>
    
    <div class="flex flex-col sm:flex-row gap-4 justify-center mt-12">
        <a href="{{ route('home') }}" class="px-10 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all">BACK TO HOME</a>

    </div>
</div>
@endsection
