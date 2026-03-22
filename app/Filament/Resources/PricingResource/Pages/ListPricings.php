<?php

namespace App\Filament\Resources\PricingResource\Pages;

use App\Filament\Resources\PricingResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPricings extends ListRecords
{
    protected static string $resource = PricingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('bulk_setup')
                ->label('Bulk Setup')
                ->url(PricingResource::getUrl('bulk-create'))
                ->color('info')
                ->icon('heroicon-o-plus-circle'),
            Actions\CreateAction::make(),
        ];
    }
}
