@extends('layouts.app')

@section('content')
<style>
    .arena-card:hover { transform: translateY(-8px); }
    .hero-overlay { background: radial-gradient(circle at center, rgba(13,242,32,0.1) 0%, rgba(10,10,10,0.9) 100%); }
    .text-stroke { -webkit-text-stroke: 1px rgba(13,242,32,0.5); color: transparent; }
</style>

<!-- Hero Section -->
<section class="relative min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-white/5">
    <div class="absolute inset-0 z-0 bg-cover bg-center scale-105 transition-transform duration-1000" style="background-image:url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=90')"></div>
    <div class="absolute inset-0 z-10 hero-overlay"></div>
    
    <div class="relative z-20 text-center px-6 max-w-5xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-8 animate-bounce">
            <span class="w-2 h-2 rounded-full bg-primary"></span>
            <span class="text-[10px] font-bold tracking-widest text-primary uppercase">Now Open in Pilar</span>
        </div>
        <h1 class="text-6xl md:text-8xl font-black leading-none mb-8 tracking-tighter">
            <span class="block">BOOK. PLAY.</span>
            <span class="text-primary block italic">DOMINATE.</span>
        </h1>
        <p class="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Experience the future of futsal in Goa. Premium turfs, AI-powered booking, and a professional atmosphere for true ballers.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#arenas" class="px-10 py-5 bg-primary text-black rounded-full font-black text-sm tracking-widest shadow-2xl shadow-primary/40 hover:scale-105 transition-all active:scale-95">BOOK A TURF</a>

        </div>
    </div>

    <!-- Decorative floating elements -->
    <div class="absolute bottom-10 left-10 hidden lg:block opacity-20">
        <div class="text-8xl font-black text-stroke italic">GOA</div>
    </div>
</section>

<!-- Arenas Section -->
<section id="arenas" class="py-32 bg-dark" x-data="{ 
    search: '',
    arenas: {{ $arenas->toJson() }},
    get filteredArenas() {
        if (!this.search) return this.arenas;
        return this.arenas.filter(a => 
            a.name.toLowerCase().includes(this.search.toLowerCase()) || 
            a.address.toLowerCase().includes(this.search.toLowerCase())
        );
    }
}">
    <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div class="flex-1">
                <h2 class="text-4xl font-black mb-4 tracking-tighter uppercase">Our <span class="text-primary">Arenas</span></h2>
                <div class="relative max-w-md">
                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">search</span>
                    <input type="text" 
                           x-model="search"
                           placeholder="Search by arena name or location..." 
                           class="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-700">
                </div>
            </div>
            <div class="text-right hidden md:block">
                <span class="text-primary font-bold text-5xl" x-text="String(filteredArenas.length).padStart(2, '0')"></span>
                <span class="block text-gray-600 text-[10px] tracking-widest font-bold uppercase mt-1">Available Spots</span>
            </div>
        </div>
        
        <div x-show="filteredArenas.length === 0" class="text-center py-24 glass rounded-3xl border-dashed border-white/10" x-cloak>
            <span class="material-symbols-outlined text-8xl text-gray-800 mb-6">search_off</span>
            <p class="text-gray-500 font-bold uppercase tracking-widest">No arenas match your search.</p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            <template x-for="arena in filteredArenas" :key="arena.id">
                <div class="group">
                    <a :href="'/arena/' + arena.slug" class="arena-card block glass rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                        <div class="h-64 overflow-hidden relative">
                            <img :src="arena.cover_image || 'https://images.unsplash.com/photo-1551958219-acbc608c6377?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'" 
                                 class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                 :alt="arena.name">
                            <div class="absolute top-4 left-4">
                                <span class="glass px-3 py-1 rounded-full text-[10px] font-bold text-white tracking-widest uppercase">Goa, IN</span>
                            </div>
                        </div>
                        <div class="p-8">
                            <div class="flex justify-between items-start mb-6">
                                <div>
                                    <h3 class="text-xl font-bold mb-2 group-hover:text-primary transition-colors" x-text="arena.name"></h3>
                                    <p class="text-gray-500 text-xs flex items-center gap-1.5 font-medium">
                                        <span class="material-symbols-outlined text-sm text-primary">location_on</span> 
                                        <span x-text="arena.address"></span>
                                    </p>
                                </div>
                            </div>
                            <div class="flex justify-between items-center pt-6 border-t border-white/5">
                                <div>
                                    <span class="text-gray-500 text-[10px] uppercase font-bold block mb-1">Starting At</span>
                                    <span class="text-2xl font-black text-white italic">₹<span x-text="new Intl.NumberFormat().format(arena.min_price)"></span><small class="text-gray-600 text-xs font-normal not-italic ml-1">/HR</small></span>
                                </div>
                                <span class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black group-hover:translate-x-1 transition-transform">
                                    <span class="material-symbols-outlined font-black">arrow_outward</span>
                                </span>
                            </div>
                        </div>
                    </a>
                </div>
            </template>
        </div>
    </div>
</section>

<!-- Features Section -->
<section class="py-32 border-t border-white/5 bg-surface relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-6 relative z-10">
        <h2 class="text-center text-3xl font-black mb-20 tracking-tighter uppercase">The <span class="text-primary italic">FutsalGoa</span> Experience</h2>
        <div class="grid md:grid-cols-3 gap-16">
            <div class="space-y-6">
                <div class="w-14 h-14 glass rounded-2xl flex items-center justify-center border-primary/20">
                    <span class="material-symbols-outlined text-primary text-3xl">bolt</span>
                </div>
                <h3 class="text-xl font-bold">Instant Booking</h3>
                <p class="text-gray-500 text-sm leading-relaxed">Lock your favorite slot in seconds with our high-speed booking engine. Real-time availability, zero lag.</p>
            </div>

            <div class="space-y-6">
                <div class="w-14 h-14 glass rounded-2xl flex items-center justify-center border-primary/20">
                    <span class="material-symbols-outlined text-primary text-3xl">verified</span>
                </div>
                <h3 class="text-xl font-bold">Pro Turfs</h3>
                <p class="text-gray-500 text-sm leading-relaxed">We maintain the highest standards for our fields, ensuring consistent bounce and player safety at all times.</p>
            </div>
        </div>
    </div>
</section>
@endsection
