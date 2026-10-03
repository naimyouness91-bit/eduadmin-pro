@extends('layouts.app')

@section('title', ($data['student']->user->name ?? 'Child').' — Parent Portal')

@section('content')
@php
    $student = $data['student'];
    $userModel = $student->user;
@endphp

<div class="space-y-6">
    @include('parent.partials.nav', ['student' => $student])

    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h1 class="text-2xl font-bold">{{ $userModel->name ?? 'Student' }}</h1>
        <p class="text-slate-500 mt-1">{{ $student->student_id }} · Grade {{ $student->grade_level }} · {{ ucfirst($student->enrollment_status) }}</p>

        <div class="grid sm:grid-cols-3 gap-4 mt-6">
            <div class="rounded-xl bg-emerald-500/10 p-4">
                <p class="text-xs uppercase text-slate-400">Average grade</p>
                <p class="text-2xl font-bold text-emerald-600">{{ $data['average_grade'] ?? '—' }}%</p>
            </div>
            <div class="rounded-xl bg-cyan-500/10 p-4">
                <p class="text-xs uppercase text-slate-400">Attendance rate</p>
                <p class="text-2xl font-bold text-cyan-600">{{ $data['attendance_rate'] ?? '—' }}%</p>
            </div>
            <div class="rounded-xl bg-primary-500/10 p-4">
                <p class="text-xs uppercase text-slate-400">Enrolled courses</p>
                <p class="text-2xl font-bold text-primary-600">{{ $data['courses_count'] ?? 0 }}</p>
            </div>
        </div>

        @if ($student->courses->count())
            <div class="mt-6">
                <h2 class="text-sm font-semibold uppercase text-slate-400 mb-2">Courses</h2>
                <ul class="space-y-2 text-sm">
                    @foreach ($student->courses as $course)
                        <li class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                            <span>{{ $course->name }}</span>
                            <span class="text-slate-500">{{ $course->teacher->user->name ?? 'Teacher' }}</span>
                        </li>
                    @endforeach
                </ul>
            </div>
        @endif
    </div>

    @if (! empty($data['recent_attendance']) && $data['recent_attendance']->count())
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-3">Recent attendance</h2>
            <ul class="space-y-2 text-sm">
                @foreach ($data['recent_attendance'] as $record)
                    <li class="flex justify-between capitalize py-2 border-b border-slate-100 dark:border-slate-800">
                        <span>{{ $record->course->name ?? 'Class' }} · {{ $record->date?->format('M j, Y') }}</span>
                        <span class="font-medium">{{ $record->status }}</span>
                    </li>
                @endforeach
            </ul>
        </div>
    @endif
</div>
@endsection
