@extends('layouts.app')

@section('title', 'Schedule — '.($student->user->name ?? 'Child'))

@section('content')
@php
    $days = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];
    $weekly = collect($schedule['weekly'] ?? []);
    $today = collect($schedule['today'] ?? []);
@endphp

<div class="space-y-6">
    @include('parent.partials.nav', ['student' => $student])

    <h1 class="text-2xl font-bold">Schedule — {{ $student->user->name ?? 'Student' }}</h1>

    @if ($today->count())
        <div class="rounded-2xl border border-primary-500/30 bg-primary-500/5 p-5">
            <h2 class="text-sm font-semibold uppercase text-primary-600 mb-3">Today</h2>
            <ul class="space-y-2 text-sm">
                @foreach ($today as $slot)
                    <li class="flex justify-between">
                        <span class="font-medium">{{ $slot->course->name ?? 'Class' }}</span>
                        <span class="text-slate-500">{{ $slot->start_time }} – {{ $slot->end_time }}</span>
                    </li>
                @endforeach
            </ul>
        </div>
    @endif

    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 class="text-lg font-semibold mb-4">Weekly timetable</h2>
        <div class="space-y-6">
            @foreach ($days as $num => $label)
                @php $slots = $weekly->where('day_of_week', $num); @endphp
                @if ($slots->count())
                    <div>
                        <p class="text-xs font-semibold uppercase text-slate-400 mb-2">{{ $label }}</p>
                        <ul class="space-y-2 text-sm">
                            @foreach ($slots as $slot)
                                <li class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span>{{ $slot->course->name ?? 'Class' }}</span>
                                    <span class="text-slate-500">{{ $slot->start_time }} – {{ $slot->end_time }}</span>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endif
            @endforeach
        </div>
        @if ($weekly->isEmpty())
            <p class="text-sm text-slate-500">No schedule entries for enrolled courses.</p>
        @endif
    </div>
</div>
@endsection
