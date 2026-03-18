@extends('layouts.app')

@section('title', $arena->name . ' | Book Your Slot')

@section('content')
<style>
    .date-card.active { background: #0df220; color: #0a0a0a; border-color: #0df220; transform: translateY(-4px); }
    .slot-card.selected { background: rgba(13, 242, 32, 0.1); border-color: #0df220; color: #0df220; }
    .slot-card.booked { opacity: 0.3; cursor: not-allowed; background: rgba(255,255,255,0.02); filter: grayscale(1); }
    .slot-card.locked { opacity: 0.5; cursor: not-allowed; background: repeating-linear-gradient(45deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 10px, rgba(255,255,255,0) 10px, rgba(255,255,255,0) 20px); }
</style>

<div x-data="bookingSystem({{ $arena->id }}, '{{ request('date', date('Y-m-d')) }}')" x-init="init()">
    <!-- Hero Header -->
    <section class="relative h-[40vh] min-h-[300px] flex items-end pb-12 overflow-hidden border-b border-white/5">
        <div class="absolute inset-0 z-0 scale-110">
            <img src="{{ $arena->cover_image ?: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1920' }}" 
                 class="w-full h-full object-cover blur-[2px] opacity-40" alt="">
            <div class="absolute inset-0 bg-gradient-to-t from-dark via-dark/80 to-transparent"></div>
        </div>
        
        <div class="max-w-7xl mx-auto px-6 relative z-10 w-full">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <a href="{{ route('home') }}" class="inline-flex items-center gap-2 text-gray-500 text-xs font-bold tracking-widest uppercase hover:text-primary transition-colors mb-6 group">
                        <span class="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                        Back to Arenas
                    </a>
                    <h1 class="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4">{{ $arena->name }}</h1>
                    <div class="flex flex-wrap items-center gap-4 text-sm">
                        <span class="flex items-center gap-1.5 text-gray-400 font-medium">
                            <span class="material-symbols-outlined text-primary text-lg">location_on</span>
                            {{ $arena->address }}
                        </span>
                        <span class="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                        <span class="flex items-center gap-1.5 text-gray-400 font-medium uppercase tracking-wider text-[10px]">
                            <span class="material-symbols-outlined text-primary text-lg">verified</span>
                            FIFA Approved Turf
                        </span>
                    </div>
                </div>
                <div class="glass p-6 rounded-3xl text-right md:min-w-[200px]">
                    <span class="text-gray-500 text-[10px] uppercase font-bold block mb-1">Current Pricing</span>
                    <span class="text-3xl font-black text-primary italic">₹{{ number_format($arena->min_price ?? 500) }}<small class="text-white text-xs font-normal not-italic ml-1">/HR</small></span>
                </div>
            </div>
        </div>
    </section>

    <!-- Main Booking UI -->
    <section class="py-20 max-w-7xl mx-auto px-6">
        <div class="grid lg:grid-cols-12 gap-12">
            
            <!-- Left Side: Selection -->
            <div class="lg:col-span-8 space-y-12">
                
                <!-- Date Picker -->
                <div>
                    <div class="flex items-center justify-between mb-8">
                        <h2 class="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                            <span class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <span class="material-symbols-outlined text-lg">calendar_month</span>
                            </span>
                            1. Choose Date
                        </h2>
                    </div>
                    
                    <div class="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 no-scrollbar">
                        @for ($i = 0; $i < 14; $i++)
                            @php
                                $d = date('Y-m-d', strtotime("+$i days"));
                                $is_selected = ($d === request('date', date('Y-m-d')));
                            @endphp
                            <a href="?date={{ $d }}" 
                               class="date-card flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl border border-white/5 glass transition-all duration-300 {{ $is_selected ? 'active' : 'hover:border-primary/30' }}">
                                <span class="text-[10px] font-bold uppercase mb-1 opacity-60">{{ date('D', strtotime($d)) }}</span>
                                <span class="text-2xl font-black mb-1">{{ date('d', strtotime($d)) }}</span>
                                <span class="text-[10px] font-bold uppercase opacity-60">{{ date('M', strtotime($d)) }}</span>
                            </a>
                        @endfor
                    </div>
                </div>

                <!-- Slot Grid -->
                <div>
                    <div class="flex items-center justify-between mb-8">
                        <h2 class="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                            <span class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <span class="material-symbols-outlined text-lg">schedule</span>
                            </span>
                            2. Pick Slots
                        </h2>
                        <div class="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-primary"></span> Available</div>
                            <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-white/10"></span> Taken</div>
                        </div>
                    </div>

                    <div x-show="loading" class="py-20 flex flex-col items-center justify-center glass rounded-3xl border-dashed border-white/10">
                        <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                        <span class="text-xs font-bold tracking-widest text-gray-500 uppercase">Fetching live availability...</span>
                    </div>

                    <div x-show="!loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        <template x-for="slot in slots" :key="slot.time_slot">
                            <button type="button" 
                                @click="toggleSlot(slot)"
                                class="slot-card p-6 rounded-2xl border border-white/5 glass text-center transition-all duration-300 group relative overflow-hidden"
                                :class="{
                                    'booked': slot.status === 'booked',
                                    'locked': slot.status === 'locked',
                                    'selected': isSelected(slot.time_slot),
                                    'hover:border-primary/50 hover:scale-[1.02]': slot.status === 'available' && !isSelected(slot.time_slot)
                                }"
                                :disabled="slot.status === 'booked' || slot.status === 'locked'">
                                
                                <div class="text-lg font-black tracking-tight mb-1" x-text="slot.time_slot"></div>
                                <div class="text-[10px] font-bold uppercase tracking-widest opacity-60" x-text="slot.status === 'available' ? '₹' + slot.price : slot.status"></div>
                                
                                <div x-show="isSelected(slot.time_slot)" class="absolute top-2 right-2">
                                    <span class="material-symbols-outlined text-sm">check_circle</span>
                                </div>
                            </button>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Right Side: Sidebar Summary -->
            <div class="lg:col-span-4">
                <div class="glass p-8 rounded-[2.5rem] border border-white/10 sticky top-28 shadow-2xl shadow-black/50">
                    <h3 class="text-xl font-black uppercase tracking-tighter mb-8 italic">Booking <span class="text-primary">Summary</span></h3>
                    
                    <div class="space-y-6 mb-8">
                        <div class="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500">
                            <span>Selected Slots</span>
                            <span x-text="selectedSlots.length" class="text-white"></span>
                        </div>
                        
                        <div class="space-y-3 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                            <template x-if="selectedSlots.length === 0">
                                <div class="py-8 text-center glass rounded-2xl border-dashed border-white/5">
                                    <p class="text-[10px] font-bold text-gray-600 uppercase tracking-widest">No slots selected yet</p>
                                </div>
                            </template>
                            <template x-for="s in selectedSlots" :key="s.time_slot">
                                <div class="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 animate-in fade-in slide-in-from-right-4">
                                    <div>
                                        <div class="font-bold text-sm" x-text="s.time_slot"></div>
                                        <div class="text-[10px] text-gray-500 font-bold uppercase tracking-widest" x-text="formatDate(date)"></div>
                                    </div>
                                    <div class="text-primary font-black">₹<span x-text="s.price"></span></div>
                                </div>
                            </template>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-white/5 space-y-4">
                        <div class="flex justify-between items-end">
                            <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Amount</span>
                            <span class="text-3xl font-black text-white italic">₹<span x-text="total"></span></span>
                        </div>
                        
                        <button type="button" 
                            @click="proceedToCheckout"
                            :disabled="selectedSlots.length === 0 || processing" 
                            class="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                            <span x-show="!processing" x-text="selectedSlots.length > 0 ? 'PROCEED TO CHECKOUT' : 'SELECT YOUR SLOTS'"></span>
                            <span x-show="processing" class="flex items-center gap-2">
                                <div class="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                                LOCKING SLOTS...
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

<script>
function bookingSystem(arenaId, initialDate) {
    return {
        arenaId: arenaId,
        date: initialDate,
        slots: [],
        selectedSlots: [],
        loading: true,
        processing: false,
        total: 0,

        init() {
            this.fetchSlots();
            // Auto-refresh availability every 30 seconds
            setInterval(() => this.fetchSlots(), 30000);
        },

        async fetchSlots() {
            // Only show initial loading spinner, not on background refreshes
            if (this.slots.length === 0) this.loading = true;
            
            try {
                const response = await fetch(`/api/slots/status?arena_id=${this.arenaId}&date=${this.date}`);
                const data = await response.json();
                this.slots = data.slots;
                
                // Keep selected slots only if they are still available or currently selected by me
                this.selectedSlots = this.selectedSlots.filter(s => 
                    this.slots.some(slot => slot.time_slot === s.time_slot && (slot.status === 'available' || slot.status === 'selected'))
                );
                this.calculateTotal();
            } catch (e) {
                console.error('Failed to fetch slots', e);
            } finally {
                this.loading = false;
            }
        },

        async toggleSlot(slot) {
            const index = this.selectedSlots.findIndex(s => s.time_slot === slot.time_slot);
            
            if (index > -1) {
                // Unlock on server
                await fetch('/api/slots/unlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
                    body: JSON.stringify({ arena_id: this.arenaId, date: this.date, slots: [slot.time_slot] })
                });
                this.selectedSlots.splice(index, 1);
            } else {
                // Lock on server proactively
                const response = await fetch('/api/slots/lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': '{{ csrf_token() }}' },
                    body: JSON.stringify({ arena_id: this.arenaId, date: this.date, slots: [slot.time_slot] })
                });
                const data = await response.json();
                
                if (data.success) {
                    this.selectedSlots.push(slot);
                } else {
                    alert('This slot was just taken. Refreshing...');
                    this.fetchSlots();
                }
            }
            this.calculateTotal();
        },

        isSelected(timeSlot) {
            return this.selectedSlots.some(s => s.time_slot === timeSlot);
        },

        calculateTotal() {
            this.total = this.selectedSlots.reduce((sum, s) => sum + parseFloat(s.price), 0);
        },

        formatDate(dateStr) {
            return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' });
        },

        async proceedToCheckout() {
            this.processing = true;
            const slotsArr = this.selectedSlots.map(s => s.time_slot);
            
            try {
                const response = await fetch('/api/slots/lock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: JSON.stringify({
                        arena_id: this.arenaId,
                        date: this.date,
                        slots: slotsArr
                    })
                });

                const data = await response.json();
                if (data.success) {
                    window.location.href = `/checkout?arena_id=${this.arenaId}&date=${this.date}&slots=${JSON.stringify(slotsArr)}`;
                } else {
                    alert('Some selected slots were just taken by someone else. Refreshing...');
                    this.fetchSlots();
                }
            } catch (e) {
                alert('Error locking slots. Please try again.');
            } finally {
                this.processing = false;
            }
        }
    }
}
</script>
@endsection
