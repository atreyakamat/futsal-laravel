<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'FutsalGoa | Premium Booking')</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#0df220',
                        dark: '#0a0a0a',
                        surface: '#121212'
                    },
                    fontFamily: {
                        sans: ['Space Grotesk', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #0a0a0a; color: #ffffff; scroll-behavior: smooth; }
        .text-primary { color: #0df220; }
        .bg-primary { background-color: #0df220; }
        .border-primary { border-color: #0df220; }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #0df220; }

        .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .glass:hover { border-color: rgba(13, 242, 32, 0.3); }
        
        .noise { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.03; z-index: 9999; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"); }
    </style>
</head>
<body class="antialiased">
    <div class="noise"></div>
    <nav class="border-b border-white/5 py-4 sticky top-0 z-50 glass">
        <div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <a href="/" class="text-2xl font-black text-primary italic tracking-tighter">FUTSAL<span class="text-white">GOA</span></a>
            <div class="flex gap-4 md:gap-8 items-center">
                @auth
                    <a href="{{ route('my-bookings') }}" class="text-[10px] font-bold tracking-widest text-gray-400 hover:text-primary transition-colors uppercase">MY BOOKINGS</a>
                    <form action="{{ route('logout') }}" method="POST" class="inline">
                        @csrf
                        <button type="submit" class="px-5 py-2 glass rounded-full text-[10px] font-bold tracking-widest hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 transition-all uppercase">LOGOUT</button>
                    </form>
                @else
                    <a href="{{ route('login') }}" class="px-5 py-2 glass rounded-full text-[10px] font-bold tracking-widest hover:bg-primary hover:text-black transition-all uppercase">LOGIN</a>
                @endauth
            </div>
        </div>
    </nav>

    @if(session('error'))
    <div class="max-w-6xl mx-auto px-6 mt-4">
        <div class="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg flex items-center gap-2">
            <span class="material-symbols-outlined">error</span>
            {{ session('error') }}
        </div>
    </div>
    @endif

    <main>
        @yield('content')
    </main>

    <footer class="py-10 border-t border-white/10 mt-20 bg-black/50">
        <div class="max-w-6xl mx-auto px-6 text-center">
            <p class="text-gray-500 text-sm">© {{ date('Y') }} Futsal Booking Platform. All rights reserved.</p>
        </div>
    </footer>

    <x-ai-chat-popup />
</body>
</html>
