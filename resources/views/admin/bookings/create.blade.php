@extends('layouts.app')

@section('title', 'Admin Booking | FutsalGoa')

@section('content')
<div class="max-w-4xl mx-auto px-6 py-12">
    <div class="glass p-10 rounded-[2.5rem] border border-white/10">
        <h1 class="text-3xl font-black italic uppercase tracking-tighter mb-8 underline decoration-primary decoration-4 underline-offset-8">Admin <span class="text-primary">Booking</span></h1>

        @if(session('success'))
            <div class="p-4 mb-6 bg-primary/10 border border-primary text-primary rounded-xl font-bold text-sm">
                {{ session('success') }}
            </div>
        @endif

        <form action="{{ route('admin.bookings.store') }}" method="POST" x-data="{ isFree: false }">
            @csrf
            <div class="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Arena</label>
                    <select name="arena_id" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 focus:border-primary focus:outline-none">
                        @foreach($arenas as $arena)
                            <option value="{{ $arena->id }}">{{ $arena->name }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Date</label>
                    <input type="date" name="date" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 focus:border-primary focus:outline-none">
                </div>
            </div>

            <div class="mb-8">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Slots (Comma separated or multiple)</label>
                <input type="text" name="slots[]" placeholder="e.g. 18:00-19:00" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 focus:border-primary focus:outline-none mb-2">
                <p class="text-[10px] text-gray-600 italic">Note: For simplicity in this demo, enter one slot or use multiple inputs.</p>
            </div>

            <div class="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Customer Name</label>
                    <input type="text" name="customer_name" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 focus:border-primary focus:outline-none">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Customer Mobile</label>
                    <input type="tel" name="customer_mobile" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 focus:border-primary focus:outline-none">
                </div>
            </div>

            <div class="mb-8 flex items-center gap-4">
                <input type="checkbox" name="is_free" value="1" x-model="isFree" id="is_free" class="w-5 h-5 accent-primary">
                <label for="is_free" class="font-bold text-sm text-gray-300">Request as FREE Booking</label>
            </div>

            <div x-show="isFree" class="mb-8 p-6 glass rounded-2xl border-primary/20">
                <label class="block text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Reason for Free Booking</label>
                <textarea name="reason" rows="3" class="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 focus:border-primary focus:outline-none" placeholder="Explain why this booking should be free..."></textarea>
                <p class="text-[10px] text-primary/60 mt-2">Requires Super Admin OTP approval.</p>
            </div>

            <button type="submit" class="w-full py-5 bg-primary text-black rounded-2xl font-black text-xs tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-primary/20">
                SUBMIT BOOKING
            </button>
        </form>

        <div class="mt-12 pt-8 border-t border-white/5">
            <h2 class="text-xl font-bold uppercase mb-6">Enter <span class="text-primary">OTP</span> for Approved Free Booking</h2>
            <form action="{{ route('admin.approvals.confirm-free') }}" method="POST" class="flex gap-4">
                @csrf
                <input type="text" name="request_id" placeholder="Request ID" required class="w-24 bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                <input type="text" name="otp" placeholder="6-digit OTP" required class="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-4">
                <button type="submit" class="px-8 bg-white/10 text-white rounded-2xl font-bold text-xs tracking-widest hover:bg-white/20 transition-all uppercase">Confirm</button>
            </form>
        </div>
    </div>
</div>
@endsection
