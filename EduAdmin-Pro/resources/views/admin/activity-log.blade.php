@extends('layouts.app')

@section('title', 'Activity Log — EduAdmin Pro')

@push('styles')
<style>
    details.audit-details summary { cursor: pointer; list-style: none; }
    details.audit-details summary::-webkit-details-marker { display: none; }
</style>
@endpush

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
            <p class="text-sm text-slate-500 uppercase tracking-wider font-medium">Administration</p>
            <h1 class="text-3xl font-bold mt-1">Audit log</h1>
            <p class="text-slate-500 mt-2">Timeline of student, teacher, grade, attendance, login, and file events.</p>
        </div>
        <a href="{{ url('/activity-log') }}" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:border-primary-500 transition">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            Open React app
        </a>
    </div>

    <form method="GET" class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="lg:col-span-2">
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Search</label>
                <input type="search" name="search" value="{{ $filters['search'] ?? '' }}" placeholder="Description, action, user name or email…"
                    class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Action</label>
                <select name="action" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm">
                    <option value="">All tracked actions</option>
                    @foreach ($actionOptions as $value => $label)
                        <option value="{{ $value }}" @selected(($filters['action'] ?? '') === $value)>{{ $label }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wide">User</label>
                <select name="user_id" class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm">
                    <option value="">All users</option>
                    @foreach ($actors as $actor)
                        <option value="{{ $actor->id }}" @selected((string) ($filters['user_id'] ?? '') === (string) $actor->id)>
                            {{ $actor->name }} ({{ $actor->role }})
                        </option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wide">From</label>
                <input type="date" name="from" value="{{ $filters['from'] ?? '' }}"
                    class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div>
                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wide">To</label>
                <input type="date" name="to" value="{{ $filters['to'] ?? '' }}"
                    class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" />
            </div>
        </div>
        <div class="flex flex-wrap gap-2">
            <button type="submit" class="rounded-xl bg-primary-600 text-white text-sm font-medium px-4 py-2 hover:bg-primary-500 transition">
                <i class="fa-solid fa-filter mr-1"></i> Apply filters
            </button>
            <a href="{{ route('admin.activity-log') }}" class="rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium px-4 py-2 hover:border-primary-500 transition">
                <i class="fa-solid fa-rotate-left mr-1"></i> Reset
            </a>
        </div>
    </form>

    <p class="text-sm text-slate-500">
        Showing {{ $logs->firstItem() ?? 0 }}–{{ $logs->lastItem() ?? 0 }} of {{ $logs->total() }} entries
    </p>

    <div class="relative pl-8 border-l-2 border-primary-500/20 space-y-5">
        @forelse ($logs as $log)
            @php
                $badge = $log->actionBadgeColor();
                $badgeClasses = match ($badge) {
                    'success' => 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                    'danger' => 'bg-red-500/15 text-red-600 dark:text-red-400',
                    'info' => 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
                    default => 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
                };
            @endphp
            <article class="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition">
                <span class="absolute -left-[2.15rem] top-6 w-4 h-4 rounded-full bg-primary-500 ring-4 ring-slate-50 dark:ring-slate-950 shadow-[0_0_12px_rgba(99,102,241,0.5)]"></span>

                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="space-y-2 min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-xs font-semibold px-2.5 py-1 rounded-full {{ $badgeClasses }}">
                                {{ $log->action_label }}
                            </span>
                            <span class="text-xs font-mono text-slate-400">{{ $log->action }}</span>
                        </div>
                        <p class="font-semibold text-base leading-snug">{{ $log->description }}</p>
                    </div>
                    <time class="text-xs text-slate-400 whitespace-nowrap shrink-0" datetime="{{ $log->created_at?->toIso8601String() }}">
                        {{ $log->created_at?->format('M j, Y') }}
                        <span class="block text-right">{{ $log->created_at?->format('H:i') }}</span>
                    </time>
                </div>

                @if ($log->user)
                    <div class="mt-4 flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-sm">
                        <div class="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-600">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div>
                            <p class="font-medium">{{ $log->user->name }}</p>
                            <p class="text-xs text-slate-500">{{ $log->user->email }} · <span class="capitalize">{{ str_replace('_', ' ', $log->user->role) }}</span></p>
                        </div>
                    </div>
                @else
                    <p class="mt-3 text-xs text-slate-400 italic">System or unknown user</p>
                @endif

                <div class="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                    @if ($log->ip_address)
                        <span><i class="fa-solid fa-globe mr-1"></i>{{ $log->ip_address }}</span>
                    @endif
                    @if ($log->model_type)
                        <span><i class="fa-solid fa-cube mr-1"></i>{{ class_basename($log->model_type) }} #{{ $log->model_id }}</span>
                    @endif
                </div>

                @if (! empty($log->old_values) || ! empty($log->new_values))
                    <details class="audit-details mt-4">
                        <summary class="text-xs font-semibold text-primary-600 hover:text-primary-500">
                            <i class="fa-solid fa-chevron-right mr-1 transition-transform [[open]_&]:rotate-90"></i>
                            View action details
                        </summary>
                        <div class="mt-3 grid md:grid-cols-2 gap-3">
                            @if (! empty($log->old_values))
                                <div class="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 overflow-x-auto">
                                    <p class="text-[10px] uppercase font-semibold text-slate-400 mb-2">Previous values</p>
                                    <pre class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ json_encode($log->old_values, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) }}</pre>
                                </div>
                            @endif
                            @if (! empty($log->new_values))
                                <div class="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 overflow-x-auto">
                                    <p class="text-[10px] uppercase font-semibold text-slate-400 mb-2">New values</p>
                                    <pre class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{{ json_encode($log->new_values, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) }}</pre>
                                </div>
                            @endif
                        </div>
                    </details>
                @endif
            </article>
        @empty
            <div class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-500 ml-0">
                <i class="fa-solid fa-clock-rotate-left text-4xl mb-4 opacity-30"></i>
                <p class="font-medium">No audit entries match your filters</p>
                <p class="text-sm mt-2">Try adjusting the date range or clearing filters.</p>
            </div>
        @endforelse
    </div>

    @if ($logs->hasPages())
        <div class="pt-2">
            {{ $logs->links() }}
        </div>
    @endif
</div>
@endsection
