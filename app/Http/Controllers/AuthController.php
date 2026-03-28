<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserOtp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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

        $otp = (string) rand(100000, 999999);
        $expiresAt = now()->addMinutes(10);

        UserOtp::updateOrCreate(
            ['identifier' => $request->identifier],
            ['otp' => Hash::make($otp), 'expires_at' => $expiresAt]
        );

        Log::info("OTP for {$request->identifier}: {$otp}");

        session(['otp_identifier' => $request->identifier]);

        return redirect()->route('verify-otp.show');
    }

    public function showVerifyOtp()
    {
        if (!session('otp_identifier')) {
            return redirect()->route('login');
        }
        return view('auth.verify-otp');
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string',
            'otp' => 'required|string|size:6',
        ]);

        $userOtp = UserOtp::where('identifier', $request->identifier)->first();

        if (!$userOtp || $userOtp->isExpired() || !Hash::check($request->otp, $userOtp->otp)) {
            return back()->withErrors(['otp' => 'Invalid or expired OTP.']);
        }

        // Check if user exists
        $user = User::where('email', $request->identifier)
                    ->orWhere('customer_mobile', $request->identifier) 
                    ->first();

        if ($user) {
            Auth::login($user);
            $userOtp->delete();
            session()->forget('otp_identifier');
            return redirect()->route('home');
        } else {
            // User doesn't exist yet - set "Guest Session"
            // They will only be created in DB after first booking
            session([
                'guest_authenticated' => true,
                'guest_identifier' => $request->identifier,
            ]);
            $userOtp->delete();
            session()->forget('otp_identifier');
            return redirect()->route('home');
        }
    }

    public function logout()
    {
        Auth::logout();
        session()->flush();
        return redirect()->route('home');
    }
}
