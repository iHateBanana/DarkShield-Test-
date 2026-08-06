<?php

use App\Http\Controllers\Api\ScanController;
use Illuminate\Support\Facades\Route;

Route::post('/scan', [ScanController::class, 'store']);
Route::get('/scans', [ScanController::class, 'index']);
Route::get('/scans/stats', [ScanController::class, 'stats']);
