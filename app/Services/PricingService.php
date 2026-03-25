<?php

namespace App\Services;

use App\Models\Pricing;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class PricingService
{
    /**
     * Cache TTL in seconds (1 hour).
     */
    protected const CACHE_TTL = 3600;

    /**
     * Get pricing for an arena with caching.
     *
     * @param int $arenaId
     * @return Collection
     */
    public function getArenasPricing(int $arenaId): Collection
    {
        $cacheKey = $this->getPricingCacheKey($arenaId);

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($arenaId) {
            return Pricing::where('arena_id', $arenaId)
                ->orderBy('time_slot')
                ->get();
        });
    }

    /**
     * Get pricing for specific slots with caching.
     *
     * @param int $arenaId
     * @param array $slots
     * @return Collection
     */
    public function getPricingForSlots(int $arenaId, array $slots): Collection
    {
        $allPricing = $this->getArenasPricing($arenaId);

        return $allPricing->whereIn('time_slot', $slots);
    }

    /**
     * Get single slot pricing.
     *
     * @param int $arenaId
     * @param string $slot
     * @return Pricing|null
     */
    public function getSlotPricing(int $arenaId, string $slot): ?Pricing
    {
        $allPricing = $this->getArenasPricing($arenaId);

        return $allPricing->where('time_slot', $slot)->first();
    }

    /**
     * Calculate total for given slots.
     *
     * @param int $arenaId
     * @param array $slots
     * @return float
     */
    public function calculateTotal(int $arenaId, array $slots): float
    {
        return $this->getPricingForSlots($arenaId, $slots)->sum('price');
    }

    /**
     * Clear pricing cache for an arena.
     *
     * @param int $arenaId
     * @return bool
     */
    public function clearCache(int $arenaId): bool
    {
        return Cache::forget($this->getPricingCacheKey($arenaId));
    }

    /**
     * Clear all pricing caches.
     *
     * @return void
     */
    public function clearAllCaches(): void
    {
        // Get all arena IDs and clear their caches
        $arenaIds = Pricing::distinct()->pluck('arena_id');

        foreach ($arenaIds as $arenaId) {
            $this->clearCache($arenaId);
        }
    }

    /**
     * Get cache key for arena pricing.
     *
     * @param int $arenaId
     * @return string
     */
    protected function getPricingCacheKey(int $arenaId): string
    {
        return "pricing:arena:{$arenaId}";
    }

    /**
     * Warm up cache for all arenas.
     *
     * @return int Number of arenas cached
     */
    public function warmCache(): int
    {
        $arenaIds = Pricing::distinct()->pluck('arena_id');

        foreach ($arenaIds as $arenaId) {
            $this->getArenasPricing($arenaId);
        }

        return $arenaIds->count();
    }
}
