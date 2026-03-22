<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function showLogin()
    {
        return view('auth.login');
    }

    public function sendOtp(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string', // email or mobile
        ]);

        $otp = (string) rand(1000, 9999);
        $expiresAt = now()->addMinutes(10);

        UserOtp::updateOrCreate(
            ['identifier' => $request->identifier],
            ['otp' => $hash = \Illuminate\Support\Facades\Hash::make($otp), 'expires_at' => $expiresAt]
        );

        // For now, log the OTP for testing
        Log::info("OTP for {$request->identifier}: {$otp}");

        // In production, send via SMS or Email
        // if (filter_var($request->identifier, FILTER_VALIDATE_EMAIL)) { ... } else { ... }

        return response()->json(['success' => true, 'message' => 'OTP sent successfully.']);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',
            'otp' => 'required|string|size:4',
        ]);

        $userOtp = UserOtp::where('identifier', $request->identifier)->first();

        if (!$userOtp || $userOtp->isExpired() || !\Illuminate\Support\Facades\Hash::check($request->otp, $userOtp->otp)) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired OTP.'], 422);
        }

        // Find or create user
        $user = User::where('email', $request->identifier)
                    ->orWhere('name', $request->identifier) // Assuming name could be mobile for now
                    ->first();

        if (!$user) {
            $user = User::create([
                'name' => $request->identifier,
                'email' => filter_var($request->identifier, FILTER_VALIDATE_EMAIL) ? $request->identifier : $request->identifier . '@futsalgoa.com',
                'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(16)),
                'role' => 'user'
            ]);
        }

        Auth::login($user);
        $userOtp->delete();

        return response()->json(['success' => true, 'redirect' => route('home')]);
    }

    public function logout()
    {
        Auth::logout();
        return redirect()->route('home');
    }
}
