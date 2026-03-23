@extends('layouts.app')

@section('title', 'Secure Checkout | FutsalGoa')

@section('content')
<div class="max-w-6xl mx-auto px-6 py-20">
    <div class="flex items-center gap-4 mb-12">
        <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined">shield_lock</span>
        </div>
        <div>
            <h1 class="text-3xl font-black uppercase tracking-tighter italic">SECURE <span class="text-primary">CHECKOUT</span></h1>
            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Complete your booking for {{ $arena->name }}</p>
        </div>
    </div>

    @if(isset($errors) && $errors->any())
    <div class="mb-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
        <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-red-400">error</span>
            <div>
                <p class="text-sm font-bold text-red-300">Please fix the following and try again:</p>
                <ul class="mt-2 space-y-1 text-xs text-red-200 list-disc ml-4">
                    @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        </div>
    </div>
    @endif
    
    <div class="grid lg:grid-cols-12 gap-16">
        <!-- Booking Details -->
        <div class="lg:col-span-5 space-y-8">
            <div class="glass p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-8 opacity-5">
                    <span class="material-symbols-outlined text-8xl">receipt_long</span>
                </div>
                
                <h2 class="font-black text-sm mb-8 text-primary uppercase tracking-[0.2em]">Reservation Details</h2>
                
                <div class="space-y-6">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-400">
                            <span class="material-symbols-outlined text-lg">stadium</span>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Arena</span>
                            <span class="text-lg font-bold text-white">{{ $arena->name }}</span>
                        </div>
                    </div>
                    
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-400">
                            <span class="material-symbols-outlined text-lg">calendar_today</span>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Date</span>
                            <span class="text-lg font-bold text-white">{{ date('l, d F Y', strtotime($date)) }}</span>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-white/5">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-4">Selected Slots</span>
                        <div class="space-y-3">
                            @foreach($pricing as $p)
                            <div class="flex justify-between items-center p-3 rounded-xl bg-white/5 text-sm">
                                <span class="font-bold">{{ $p->time_slot }}</span>
                                <span class="text-primary font-black">₹{{ number_format($p->price) }}</span>
                            </div>
                            @endforeach
                        </div>
                    </div>

                    <div class="pt-6 border-t border-white/5 flex justify-between items-end">
                        <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Total to Pay</span>
                        <span class="text-4xl font-black text-white italic">₹{{ number_format($total) }}</span>
                    </div>
                </div>
            </div>

            <div class="flex items-start gap-3 p-4 glass rounded-2xl border-primary/20 bg-primary/5">
                <span class="material-symbols-outlined text-primary text-lg">timer</span>
                <p class="text-[10px] font-bold text-primary/80 uppercase tracking-widest leading-relaxed">
                    These slots are temporarily locked for your session. Complete the booking within <span class="text-white">10 minutes</span> to avoid losing your selection.
                </p>
            </div>
        </div>

        <!-- Checkout Form -->
        <div class="lg:col-span-7">
            <div class="glass p-10 rounded-[2.5rem] border border-white/10">
                <form action="{{ route('booking.process') }}" method="POST" class="space-y-8">
                    @csrf
                    <input type="hidden" name="arena_id" value="{{ $arena->id }}">
                    <input type="hidden" name="date" value="{{ $date }}">
                    <input type="hidden" name="slots" value="{{ json_encode($slots) }}">

                    <div class="grid md:grid-cols-2 gap-8">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                            <div class="relative">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">person</span>
                                <input type="text" name="customer_name" required 
                                       placeholder="John Doe"
                                       value="{{ old('customer_name') }}"
                                       class="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-700">
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Mobile Number</label>
                            <div class="relative">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">phone_iphone</span>
                                <input type="tel" name="customer_mobile" required 
                                       placeholder="+91 98765 43210"
                                       value="{{ old('customer_mobile') }}"
                                       class="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-700">
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address <span class="text-gray-700 lowercase italic">(optional)</span></label>
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">mail</span>
                            <input type="email" name="customer_email" 
                                   placeholder="john@example.com"
                                   value="{{ old('customer_email') }}"
                                   class="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-700">
                        </div>
                    </div>

                    <div class="pt-8 space-y-6">
                        <button type="submit" class="w-full py-6 rounded-[2rem] font-black text-sm tracking-[0.2em] bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20 flex items-center justify-center gap-3">
                            <span>CONFIRM & PAY ₹{{ number_format($total) }}</span>
                            <span class="material-symbols-outlined font-black">arrow_forward</span>
                        </button>
                        
                        <div class="flex items-center justify-center gap-6 opacity-30 grayscale">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Visa.svg/1200px-Visa.svg.png" class="h-4" alt="Visa">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" class="h-6" alt="Mastercard">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png" class="h-4" alt="UPI">
                        </div>
                        
                        <p class="text-center text-[9px] text-gray-600 uppercase tracking-[0.3em]">End-to-End Encrypted Secure Checkout</p>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
