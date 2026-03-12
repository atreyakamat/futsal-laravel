<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Futsal Booking Platform')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#0df220',
                        dark: '#0a0a0a',
                        surface: '#1a1a1a'
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #0a0a0a; color: #ffffff; }
        .text-primary { color: #0df220; }
        .bg-primary { background-color: #0df220; }
        .border-primary { border-color: #0df220; }
    </style>
</head>
<body>
    <nav class="border-b border-white/10 py-4">
        <div class="max-w-6xl mx-auto px-6 flex justify-between items-center">
            <a href="/" class="text-2xl font-black text-primary italic">FUTSAL<span class="text-white">GOA</span></a>
            <div class="flex gap-6 items-center">
                <a href="/chat" class="text-sm font-bold hover:text-primary transition-colors">AI ASSISTANT</a>
                <a href="/login" class="px-4 py-2 border border-white/20 rounded-lg text-sm font-bold hover:bg-white/5 transition-all">LOGIN</a>
            </div>
        </div>
    </nav>

    <main>
        @yield('content')
    </main>

    <footer class="py-10 border-t border-white/10 mt-20 bg-black/50">
        <div class="max-w-6xl mx-auto px-6 text-center">
            <p class="text-gray-500 text-sm">© {{ date('Y') }} Futsal Booking Platform. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>
