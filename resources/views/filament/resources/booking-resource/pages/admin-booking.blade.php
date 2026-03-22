<x-filament-panels::page>
    <form wire:submit="submitBooking">
        {{ $this->form }}
        
        <div class="mt-6 flex justify-end">
            <x-filament::button type="submit" size="lg">
                Submit Booking
            </x-filament::button>
        </div>
    </form>

    <div class="mt-12">
        <form wire:submit="confirmFreeBooking">
            {{ $this->otpForm }}
            
            <div class="mt-4 flex justify-end">
                <x-filament::button type="submit" color="gray" icon="heroicon-o-check-circle">
                    Confirm OTP
                </x-filament::button>
            </div>
        </form>
    </div>
</x-filament-panels::page>
