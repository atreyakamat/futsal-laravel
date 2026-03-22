<?php

namespace App\Filament\Resources\BookingResource\Pages;

use App\Filament\Resources\BookingResource;
use App\Models\Arena;
use App\Models\Booking;
use App\Models\Pricing;
use App\Models\ApprovalRequest;
use Filament\Resources\Pages\Page;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Form;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class AdminBooking extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string $resource = BookingResource::class;

    protected static string $view = 'filament.resources.booking-resource.pages.admin-booking';

    protected static ?string $title = 'Admin Booking';

    public ?array $data = [];
    public ?array $otpData = [];

    public function mount(): void
    {
        $this->form->fill();
    }

    protected function getForms(): array
    {
        return [
            'form',
            'otpForm',
        ];
    }

    public static function getCommonTimes(): array
    {
        return [
            '05:00-06:00' => '05 AM - 06 AM',
            '06:00-07:00' => '06 AM - 07 AM',
            '07:00-08:00' => '07 AM - 08 AM',
            '08:00-09:00' => '08 AM - 09 AM',
            '09:00-10:00' => '09 AM - 10 AM',
            '10:00-11:00' => '10 AM - 11 AM',
            '11:00-12:00' => '11 AM - 12 PM',
            '12:00-13:00' => '12 PM - 01 PM',
            '13:00-14:00' => '01 PM - 02 PM',
            '14:00-15:00' => '02 PM - 03 PM',
            '15:00-16:00' => '03 PM - 04 PM',
            '16:00-17:00' => '04 PM - 05 PM',
            '17:00-18:00' => '05 PM - 06 PM',
            '18:00-19:00' => '06 PM - 07 PM',
            '19:00-20:00' => '07 PM - 08 PM',
            '20:00-21:00' => '08 PM - 09 PM',
            '21:00-22:00' => '09 PM - 10 PM',
            '22:00-23:00' => '10 PM - 11 PM',
            '23:00-00:00' => '11 PM - 12 AM',
        ];
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Booking Details')
                    ->schema([
                        Select::make('arena_id')
                            ->label('Arena')
                            ->options(Arena::where('status', 'active')->pluck('name', 'id'))
                            ->required()
                            ->searchable()
                            ->preload()
                            ->reactive()
                            ->afterStateUpdated(fn ($set) => $this->updatePrices($set)),
                        DatePicker::make('date')
                            ->label('Booking Date')
                            ->required()
                            ->native(false)
                            ->reactive()
                            ->afterStateUpdated(fn ($set) => $this->updatePrices($set)),
                        CheckboxList::make('slots')
                            ->label('Common Times')
                            ->options(static::getCommonTimes())
                            ->columns(3)
                            ->required()
                            ->reactive()
                            ->afterStateUpdated(fn ($state, $set, $get) => $this->updatePrices($set, $get)),
                        TextInput::make('customer_name')
                            ->required(),
                        TextInput::make('customer_mobile')
                            ->tel()
                            ->required(),
                        Toggle::make('keep_same_pricing')
                            ->label('Keep same pricing for all slots')
                            ->default(true)
                            ->reactive()
                            ->afterStateUpdated(fn ($set, $get) => $this->updatePrices($set, $get)),
                        TextInput::make('base_price')
                            ->label('Price per Slot')
                            ->numeric()
                            ->prefix('₹')
                            ->visible(fn ($get) => $get('keep_same_pricing'))
                            ->required(fn ($get) => $get('keep_same_pricing')),
                        
                        \Filament\Forms\Components\Repeater::make('custom_prices')
                            ->label('Custom Slot Prices')
                            ->schema([
                                TextInput::make('time_slot')
                                    ->label('Slot')
                                    ->disabled()
                                    ->dehydrated(),
                                TextInput::make('price')
                                    ->label('Price')
                                    ->numeric()
                                    ->prefix('₹')
                                    ->required(),
                            ])
                            ->visible(fn ($get) => !$get('keep_same_pricing'))
                            ->disableItemCreation()
                            ->disableItemDeletion()
                            ->disableItemMovement()
                            ->columns(2),

                        Toggle::make('is_free')
                            ->label('Request as FREE Booking')
                            ->reactive(),
                        Textarea::make('reason')
                            ->label('Reason for Free Booking')
                            ->required(fn ($get) => $get('is_free'))
                            ->visible(fn ($get) => $get('is_free'))
                            ->columnSpanFull(),
                    ])->columns(2)
            ])
            ->statePath('data');
    }

    protected function updatePrices($set, $get = null): void
    {
        if (!$get) return;

        $slots = $get('slots') ?? [];
        $arenaId = $get('arena_id');
        
        if (!$get('keep_same_pricing')) {
            $existingCustomPrices = $get('custom_prices') ?? [];
            $newCustomPrices = [];

            foreach ($slots as $slot) {
                $existing = collect($existingCustomPrices)->firstWhere('time_slot', $slot);
                
                if ($existing) {
                    $newCustomPrices[] = $existing;
                } else {
                    $pricing = Pricing::where('arena_id', $arenaId)
                        ->where('time_slot', $slot)
                        ->first();
                    
                    $newCustomPrices[] = [
                        'time_slot' => $slot,
                        'price' => $pricing ? $pricing->price : 0,
                    ];
                }
            }
            $set('custom_prices', $newCustomPrices);
        } else {
            // Optional: set a default base price if one slot is selected and base_price is empty
            if (count($slots) > 0 && !$get('base_price')) {
                $pricing = Pricing::where('arena_id', $arenaId)
                    ->where('time_slot', $slots[0])
                    ->first();
                if ($pricing) {
                    $set('base_price', $pricing->price);
                }
            }
        }
    }

    public function submitBooking(): void
    {
        $data = $this->form->getState();
        $slotsArray = $data['slots'];
        $keepSame = $data['keep_same_pricing'];
        $basePrice = $data['base_price'] ?? 0;
        $customPrices = $data['custom_prices'] ?? [];

        if ($data['is_free']) {
            ApprovalRequest::create([
                'user_id' => auth()->id(),
                'type' => 'free_booking',
                'data' => array_merge($data, ['slots' => $slotsArray]),
                'reason' => $data['reason'],
                'status' => 'pending',
                'otp' => (string) rand(100000, 999999)
            ]);

            Notification::make()
                ->title('Request Sent')
                ->body('Free booking request sent to Super Admin for approval.')
                ->success()
                ->send();

            $this->form->fill(['keep_same_pricing' => true]);
            return;
        }

        $bookingRef = 'ADM-' . strtoupper(Str::random(8));
        
        try {
            DB::transaction(function () use ($data, $slotsArray, $bookingRef, $keepSame, $basePrice, $customPrices) {
                foreach ($slotsArray as $slot) {
                    $price = $basePrice;
                    if (!$keepSame) {
                        $custom = collect($customPrices)->firstWhere('time_slot', $slot);
                        $price = $custom ? $custom['price'] : 0;
                    }

                    Booking::create([
                        'arena_id' => $data['arena_id'],
                        'booking_date' => $data['date'],
                        'time_slot' => $slot,
                        'booking_ref' => $bookingRef,
                        'customer_name' => $data['customer_name'],
                        'customer_mobile' => $data['customer_mobile'],
                        'amount' => $price,
                        'payment_status' => 'confirmed',
                        'payment_method' => 'admin_backend',
                        'ticket_number' => 'TKT-' . date('ymd') . '-' . strtoupper(Str::random(4))
                    ]);
                }
            });

            Notification::make()
                ->title('Booking Created')
                ->body("Booking created successfully. Ref: {$bookingRef}")
                ->success()
                ->send();

            $this->form->fill(['keep_same_pricing' => true]);

        } catch (\Exception $e) {
            Notification::make()
                ->title('Error')
                ->body('Failed to create booking: ' . $e->getMessage())
                ->danger()
                ->send();
        }
    }

    public function confirmFreeBooking(): void
    {
        $otpData = $this->otpForm->getState();
        $approval = ApprovalRequest::find($otpData['request_id']);

        if (!$approval || $approval->status !== 'approved' || $approval->otp !== $otpData['otp']) {
            Notification::make()
                ->title('Invalid OTP')
                ->body('Invalid OTP or request not approved yet.')
                ->danger()
                ->send();
            return;
        }

        $data = $approval->data;
        $bookingRef = 'FREE-' . strtoupper(Str::random(8));

        try {
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
                $approval->update(['status' => 'finalized']);
            });

            Notification::make()
                ->title('Free Booking Confirmed')
                ->body("Free booking confirmed! Ref: {$bookingRef}")
                ->success()
                ->send();

            $this->otpForm->fill();

        } catch (\Exception $e) {
            Notification::make()
                ->title('Error')
                ->body('Failed to confirm free booking: ' . $e->getMessage())
                ->danger()
                ->send();
        }
    }
}
