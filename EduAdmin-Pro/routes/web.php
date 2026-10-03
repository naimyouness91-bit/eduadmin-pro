<?php

use App\Http\Controllers\LandingController;
use App\Http\Controllers\Web\ActivityLogViewController;
use App\Http\Controllers\Web\ParentDashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Landing page (Blade) at /. Primary app UI is the React SPA (/login, etc.).
|
*/

Route::get('/', function () {
    $spa = public_path('index.html');
    if (is_file($spa)) {
        return response()->file($spa);
    }

    return app(LandingController::class)->index();
})->name('home');

Route::get('/login', function () {
    $spa = public_path('index.html');
    if (is_file($spa)) {
        return response()->file($spa);
    }
    $frontend = env('FRONTEND_URL', 'http://127.0.0.1:5173');

    return redirect(rtrim($frontend, '/').'/login');
})->name('login');
Route::redirect('/register', '/login', 301)->name('register');

Route::middleware(['auth:sanctum', 'parent'])->prefix('parent')->name('parent.')->group(function () {
    Route::get('/dashboard', [ParentDashboardController::class, 'dashboard'])
        ->name('dashboard');
    Route::get('/children/{student}', [ParentDashboardController::class, 'childProfile'])
        ->name('children.show');
    Route::get('/children/{student}/grades', [ParentDashboardController::class, 'childGrades'])
        ->name('children.grades');
    Route::get('/children/{student}/attendance', [ParentDashboardController::class, 'childAttendance'])
        ->name('children.attendance');
    Route::get('/children/{student}/schedule', [ParentDashboardController::class, 'childSchedule'])
        ->name('children.schedule');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/admin/activity-log', [ActivityLogViewController::class, 'index'])
        ->name('admin.activity-log');
});
