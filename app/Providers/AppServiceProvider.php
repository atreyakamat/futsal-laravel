<?php

namespace App\Providers;

use App\Models\Pricing;
use App\Observers\PricingObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config('app.env') !== 'local') {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }

        // Register observers for cache invalidation
        Pricing::observe(PricingObserver::class);
    }
}
