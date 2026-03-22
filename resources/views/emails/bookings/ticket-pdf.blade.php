<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Ticket - {{ $booking->ticket_number }}</title>
    <style>
        body { font-family: 'Helvetica', sans-serif; color: #333; }
        .ticket { border: 2px solid #000; padding: 20px; width: 500px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 10px; }
        .arena-name { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .details { margin: 20px 0; }
        .row { margin-bottom: 10px; }
        .label { font-weight: bold; width: 120px; display: inline-block; }
        .qr-code { text-align: center; margin-top: 20px; }
        .footer { text-align: center; font-size: 12px; margin-top: 20px; color: #777; }
    </style>
</head>
<body>
    <div class="ticket">
        <div class="header">
            <div class="arena-name">{{ $arena->name }}</div>
            <div>Booking Ticket</div>
        </div>

        <div class="details">
            <div class="row"><span class="label">Ticket #:</span> {{ $booking->ticket_number }}</div>
            <div class="row"><span class="label">Customer:</span> {{ $booking->customer_name }}</div>
            <div class="row"><span class="label">Date:</span> {{ $booking->booking_date->format('d M Y') }}</div>
            <div class="row"><span class="label">Slot:</span> {{ $booking->time_slot }}</div>
            <div class="row"><span class="label">Ref:</span> {{ $booking->booking_ref }}</div>
            <div class="row"><span class="label">Status:</span> CONFIRMED</div>
        </div>

        <div class="qr-code">
            <img src="{{ $qrCode }}" width="150" height="150">
            <div style="margin-top: 5px; font-size: 10px;">Scan at the entrance</div>
        </div>

        <div class="footer">
            Thank you for booking with FutsalGoa!<br>
            Please arrive 10 minutes before your slot.
        </div>
    </div>
</body>
</html>
