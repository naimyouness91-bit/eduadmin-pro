@extends('layouts.app')

@section('title', 'Grades — '.($student->user->name ?? 'Child'))

@section('content')
<div class="space-y-6">
    @include('parent.partials.nav', ['student' => $student])

    <h1 class="text-2xl font-bold">Grades — {{ $student->user->name ?? 'Student' }}</h1>

    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/80 text-left text-xs uppercase text-slate-500">
                <tr>
                    <th class="px-4 py-3">Course</th>
                    <th class="px-4 py-3">Title</th>
                    <th class="px-4 py-3">Score</th>
                    <th class="px-4 py-3">Date</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($grades as $grade)
                    <tr>
                        <td class="px-4 py-3">{{ $grade->course->name ?? '—' }}</td>
                        <td class="px-4 py-3">{{ $grade->title }}</td>
                        <td class="px-4 py-3 font-medium">{{ $grade->score }}/{{ $grade->max_score }}</td>
                        <td class="px-4 py-3 text-slate-500">{{ $grade->created_at?->format('M j, Y') }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-slate-500">No grades recorded yet.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if ($grades->hasPages())
        <div class="text-sm text-slate-500">{{ $grades->links() }}</div>
    @endif
</div>
@endsection
