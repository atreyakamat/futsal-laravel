@extends('layouts.app')

@section('title', 'Login | FutsalGoa')

@section('content')
<div class="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-center">Login with OTP</h2>

    <div id="step-1">
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="identifier">
                Email or Mobile Number
            </label>
            <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="identifier" type="text" placeholder="Enter Email or Mobile">
        </div>
        <div class="flex items-center justify-between">
            <button id="send-otp-btn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
                Send OTP
            </button>
        </div>
    </div>

    <div id="step-2" class="hidden">
        <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="otp">
                Enter 4-digit OTP
            </label>
            <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="otp" type="text" placeholder="OTP">
        </div>
        <div class="flex items-center justify-between">
            <button id="verify-otp-btn" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
                Verify OTP
            </button>
        </div>
    </div>
</div>

<script>
    document.getElementById('send-otp-btn').addEventListener('click', async () => {
        const identifier = document.getElementById('identifier').value;
        if (!identifier) return alert('Please enter email or mobile');

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
    });

    document.getElementById('verify-otp-btn').addEventListener('click', async () => {
        const identifier = document.getElementById('identifier').value;
        const otp = document.getElementById('otp').value;
        
        if (!otp) return alert('Please enter OTP');

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
        }
    });
</script>
@endsection
