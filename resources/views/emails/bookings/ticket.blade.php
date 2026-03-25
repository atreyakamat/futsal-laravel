<x-mail::message>
# Booking Confirmed!

Hello {{ $booking->customer_name }},

Your booking at **{{ $booking->arena->name }}** is confirmed. Please show the QR code below at the arena for entry.

<div style="text-align: center; margin: 20px 0;">
    <img src="{{ $qrCodeUrl }}" alt="QR Code" width="150">
    <p style="font-weight: bold; margin-top: 10px;">{{ $booking->ticket_number }}</p>
</div>

**Booking Details:**
- **Ref:** {{ $booking->booking_ref }}
- **Date:** {{ date('d M Y', strtotime($booking->booking_date)) }}
- **Time:** {{ $mergedSlots }}
- **Duration:** {{ $duration }}
- **Total:** Rs. {{ number_format($totalAmount, 0) }}
- **Venue:** {{ $booking->arena->address }}

<x-mail::button :url="$qrCodeUrl">
Download QR Code
</x-mail::button>

See you on the pitch!

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
