@extends('layouts.app')

@section('title', 'Login | FutsalGoa')

@section('content')
<div class="max-w-md mx-auto mt-20 px-6 py-20">
    <div class="glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/50">
        <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6">
            <span class="material-symbols-outlined text-primary text-3xl">login</span>
        </div>
        <h2 class="text-3xl font-black mb-2 text-center uppercase tracking-tighter italic">WELCOME <span class="text-primary">BACK</span></h2>
        <p class="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-8">Login with OTP</p>

        <div id="step-1" class="space-y-6">
            <div class="space-y-2">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1" for="identifier">
                    Email or Mobile Number
                </label>
                <div class="relative">
                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">person</span>
                    <input class="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-700" 
                           id="identifier" type="text" placeholder="Enter Email or Mobile">
                </div>
            </div>
            <button id="send-otp-btn" class="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2" type="button">
                SEND OTP
                <span class="material-symbols-outlined text-sm font-black">send</span>
            </button>
        </div>

        <div id="step-2" class="hidden space-y-6">
            <div class="space-y-2">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1" for="otp">
                    Enter 4-digit OTP
                </label>
                <div class="relative">
                    <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-lg">password</span>
                    <input class="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary transition-all placeholder:text-gray-700 tracking-[0.5em] font-black" 
                           id="otp" type="text" placeholder="••••" maxlength="4">
                </div>
            </div>
            <button id="verify-otp-btn" class="w-full py-5 rounded-2xl font-black text-sm tracking-widest bg-primary text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2" type="button">
                VERIFY OTP
                <span class="material-symbols-outlined text-sm font-black">check_circle</span>
            </button>
            <button id="back-btn" class="w-full text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors" type="button">
                Back
            </button>
        </div>
    </div>
</div>

<script>
    document.getElementById('send-otp-btn').addEventListener('click', async () => {
        const identifier = document.getElementById('identifier').value;
        const btn = document.getElementById('send-otp-btn');
        if (!identifier) return alert('Please enter email or mobile');

        btn.disabled = true;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> SENDING...';

        try {
            const response = await fetch('/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}'
                },
                body: JSON.stringify({ identifier })
            });

            if (response.ok) {
                document.getElementById('step-1').classList.add('hidden');
                document.getElementById('step-2').classList.remove('hidden');
                alert('OTP sent! (Check logs for testing)');
            } else {
                alert('Failed to send OTP');
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'SEND OTP <span class="material-symbols-outlined text-sm font-black">send</span>';
        }
    });

    document.getElementById('verify-otp-btn').addEventListener('click', async () => {
        const identifier = document.getElementById('identifier').value;
        const otp = document.getElementById('otp').value;
        const btn = document.getElementById('verify-otp-btn');
        
        if (!otp) return alert('Please enter OTP');

        btn.disabled = true;
        btn.innerHTML = '<div class="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> VERIFYING...';

        try {
            const response = await fetch('/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}'
                },
                body: JSON.stringify({ identifier, otp })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                window.location.href = data.redirect;
            } else {
                alert(data.message || 'Invalid OTP');
                btn.disabled = false;
                btn.innerHTML = 'VERIFY OTP <span class="material-symbols-outlined text-sm font-black">check_circle</span>';
            }
        } catch (e) {
            alert('Something went wrong.');
            btn.disabled = false;
            btn.innerHTML = 'VERIFY OTP <span class="material-symbols-outlined text-sm font-black">check_circle</span>';
        }
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        document.getElementById('step-2').classList.add('hidden');
        document.getElementById('step-1').classList.remove('hidden');
    });
</script>
@endsection
