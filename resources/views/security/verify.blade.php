@extends('layouts.app')

@section('title', 'Security Verification | FutsalGoa')

@section('content')
<div class="max-w-4xl mx-auto px-6 py-12">
    <div class="glass p-10 rounded-[2.5rem] border border-white/10">
        <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span class="material-symbols-outlined">security</span>
            </div>
            <div>
                <h1 class="text-3xl font-black italic uppercase tracking-tighter">Security <span class="text-primary">Verification</span></h1>
                <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verify and confirm player entry</p>
            </div>
        </div>

        @if(session('success'))
            <div class="p-4 mb-8 bg-primary/10 border border-primary text-primary rounded-xl font-bold text-sm">
                {{ session('success') }}
            </div>
        @endif

        <div x-data="{ scanning: false }" class="mb-12">
            <div class="flex flex-col gap-4">
                <button @click="scanning = !scanning; if(scanning) startScanner()" 
                        class="w-full py-6 glass border-primary/30 rounded-[2rem] flex items-center justify-center gap-3 text-primary font-black tracking-[0.2em] hover:bg-primary/5 transition-all">
                    <span class="material-symbols-outlined" x-text="scanning ? 'close' : 'qr_code_scanner'"></span>
                    <span x-text="scanning ? 'STOP SCANNER' : 'SCAN TICKET QR'"></span>
                </button>

                <div x-show="scanning" class="overflow-hidden rounded-3xl border border-white/10 bg-black">
                    <div id="reader" class="w-full"></div>
                </div>

                <div class="flex items-center gap-4 my-4">
                    <div class="h-px bg-white/5 flex-1"></div>
                    <span class="text-[10px] font-bold text-gray-700 uppercase tracking-widest">or enter manually</span>
                    <div class="h-px bg-white/5 flex-1"></div>
                </div>

                <form action="{{ route('security.verify') }}" method="POST" id="verify-form">
                    @csrf
                    <div class="flex gap-4">
                        <input type="text" name="ticket_number" id="ticket_number" required placeholder="TKT-XXXXXX-XXXX" 
                               class="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl font-black tracking-widest uppercase focus:border-primary focus:outline-none placeholder:text-gray-800">
                        <button type="submit" class="px-10 bg-primary text-black rounded-2xl font-black text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all uppercase">Verify</button>
                    </div>
                </form>
            </div>
        </div>

        <script src="https://unpkg.com/html5-qrcode"></script>
        <script>
            function startScanner() {
                const html5QrCode = new Html5Qrcode("reader");
                const qrCodeSuccessCallback = (decodedText, decodedResult) => {
                    document.getElementById('ticket_number').value = decodedText;
                    html5QrCode.stop().then(() => {
                        document.getElementById('verify-form').submit();
                    });
                };
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
            }
        </script>

        @if(isset($bookings))
            <div class="pt-8 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4">
                <h2 class="text-sm font-black uppercase tracking-widest mb-6 text-primary italic">Ticket Found</h2>
                <div class="glass p-8 rounded-3xl border-primary/30 relative overflow-hidden">
                    <div class="grid md:grid-cols-2 gap-8 relative z-10">
                        <div>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Customer</span>
                            <p class="text-xl font-bold">{{ $bookings->first()->customer_name }}</p>
                            <p class="text-xs text-gray-400 mt-1">{{ $bookings->first()->customer_mobile }}</p>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Arena</span>
                            <p class="text-xl font-bold">{{ $bookings->first()->arena->name }}</p>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Date</span>
                            <p class="text-lg font-bold">{{ date('d M Y', strtotime($bookings->first()->booking_date)) }}</p>
                        </div>
                        <div>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Slots</span>
                            <p class="text-lg font-bold text-primary">{{ $bookings->pluck('time_slot')->implode(', ') }}</p>
                        </div>
                    </div>

                    <div class="mt-10 pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
                        <div>
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Status</span>
                            <span class="px-3 py-1 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest">Valid Ticket</span>
                        </div>
                        <form action="{{ route('security.confirm-entry') }}" method="POST">
                            @csrf
                            <input type="hidden" name="booking_ref" value="{{ $bookings->first()->booking_ref }}">
                            <button type="submit" class="px-10 py-4 bg-white text-black rounded-full font-black text-xs tracking-widest hover:bg-primary transition-all">CONFIRM ENTRY</button>
                        </form>
                    </div>
                </div>
            </div>
        @endif
    </div>
</div>
@endsection
