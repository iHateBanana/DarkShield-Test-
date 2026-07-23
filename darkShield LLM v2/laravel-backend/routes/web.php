<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn() => redirect('/dashboard'));

Route::get('/dashboard', function () {
    $scans = \App\Models\Scan::latest()->take(50)->get();
    $stats = [
        'total' => \App\Models\Scan::count(),
        'dark'  => \App\Models\Scan::where('is_dark_pattern', true)->count(),
        'clean' => \App\Models\Scan::where('is_dark_pattern', false)->count(),
    ];
    return view('dashboard', compact('scans', 'stats'));
});
