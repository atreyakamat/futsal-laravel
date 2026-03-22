<?php

namespace App\Filament\Resources\PricingResource\Pages;

use App\Filament\Resources\PricingResource;
use App\Models\Pricing;
use App\Models\Arena;
use Filament\Resources\Pages\Page;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Form;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\Repeater;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\DB;

class BulkCreatePricing extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string $resource = PricingResource::class;

    protected static string $view = 'filament.resources.pricing-resource.pages.bulk-create-pricing';

    protected static ?string $title = 'Bulk Pricing Setup';

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'keep_same_pricing' => true,
        ]);
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
                Section::make('Arena & Slots')
                    ->schema([
                        Select::make('arena_id')
                            ->label('Arena')
                            ->options(Arena::pluck('name', 'id'))
                            ->required()
                            ->searchable(),
                        CheckboxList::make('times')
                            ->label('Common Times')
                            ->options(static::getCommonTimes())
                            ->columns(4)
                            ->required()
                            ->reactive()
                            ->afterStateUpdated(fn ($state, $set, $get) => $this->updateCustomPrices($state, $set, $get)),
                        Toggle::make('keep_same_pricing')
                            ->label('Keep same pricing for all slots')
                            ->default(true)
                            ->reactive()
                            ->afterStateUpdated(fn ($state, $set, $get) => $this->updateCustomPrices($get('times'), $set, $get)),
                    ]),

                Section::make('Pricing')
                    ->schema([
                        TextInput::make('price')
                            ->label('Base Price')
                            ->numeric()
                            ->prefix('₹')
                            ->visible(fn ($get) => $get('keep_same_pricing'))
                            ->required(fn ($get) => $get('keep_same_pricing')),
                        
                        Repeater::make('custom_prices')
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
                    ]),
            ])
            ->statePath('data');
    }

    protected function updateCustomPrices($times, $set, $get): void
    {
        if ($get('keep_same_pricing')) {
            return;
        }

        $existingCustomPrices = $get('custom_prices') ?? [];
        $newCustomPrices = [];

        foreach ($times as $time) {
            $existing = collect($existingCustomPrices)->firstWhere('time_slot', $time);
            $newCustomPrices[] = [
                'time_slot' => $time,
                'price' => $existing ? $existing['price'] : ($get('price') ?? 0),
            ];
        }

        $set('custom_prices', $newCustomPrices);
    }

    public function submit(): void
    {
        $formData = $this->form->getState();
        $arenaId = $formData['arena_id'];
        $times = $formData['times'];
        $keepSame = $formData['keep_same_pricing'];
        $basePrice = $formData['price'];
        $customPrices = $formData['custom_prices'] ?? [];

        try {
            DB::transaction(function () use ($arenaId, $times, $keepSame, $basePrice, $customPrices) {
                foreach ($times as $time) {
                    $price = $basePrice;
                    if (!$keepSame) {
                        $custom = collect($customPrices)->firstWhere('time_slot', $time);
                        $price = $custom ? $custom['price'] : $basePrice;
                    }

                    Pricing::updateOrCreate(
                        ['arena_id' => $arenaId, 'time_slot' => $time],
                        ['price' => $price]
                    );
                }
            });

            Notification::make()
                ->title('Bulk Pricing Updated')
                ->body(count($times) . ' slots updated for the arena.')
                ->success()
                ->send();

            $this->redirect(PricingResource::getUrl('index'));

        } catch (\Exception $e) {
            Notification::make()
                ->title('Error')
                ->body($e->getMessage())
                ->danger()
                ->send();
        }
    }
}
