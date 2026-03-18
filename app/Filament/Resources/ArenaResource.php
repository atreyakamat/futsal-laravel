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
                Forms\Components\TextInput::make('logo_url'),
                Forms\Components\FileUpload::make('cover_image')
                    ->image(),
                Forms\Components\Textarea::make('description')
                    ->columnSpanFull(),
                Forms\Components\TextInput::make('status')
                    ->required(),
                Forms\Components\Toggle::make('bot_enabled')
                    ->label('AI Bot Enabled')
                    ->default(true),
                Forms\Components\TextInput::make('gmaps_link'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable(),
                Tables\Columns\TextColumn::make('slug')
                    ->searchable(),
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
