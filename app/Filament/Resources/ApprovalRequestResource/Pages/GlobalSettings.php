<?php

namespace App\Filament\Resources\ApprovalRequestResource\Pages;

use App\Filament\Resources\ApprovalRequestResource;
use App\Models\Setting;
use Filament\Resources\Pages\Page;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Form;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;

class GlobalSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static string $resource = ApprovalRequestResource::class;

    protected static string $view = 'filament.resources.approval-request-resource.pages.global-settings';

    protected static ?string $title = 'Global Platform Settings';
    
    protected static ?string $navigationIcon = 'heroicon-o-cog-6-tooth';

    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'global_ai_enabled' => Setting::where('key', 'global_ai_enabled')->first()->value === 'true',
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('AI Capabilities')
                    ->description('Toggle AI-driven features across the platform.')
                    ->schema([
                        Toggle::make('global_ai_enabled')
                            ->label('Enable AI Booking Assistant')
                            ->helperText('When disabled, the chat interface will be hidden or deactivated for all users.')
                            ->onIcon('heroicon-m-sparkles')
                            ->offIcon('heroicon-m-x-mark'),
                    ])
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();

        Setting::updateOrCreate(
            ['key' => 'global_ai_enabled'],
            ['value' => $data['global_ai_enabled'] ? 'true' : 'false']
        );

        Notification::make()
            ->title('Settings Saved')
            ->success()
            ->send();
    }
}
