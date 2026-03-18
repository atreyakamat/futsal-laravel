<?php

namespace App\Filament\Resources\ApprovalRequestResource\Pages;

use App\Filament\Resources\ApprovalRequestResource;
use Filament\Resources\Pages\Page;

class GlobalSettings extends Page
{
    protected static string $resource = ApprovalRequestResource::class;

    protected static string $view = 'filament.resources.approval-request-resource.pages.global-settings';
}
