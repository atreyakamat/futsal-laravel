<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ApprovalRequestResource\Pages;
use App\Models\ApprovalRequest;
use App\Models\Booking;
use App\Models\Pricing;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class ApprovalRequestResource extends Resource
{
    protected static ?string $model = ApprovalRequest::class;

    protected static ?string $navigationIcon = 'heroicon-o-check-badge';
    
    protected static ?string $navigationGroup = 'Administration';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Request Details')
                    ->schema([
                        Forms\Components\TextInput::make('user_id')
                            ->relationship('user', 'name')
                            ->disabled(),
                        Forms\Components\TextInput::make('type')
                            ->disabled(),
                        Forms\Components\Textarea::make('reason')
                            ->columnSpanFull()
                            ->disabled(),
                        Forms\Components\KeyValue::make('data')
                            ->disabled(),
                    ])->columns(2),
                
                Forms\Components\Section::make('Approval Status')
                    ->schema([
                        Forms\Components\TextInput::make('status')
                            ->disabled(),
                        Forms\Components\TextInput::make('otp')
                            ->label('OTP Code')
                            ->disabled(),
                        Forms\Components\DateTimePicker::make('approved_at')
                            ->disabled(),
                    ])->columns(3),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Requester')
                    ->sortable(),
                Tables\Columns\BadgeColumn::make('type')
                    ->colors([
                        'primary' => 'free_booking',
                        'warning' => 'pricing_change',
                    ]),
                Tables\Columns\TextColumn::make('reason')
                    ->limit(50)
                    ->tooltip(fn ($record) => $request->reason),
                Tables\Columns\BadgeColumn::make('status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'approved',
                        'danger' => 'rejected',
                    ]),
                Tables\Columns\TextColumn::make('otp')
                    ->label('OTP')
                    ->fontFamily('mono')
                    ->copyable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'approved' => 'Approved',
                        'rejected' => 'Rejected',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('approve')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn ($record) => $record->status === 'pending' && auth()->user()->isSuperAdmin())
                    ->action(function ($record) {
                        if ($record->type === 'pricing_change') {
                            $data = $record->data;
                            Pricing::updateOrCreate(
                                ['arena_id' => $data['arena_id'], 'time_slot' => $data['time_slot']],
                                ['price' => $data['price']]
                            );
                        }
                        
                        $record->update([
                            'status' => 'approved',
                            'approved_by' => auth()->id(),
                            'approved_at' => now(),
                        ]);
                    }),
                Tables\Actions\Action::make('reject')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn ($record) => $record->status === 'pending' && auth()->user()->isSuperAdmin())
                    ->action(fn ($record) => $record->update(['status' => 'rejected'])),
                Tables\Actions\ViewAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListApprovalRequests::route('/'),
            'create' => Pages\CreateApprovalRequest::route('/create'),
            'edit' => Pages\EditApprovalRequest::route('/{record}/edit'),
        ];
    }
}
