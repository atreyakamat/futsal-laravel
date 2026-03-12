@extends('layouts.app')

@section('title', 'Checkout')

@section('content')
<div class="max-w-4xl mx-auto px-6 py-12">
    <h1 class="text-3xl font-black mb-8 italic">CHECKOUT</h1>
    
    <div class="grid md:grid-cols-2 gap-12">
        <div class="space-y-8">
            <div class="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 class="font-bold text-lg mb-4 text-primary">Your Selection</h2>
                <div class="space-y-3">
                    <p class="text-white/60 text-sm">Arena: <span class="text-white font-bold">{{ $arena->name }}</span></p>
                    <p class="text-white/60 text-sm">Date: <span class="text-white font-bold">{{ date('D, d M Y', strtotime($date)) }}</span></p>
                    <div class="border-t border-white/10 pt-3">
                        @foreach($pricing as $p)
                        <div class="flex justify-between text-sm mb-1">
                            <span>{{ $p->time_slot }}</span>
                            <span class="text-primary font-bold">₹{{ number_format($p->price) }}</span>
                        </div>
                        @endforeach
                    </div>
                    <div class="border-t border-white/10 pt-3 flex justify-between font-black text-xl">
                        <span>Total</span>
                        <span class="text-primary">₹{{ number_format($total) }}</span>
                    </div>
                </div>
            </div>

            <p class="text-xs text-white/40">These slots are temporarily locked for you. Please complete the booking within 2 minutes.</p>
        </div>

        <div>
            <form action="{{ route('booking.process') }}" method="POST" class="space-y-4">
                @csrf
                <input type="hidden" name="arena_id" value="{{ $arena->id }}">
                <input type="hidden" name="date" value="{{ $date }}">
                <input type="hidden" name="slots" value="{{ json_encode($slots) }}">

                <div>
                    <label class="block text-sm font-bold mb-2 text-white/60 uppercase">Full Name</label>
                    <input type="text" name="customer_name" required class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary">
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2 text-white/60 uppercase">Mobile Number</label>
                    <input type="tel" name="customer_mobile" required class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary">
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2 text-white/60 uppercase">Email Address (Optional)</label>
                    <input type="email" name="customer_email" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary">
                </div>

                <div class="pt-6">
                    <button type="submit" class="w-full py-4 rounded-xl font-black text-lg bg-primary text-black hover:opacity-90 shadow-xl shadow-primary/20">
                        CONFIRM & PAY ₹{{ number_format($total) }}
                    </button>
                    <p class="text-center text-[10px] text-white/30 mt-4 uppercase tracking-widest">Secure Payment Powered by PayU</p>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
