@extends('layouts.app')

@section('title', 'Pending Approvals | FutsalGoa')

@section('content')
<div class="max-w-6xl mx-auto px-6 py-12">
    <h1 class="text-3xl font-black italic uppercase tracking-tighter mb-12">Super Admin <span class="text-primary">Approvals</span></h1>

    @if(session('success'))
        <div class="p-4 mb-8 bg-primary/10 border border-primary text-primary rounded-xl font-bold text-sm">
            {{ session('success') }}
        </div>
    @endif

    <div class="grid gap-6">
        @forelse($requests as $request)
            <div class="glass p-8 rounded-[2.5rem] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">{{ str_replace('_', ' ', $request->type) }}</span>
                        <span class="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Request ID: #{{ $request->id }}</span>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Requested by: {{ $request->user->name }}</h3>
                    <div class="p-4 bg-white/5 rounded-2xl mb-4 text-sm text-gray-400">
                        <strong>Reason:</strong> {{ $request->reason ?? 'No reason provided' }}
                    </div>
                    @if($request->type === 'free_booking')
                        <div class="text-xs text-gray-500 space-y-1">
                            <p><strong>Customer:</strong> {{ $request->data['customer_name'] }} ({{ $request->data['customer_mobile'] }})</p>
                            <p><strong>Arena ID:</strong> {{ $request->data['arena_id'] }}</p>
                            <p><strong>Date:</strong> {{ $request->data['date'] }}</p>
                            <p><strong>Slots:</strong> {{ implode(', ', $request->data['slots']) }}</p>
                        </div>
                    @endif
                </div>
                
                <div class="flex flex-col items-center gap-4 shrink-0">
                    <div class="text-center p-4 glass rounded-2xl border-primary/20">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Approval OTP</span>
                        <span class="text-3xl font-black text-primary tracking-[0.2em]">{{ $request->otp }}</span>
                    </div>
                    <form action="{{ route('admin.approvals.approve', $request->id) }}" method="POST">
                        @csrf
                        <button type="submit" class="px-10 py-4 bg-primary text-black rounded-full font-black text-xs tracking-widest hover:scale-105 transition-all">APPROVE NOW</button>
                    </form>
                </div>
            </div>
        @empty
            <div class="text-center py-20 glass rounded-[2.5rem] border-dashed border-white/10">
                <span class="material-symbols-outlined text-6xl text-gray-800 mb-4">check_circle</span>
                <p class="text-gray-500 font-bold uppercase tracking-widest text-sm">No pending approval requests</p>
            </div>
        @endforelse
    </div>
</div>
@endsection
