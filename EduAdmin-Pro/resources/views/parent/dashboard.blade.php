@extends('layouts.app')

@section('title', 'Parent Dashboard — EduAdmin Pro')

@section('content')
@php
    $children = collect($data['children'] ?? []);
    $performance = $data['performance'] ?? [];
    $notifications = collect($data['notifications'] ?? []);
    $events = collect($data['upcoming_events'] ?? []);
    $announcements = collect($data['announcements'] ?? []);
    $unread = $notifications->filter(fn ($n) => empty($n->read_at))->count();
@endphp

<div class="space-y-8 animate-[fadeIn_0.4s_ease-out]">
    @include('parent.partials.nav')

    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
            <p class="text-sm text-slate-500 uppercase tracking-wider font-medium">Parent portal</p>
            <h1 class="text-3xl font-bold mt-1">Welcome, {{ $user->name }}</h1>
            <p class="text-slate-500 mt-2">Monitor your children's progress, attendance, schedules, and school updates.</p>
        </div>
    </div>

    {{-- Performance summary --}}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-primary-500/10 to-transparent p-5 shadow-sm">
            <p class="text-xs uppercase text-slate-400 font-semibold tracking-wide">Linked children</p>
            <p class="text-3xl font-bold text-primary-600 mt-2">{{ $performance['children_count'] ?? $children->count() }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-500/10 to-transparent p-5 shadow-sm">
            <p class="text-xs uppercase text-slate-400 font-semibold tracking-wide">Family avg. grade</p>
            <p class="text-3xl font-bold text-emerald-600 mt-2">
                {{ isset($performance['average_grade']) ? $performance['average_grade'].'%' : '—' }}
            </p>
        </div>
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-cyan-500/10 to-transparent p-5 shadow-sm">
            <p class="text-xs uppercase text-slate-400 font-semibold tracking-wide">Family attendance</p>
            <p class="text-3xl font-bold text-cyan-600 mt-2">
                {{ isset($performance['average_attendance']) ? $performance['average_attendance'].'%' : '—' }}
            </p>
        </div>
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-amber-500/10 to-transparent p-5 shadow-sm">
            <p class="text-xs uppercase text-slate-400 font-semibold tracking-wide">Unread notifications</p>
            <p class="text-3xl font-bold text-amber-500 mt-2">{{ $unread }}</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {{-- Notifications --}}
        <section class="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h2 class="text-lg font-semibold flex items-center gap-2 mb-4">
                <i class="fa-solid fa-bell text-primary-500"></i>
                Notifications
            </h2>
            @forelse ($notifications as $notification)
                @php $payload = $notification->data ?? []; @endphp
                <div class="py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 {{ empty($notification->read_at) ? 'bg-primary-500/5 -mx-2 px-2 rounded-lg' : '' }}">
                    <p class="text-sm font-medium">{{ $payload['title'] ?? 'Notification' }}</p>
                    <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ $payload['body'] ?? '' }}</p>
                    <p class="text-[10px] text-slate-400 mt-1">{{ $notification->created_at?->diffForHumans() }}</p>
                </div>
            @empty
                <p class="text-sm text-slate-500">No notifications yet.</p>
            @endforelse
        </section>

        {{-- Events & announcements --}}
        <section class="lg:col-span-2 space-y-6">
            @if ($events->count())
                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-calendar-days text-primary-500"></i>
                        Upcoming events
                    </h2>
                    <div class="space-y-2">
                        @foreach ($events as $event)
                            <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <div>
                                    <p class="font-medium text-sm">{{ $event->title }}</p>
                                    <p class="text-xs text-slate-500 capitalize">{{ $event->type ?? 'event' }}</p>
                                </div>
                                <p class="text-xs text-slate-500">{{ optional($event->start_date)->format('M j, Y') }}</p>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            @if ($announcements->count())
                <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-bullhorn text-primary-500"></i>
                        School announcements
                    </h2>
                    <ul class="space-y-2 text-sm">
                        @foreach ($announcements as $item)
                            <li class="py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <p class="font-medium">{{ $item->title }}</p>
                                <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ $item->content }}</p>
                            </li>
                        @endforeach
                    </ul>
                </div>
            @endif
        </section>
    </div>

    {{-- Children overview --}}
    <section class="space-y-4">
        <h2 class="text-lg font-semibold flex items-center gap-2">
            <i class="fa-solid fa-child text-primary-500"></i>
            Children overview
        </h2>

        @forelse ($children as $child)
            @php
                $student = $child['student'];
                $userModel = $student->user;
            @endphp
            <article class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 class="text-xl font-semibold">{{ $userModel->name ?? 'Student' }}</h3>
                        <p class="text-sm text-slate-500">{{ $student->student_id }} · Grade {{ $student->grade_level }}</p>
                        <div class="flex flex-wrap gap-2 mt-3">
                            <a href="{{ route('parent.children.show', $student) }}" class="text-xs px-3 py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-500">Profile</a>
                            <a href="{{ route('parent.children.grades', $student) }}" class="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-500/10">Grades</a>
                            <a href="{{ route('parent.children.attendance', $student) }}" class="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-500/10">Attendance</a>
                            <a href="{{ route('parent.children.schedule', $student) }}" class="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-500/10">Schedule</a>
                        </div>
                    </div>
                    <div class="flex gap-6 text-sm">
                        <div class="text-center">
                            <p class="text-slate-400 text-xs uppercase">Avg. grade</p>
                            <p class="font-bold text-lg text-emerald-600">{{ $child['average_grade'] ?? '—' }}%</p>
                        </div>
                        <div class="text-center">
                            <p class="text-slate-400 text-xs uppercase">Attendance</p>
                            <p class="font-bold text-lg text-cyan-600">{{ $child['attendance_rate'] ?? '—' }}%</p>
                        </div>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    @if (! empty($child['recent_grades']) && count($child['recent_grades']))
                        <div>
                            <p class="text-xs font-semibold text-slate-400 uppercase mb-2">Recent grades</p>
                            <ul class="space-y-1 text-sm">
                                @foreach ($child['recent_grades'] as $grade)
                                    <li class="flex justify-between">
                                        <span>{{ $grade->course->name ?? 'Course' }}</span>
                                        <span class="font-medium">{{ $grade->score }}/{{ $grade->max_score }}</span>
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                    @endif

                    @if (! empty($child['recent_attendance']) && count($child['recent_attendance']))
                        <div>
                            <p class="text-xs font-semibold text-slate-400 uppercase mb-2">Recent attendance</p>
                            <ul class="space-y-1 text-sm">
                                @foreach ($child['recent_attendance'] as $record)
                                    <li class="flex justify-between capitalize">
                                        <span>{{ $record->course->name ?? 'Class' }} · {{ $record->date?->format('M j') }}</span>
                                        <span class="font-medium {{ $record->status === 'present' ? 'text-emerald-600' : 'text-amber-600' }}">{{ $record->status }}</span>
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                    @endif
                </div>

                @if (! empty($child['today_schedule']) && count($child['today_schedule']))
                    <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p class="text-xs font-semibold text-slate-400 uppercase mb-2">Today's schedule</p>
                        <ul class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                            @foreach ($child['today_schedule'] as $slot)
                                <li>{{ $slot->course->name ?? 'Class' }} — {{ $slot->start_time }}–{{ $slot->end_time }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endif
            </article>
        @empty
            <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500">
                <i class="fa-solid fa-users text-3xl mb-3 opacity-40"></i>
                <p>No linked children found for this parent account.</p>
                <p class="text-xs mt-2">Contact the school administrator to link your account to a student.</p>
            </div>
        @endforelse
    </section>
</div>
@endsection
