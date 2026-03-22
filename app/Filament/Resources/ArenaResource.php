<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArenaResource\Pages;
use App\Filament\Resources\ArenaResource\RelationManagers;
use App\Models\Arena;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class ArenaResource extends Resource
{
    protected static ?string $model = Arena::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('General Information')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->required(),
                        Forms\Components\TextInput::make('slug')
                            ->required(),
                        Forms\Components\Textarea::make('address')
                            ->columnSpanFull(),
                        Forms\Components\TextInput::make('contact_email')
                            ->email(),
                        Forms\Components\TextInput::make('contact_phone')
                            ->tel(),
                        Forms\Components\Textarea::make('description')
                            ->columnSpanFull(),
                        Forms\Components\Select::make('status')
                            ->options([
                                'active' => 'Active',
                                'inactive' => 'Inactive',
                                'suspended' => 'Suspended',
                            ])
                            ->required(),
                        Forms\Components\Toggle::make('bot_enabled')
                            ->label('AI Bot Enabled')
                            ->default(true),
                        Forms\Components\TextInput::make('gmaps_link'),
                    ])->columns(2),

                Forms\Components\Section::make('Staff Management')
                    ->description('Assign specific users to manage this arena.')
                    ->schema([
                        Forms\Components\Select::make('admin_id')
                            ->label('Arena Admin')
                            ->options(fn() => \App\Models\User::where('role', 'admin')->pluck('name', 'id'))
                            ->searchable()
                            ->preload()
                            ->visible(fn() => auth()->user()->isSuperAdmin()),
                        Forms\Components\Select::make('security_id')
                            ->label('Security Admin')
                            ->options(fn() => \App\Models\User::where('role', 'security')->pluck('name', 'id'))
                            ->searchable()
                            ->preload()
                            ->visible(fn() => auth()->user()->isSuperAdmin()),
                    ])->columns(2),

                Forms\Components\Section::make('Visuals')
                    ->schema([
                        Forms\Components\FileUpload::make('cover_image')
                            ->label('Main Cover Image')
                            ->image(),
                        Forms\Components\TextInput::make('logo_url')
                            ->label('Logo URL'),
                        
                        Forms\Components\Repeater::make('images')
                            ->relationship('images')
                            ->label('Gallery Images')
                            ->schema([
                                Forms\Components\FileUpload::make('image_path')
                                    ->label('Image')
                                    ->image()
                                    ->required(),
                                Forms\Components\TextInput::make('sort_order')
                                    ->numeric()
                                    ->default(0),
                            ])
                            ->columns(2)
                            ->columnSpanFull()
                            ->visible(fn() => auth()->user()->isSuperAdmin()),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable(),
                Tables\Columns\TextColumn::make('admin.name')
                    ->label('Admin')
                    ->placeholder('Unassigned'),
                Tables\Columns\TextColumn::make('security.name')
                    ->label('Security')
                    ->placeholder('Unassigned'),
                Tables\Columns\ToggleColumn::make('bot_enabled')
                    ->label('Bot'),
                Tables\Columns\TextColumn::make('contact_phone')
                    ->searchable(),
                Tables\Columns\TextColumn::make('logo_url')
                    ->searchable(),
                Tables\Columns\ImageColumn::make('cover_image'),
                Tables\Columns\TextColumn::make('status')
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('gmaps_link')
                    ->searchable(),
            ])
            ->filters([
                //
            ])
            ->actions([
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
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListArenas::route('/'),
            'create' => Pages\CreateArena::route('/create'),
            'edit' => Pages\EditArena::route('/{record}/edit'),
        ];
    }
}
