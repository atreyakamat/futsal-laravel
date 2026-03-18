<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PricingResource\Pages;
use App\Models\Pricing;
use App\Models\ApprovalRequest;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Notifications\Notification;

class PricingResource extends Resource
{
    protected static ?string $model = Pricing::class;

    protected static ?string $navigationIcon = 'heroicon-o-currency-dollar';
    
    protected static ?string $navigationGroup = 'Administration';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('arena_id')
                    ->relationship('arena', 'name')
                    ->required()
                    ->disabled(!auth()->user()->isSuperAdmin()),
                Forms\Components\TextInput::make('time_slot')
                    ->required()
                    ->disabled(!auth()->user()->isSuperAdmin()),
                Forms\Components\TextInput::make('price')
                    ->required()
                    ->numeric()
                    ->prefix('₹'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('arena.name')
                    ->sortable(),
                Tables\Columns\TextColumn::make('time_slot')
                    ->searchable(),
                Tables\Columns\TextColumn::make('price')
                    ->money('INR')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('arena')
                    ->relationship('arena', 'name'),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->action(function (Pricing $record, array $data) {
                        if (auth()->user()->isSuperAdmin()) {
                            $record->update($data);
                            Notification::make()->title('Pricing updated.')->success()->send();
                        } else {
                            // Create approval request for Admin
                            ApprovalRequest::create([
                                'user_id' => auth()->id(),
                                'type' => 'pricing_change',
                                'reason' => 'Price adjustment requested by Admin',
                                'data' => array_merge($data, ['arena_id' => $record->arena_id, 'time_slot' => $record->time_slot]),
                                'status' => 'pending',
                            ]);
                            Notification::make()->title('Price change request sent to Super Admin.')->warning()->send();
                        }
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->visible(fn () => auth()->user()->isSuperAdmin()),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPricings::route('/'),
            'create' => Pages\CreatePricing::route('/create'),
            'edit' => Pages\EditPricing::route('/{record}/edit'),
        ];
    }
}
