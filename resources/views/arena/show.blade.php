@extends('layouts.app')

@section('title', $arena->name . ' - Book Now')

@section('content')
<style>
    .slot-btn.selected { background: #0df220 !important; color: #0a0a0a !important; }
</style>

<!-- Hero -->
<section class="relative pt-0">
    <div class="h-72 md:h-96 bg-cover bg-center relative" style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(11,15,20,0.95)), url('{{ $arena->cover_image ?: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1920' }}')">
        <div class="max-w-6xl mx-auto px-6 h-full flex flex-col justify-end pb-10">
            <a href="{{ route('home') }}" class="text-white/50 text-sm mb-3 hover:text-primary">← All Arenas</a>
            <h1 class="text-4xl md:text-5xl font-black mb-2">{{ $arena->name }}</h1>
            <p class="text-white/60 text-lg mb-4">Book your slot and play!</p>
            <div class="flex items-center gap-4">
                <span class="bg-primary/20 text-primary px-4 py-2 rounded font-bold text-sm">From ₹{{ number_format($arena->min_price ?? 500) }}/hr</span>
                <span class="text-white/50 text-sm flex items-center gap-1">
                    <span class="material-symbols-outlined text-lg">location_on</span>
                    {{ $arena->address }}
                </span>
            </div>
        </div>
    </div>
</section>

<!-- Booking Section -->
<section id="book" class="max-w-6xl mx-auto px-6 py-12" x-data="bookingSystem({{ $arena->id }}, '{{ request('date', date('Y-m-d')) }}')">
    <div class="grid lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
            <!-- Date Selection -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 class="font-bold text-lg mb-4">Select Date</h2>
                <div class="flex flex-wrap gap-2">
                    @for ($i = 0; $i < 14; $i++)
                        @php
                            $d = date('Y-m-d', strtotime("+$i days"));
                            $is_selected = ($d === request('date', date('Y-m-d')));
                        @endphp
                        <a href="?date={{ $d }}#book" 
                           class="flex flex-col items-center px-4 py-3 rounded-lg border transition-all {{ $is_selected ? 'bg-primary text-black border-primary font-bold' : 'bg-white/5 border-white/10 hover:border-primary/50' }}">
                            <span class="text-xs uppercase">{{ date('D', strtotime($d)) }}</span>
                            <span class="text-xl font-bold">{{ date('d', strtotime($d)) }}</span>
                            <span class="text-xs">{{ date('M', strtotime($d)) }}</span>
                        </a>
                    @endfor
                </div>
            </div>
            
            <!-- Slots -->
            <div class="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 class="font-bold text-lg mb-4">Available Slots - <span x-text="formatDate(date)"></span></h2>
                
                <div x-show="loading" class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>

                <div x-show="!loading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <template x-for="slot in slots" :key="slot.time_slot">
                        <button type="button" 
                            @click="toggleSlot(slot)"
                            class="p-4 border rounded-xl text-center transition-all"
                            :class="{
                                'bg-red-500/20 border-red-500/50 text-red-400 opacity-50 cursor-not-allowed': slot.status === 'booked',
                                'bg-orange-500/20 border-orange-500/50 text-orange-400 opacity-50 cursor-not-allowed': slot.status === 'locked',
                                'selected bg-primary text-black border-primary': isSelected(slot.time_slot),
                                'bg-white/5 border-white/10 hover:border-primary/50': slot.status === 'available' && !isSelected(slot.time_slot)
                            }"
                            :disabled="slot.status === 'booked' || slot.status === 'locked'">
                            <div class="font-bold text-sm" x-text="slot.time_slot"></div>
                            <div class="text-xs mt-1">
                                <span x-show="slot.status === 'booked'">Booked</span>
                                <span x-show="slot.status === 'locked'">Reserved</span>
                                <span x-show="slot.status === 'available' || slot.status === 'selected'" class="text-primary" :class="isSelected(slot.time_slot) ? 'text-black' : ''">₹<span x-text="slot.price"></span></span>
                            </div>
                        </button>
                    </template>
                </div>
            </div>
        </div>
        
        <!-- Summary -->
        <div>
            <div class="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-24">
                <h3 class="font-bold text-lg mb-4">Summary</h3>
                <div class="space-y-2 mb-4 text-sm">
                    <template x-if="selectedSlots.length === 0">
                        <p class="text-white/40">No slots selected</p>
                    </template>
                    <template x-for="s in selectedSlots" :key="s.time_slot">
                        <div class="flex justify-between">
                            <span x-text="s.time_slot"></span>
                            <span class="text-primary">₹<span x-text="s.price"></span></span>
                        </div>
                    </template>
                </div>
                <div class="border-t border-white/10 my-4"></div>
                <div class="flex justify-between text-lg font-bold mb-6">
                    <span>Total</span>
                    <span class="text-primary">₹<span x-text="total"></span></span>
                </div>
                
                <button type="button" 
                    @click="proceedToCheckout"
                    :disabled="selectedSlots.length === 0 || processing" 
                    class="w-full py-4 rounded-xl font-bold text-lg bg-primary text-black hover:opacity-90 disabled:bg-white/10 disabled:text-white/30">
                    <span x-show="!processing" x-text="selectedSlots.length > 0 ? 'PAY ₹' + total : 'SELECT SLOTS'"></span>
                    <span x-show="processing">Locking...</span>
                </button>
            </div>
        </div>
    </div>
</section>

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
        },

        async fetchSlots() {
            this.loading = true;
            try {
                const response = await fetch(`/api/slots/status?arena_id=${this.arenaId}&date=${this.date}`);
                const data = await response.json();
                this.slots = data.slots;
                
                // Keep already selected slots if they are still available
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

        toggleSlot(slot) {
            const index = this.selectedSlots.findIndex(s => s.time_slot === slot.time_slot);
            if (index > -1) {
                this.selectedSlots.splice(index, 1);
            } else {
                this.selectedSlots.push(slot);
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
