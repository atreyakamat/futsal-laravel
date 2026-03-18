<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\Booking;
use App\Models\Pricing;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class ApprovalController extends Controller
{
    public function index()
    {
        $requests = ApprovalRequest::with('user')->where('status', 'pending')->get();
        return view('admin.approvals.index', compact('requests'));
    }

    public function approve(Request $request, ApprovalRequest $approvalRequest)
    {
        if (!auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        if ($approvalRequest->type === 'free_booking') {
            // For free booking, we just mark as approved and keep OTP.
            // The admin will then enter OTP to confirm.
            $approvalRequest->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);
        } elseif ($approvalRequest->type === 'pricing_change') {
            $data = $approvalRequest->data;
            Pricing::updateOrCreate(
                ['arena_id' => $data['arena_id'], 'time_slot' => $data['time_slot']],
                ['price' => $data['price']]
            );

            $approvalRequest->update([
                'status' => 'approved',
                'approved_by' => auth()->id(),
                'approved_at' => now()
            ]);
        }

        return redirect()->back()->with('success', 'Request approved successfully.');
    }

    public function confirmFreeBooking(Request $request)
    {
        $request->validate([
            'otp' => 'required|string',
            'request_id' => 'required|exists:approval_requests,id'
        ]);

        $approval = ApprovalRequest::findOrFail($request->request_id);

        if ($approval->status !== 'approved' || $approval->otp !== $request->otp) {
            return redirect()->back()->with('error', 'Invalid OTP or request not approved.');
        }

        $data = $approval->data;
        $bookingRef = 'FREE-' . strtoupper(Str::random(8));

        DB::transaction(function () use ($data, $bookingRef, $approval) {
            foreach ($data['slots'] as $slot) {
                Booking::create([
                    'arena_id' => $data['arena_id'],
                    'booking_date' => $data['date'],
                    'time_slot' => $slot,
                    'booking_ref' => $bookingRef,
                    'customer_name' => $data['customer_name'],
                    'customer_mobile' => $data['customer_mobile'],
                    'amount' => 0,
                    'payment_status' => 'confirmed',
                    'payment_method' => 'free_approval',
                    'ticket_number' => 'TKT-FREE-' . date('ymd') . '-' . strtoupper(Str::random(4))
                ]);
            }
            $approval->update(['status' => 'approved']); // Finalized
        });

        return redirect()->route('admin.bookings.create')->with('success', 'Free booking confirmed! Ref: ' . $bookingRef);
    }
}
