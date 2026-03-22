<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BookingResource\Pages;
use App\Models\Booking;
use App\Models\Arena;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class BookingResource extends Resource
{
    protected static ?string $model = Booking::class;

    protected static ?string $navigationIcon = 'heroicon-o-ticket';
    
    protected static ?string $navigationGroup = 'Bookings Management';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Customer Information')
                    ->schema([
                        Forms\Components\TextInput::make('customer_name')
                            ->required()
                            ->maxLength(100),
                        Forms\Components\TextInput::make('customer_mobile')
                            ->required()
                            ->tel()
                            ->maxLength(15),
                        Forms\Components\TextInput::make('customer_email')
                            ->email()
                            ->maxLength(100),
                    ])->columns(2),

                Forms\Components\Section::make('Booking Details')
                    ->schema([
                        Forms\Components\Select::make('arena_id')
                            ->label('Arena')
                            ->options(\App\Models\Arena::all()->pluck('name', 'id'))
                            ->required()
                            ->searchable()
                            ->preload(),
                        Forms\Components\DatePicker::make('booking_date')
                            ->required()
                            ->native(false),
                        Forms\Components\TextInput::make('time_slot')
                            ->required()
                            ->placeholder('e.g. 18:00-19:00'),
                        Forms\Components\TextInput::make('amount')
                            ->required()
                            ->numeric()
                            ->prefix('₹'),
                    ])->columns(2),

                Forms\Components\Section::make('Status & Payment')
                    ->schema([
                        Forms\Components\Select::make('payment_status')
                            ->options([
                                'pending' => 'Pending',
                                'confirmed' => 'Confirmed',
                                'failed' => 'Failed',
                                'cancelled' => 'Cancelled',
                            ])
                            ->required()
                            ->default('pending'),
                        Forms\Components\Select::make('payment_method')
                            ->options([
                                'online' => 'Online',
                                'cash' => 'Cash',
                                'upi' => 'UPI',
                            ])
                            ->required()
                            ->default('online'),
                        Forms\Components\Toggle::make('is_free_booking')
                            ->label('Free Booking')
                            ->inline(false),
                    ])->columns(3),

                Forms\Components\Section::make('Check-in Info')
                    ->schema([
                        Forms\Components\Toggle::make('checked_in')
                            ->label('Checked In')
                            ->disabled(fn ($get) => !$get('id')),
                        Forms\Components\DateTimePicker::make('checked_in_at')
                            ->disabled(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->headerActions([
                Tables\Actions\Action::make('admin_booking')
                    ->label('Legacy Admin Booking')
                    ->url(fn (): string => static::getUrl('admin-booking'))
                    ->icon('heroicon-o-plus-circle')
                    ->color('info'),
            ])
            ->columns([
                Tables\Columns\TextColumn::make('ticket_number')
                    ->searchable()
                    ->copyable()
                    ->fontFamily('mono'),
                Tables\Columns\TextColumn::make('customer_name')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('arena.name')
                    ->sortable(),
                Tables\Columns\TextColumn::make('booking_date')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('time_slot'),
                Tables\Columns\TextColumn::make('amount')
                    ->money('INR')
                    ->sortable(),
                Tables\Columns\BadgeColumn::make('payment_status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'confirmed',
                        'danger' => 'failed',
                        'secondary' => 'cancelled',
                    ]),
                Tables\Columns\IconColumn::make('checked_in')
                    ->boolean()
                    ->label('Entry'),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('arena_id')
                    ->label('Arena')
                    ->options(\App\Models\Arena::all()->pluck('name', 'id')),
                Tables\Filters\Filter::make('booking_date')
                    ->form([
                        Forms\Components\DatePicker::make('from'),
                        Forms\Components\DatePicker::make('until'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'], fn (Builder $query, $date): Builder => $query->whereDate('booking_date', '>=', $date))
                            ->when($data['until'], fn (Builder $query, $date): Builder => $query->whereDate('booking_date', '<=', $date));
                    })
            ])
            ->actions([
                Tables\Actions\Action::make('confirm_entry')
                    ->label('Confirm Entry')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (Booking $record): bool => !$record->checked_in && auth()->user()->isSecurity() || auth()->user()->isAdmin())
                    ->action(fn (Booking $record) => $record->update([
                        'checked_in' => true,
                        'checked_in_at' => now(),
                        'checked_in_by' => auth()->id(),
                    ])),
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBookings::route('/'),
            'create' => Pages\CreateBooking::route('/create'),
            'admin-booking' => Pages\AdminBooking::route('/admin-booking'),
            'edit' => Pages\EditBooking::route('/{record}/edit'),
        ];
    }
}
