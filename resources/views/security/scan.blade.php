@extends('layouts.app')

@section('title', 'Security QR Scanner | FutsalGoa')

@section('content')
<div class="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-center">QR Entry Scanner</h2>

    <div id="reader" width="600px"></div>
    
    <div id="result" class="mt-6 hidden p-4 rounded border">
        <h3 class="font-bold text-lg mb-2" id="status-title">Checking...</h3>
        <div id="booking-details" class="text-sm space-y-1"></div>
        <button id="confirm-btn" class="mt-4 w-full bg-green-500 text-white font-bold py-2 px-4 rounded hidden">
            Confirm Entry
        </button>
        <button onclick="resetScanner()" class="mt-2 w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded">
            Scan Next
        </button>
    </div>
</div>

<script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
<script>
    let html5QrCode;
    let currentTicket = null;

    function onScanSuccess(decodedText, decodedResult) {
        console.log(`Code matched = ${decodedText}`, decodedResult);
        stopScanner();
        verifyTicket(decodedText);
    }

    async function verifyTicket(ticketNumber) {
        const resultDiv = document.getElementById('result');
        const title = document.getElementById('status-title');
        const details = document.getElementById('booking-details');
        const confirmBtn = document.getElementById('confirm-btn');

        resultDiv.classList.remove('hidden');
        title.innerText = 'Verifying...';
        details.innerHTML = '';
        confirmBtn.classList.add('hidden');

        try {
            const response = await fetch(`/api/security/verify/${ticketNumber}`);
            const data = await response.json();

            if (data.success) {
                currentTicket = ticketNumber;
                title.innerText = '✅ Valid Ticket';
                title.className = 'font-bold text-lg mb-2 text-green-600';
                details.innerHTML = `
                    <p><strong>Customer:</strong> ${data.booking.customer_name}</p>
                    <p><strong>Arena:</strong> ${data.booking.arena.name}</p>
                    <p><strong>Slot:</strong> ${data.booking.time_slot}</p>
                    <p><strong>Status:</strong> ${data.booking.payment_status.toUpperCase()}</p>
                `;
                
                if (!data.booking.checked_in) {
                    confirmBtn.classList.remove('hidden');
                } else {
                    details.innerHTML += `<p class="text-red-600 font-bold mt-2">ALREADY CHECKED IN</p>`;
                }
            } else {
                title.innerText = '❌ Invalid Ticket';
                title.className = 'font-bold text-lg mb-2 text-red-600';
                details.innerText = data.message;
            }
        } catch (e) {
            alert('Error verifying ticket');
        }
    }

    async function confirmEntry() {
        if (!currentTicket) return;

        try {
            const response = await fetch('/api/security/confirm-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}'
                },
                body: JSON.stringify({ ticket_number: currentTicket })
            });

            const data = await response.json();
            if (data.success) {
                alert('Entry Confirmed!');
                resetScanner();
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert('Error confirming entry');
        }
    }

    function resetScanner() {
        document.getElementById('result').classList.add('hidden');
        currentTicket = null;
        startScanner();
    }

    function startScanner() {
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
    }

    function stopScanner() {
        if (html5QrCode) {
            html5QrCode.stop().then((ignore) => {
                // QR Code scanning is stopped.
            }).catch((err) => {
                // Stop failed, handle it.
            });
        }
    }

    document.getElementById('confirm-btn').addEventListener('click', confirmEntry);
    
    // Auto start
    window.addEventListener('load', startScanner);
</script>
@endsection
