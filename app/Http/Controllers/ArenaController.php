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
        
        foreach ($arenas as $arena) {
            $arena->min_price = Pricing::where('arena_id', $arena->id)->min('price') ?: 500;
        }

        return view('home', compact('arenas'));
    }

    public function show($slug)
    {
        $arena = Arena::where('slug', $slug)->firstOrFail();
        return view('arena.show', compact('arena'));
    }
}
