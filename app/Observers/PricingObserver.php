<?php

namespace App\Observers;

use App\Models\Pricing;
use App\Services\PricingService;

class PricingObserver
{
    protected $pricingService;

    public function __construct(PricingService $pricingService)
    {
        $this->pricingService = $pricingService;
    }

    /**
     * Handle the Pricing "created" event.
     */
    public function created(Pricing $pricing): void
    {
        $this->pricingService->clearCache($pricing->arena_id);
    }

    /**
     * Handle the Pricing "updated" event.
     */
    public function updated(Pricing $pricing): void
    {
        $this->pricingService->clearCache($pricing->arena_id);

        // If arena_id changed, clear old cache too
        if ($pricing->isDirty('arena_id')) {
            $this->pricingService->clearCache($pricing->getOriginal('arena_id'));
        }
    }

    /**
     * Handle the Pricing "deleted" event.
     */
    public function deleted(Pricing $pricing): void
    {
        $this->pricingService->clearCache($pricing->arena_id);
    }
}
