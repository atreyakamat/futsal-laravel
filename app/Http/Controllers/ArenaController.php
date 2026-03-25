<?php

namespace App\Http\Controllers;

use App\Models\Arena;
use App\Models\Pricing;
use Illuminate\Http\Request;

class ArenaController extends Controller
{
    public function index()
    {
        $arenas = Arena::where('status', 'active')->orderBy('name')->get();
        
        $arenaIds = $arenas->pluck('id');
        $minPrices = Pricing::whereIn('arena_id', $arenaIds)
            ->selectRaw('arena_id, MIN(price) as min_price')
            ->groupBy('arena_id')
            ->pluck('min_price', 'arena_id');

        foreach ($arenas as $arena) {
            $arena->min_price = $minPrices->get($arena->id) ?? 500;
        }

        return view('home', compact('arenas'));
    }

    public function show($slug)
    {
        $arena = Arena::where('slug', $slug)->firstOrFail();
        
        // Ensure min_price is available for the view
        $arena->min_price = Pricing::where('arena_id', $arena->id)->min('price') ?? 500;

        return view('arena.show', compact('arena'));
    }
}
