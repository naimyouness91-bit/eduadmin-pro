@extends('layouts.app')

@section('title', 'Attendance — '.($student->user->name ?? 'Child'))

@section('content')
<div class="space-y-6">
    @include('parent.partials.nav', ['student' => $student])

    <h1 class="text-2xl font-bold">Attendance — {{ $student->user->name ?? 'Student' }}</h1>

    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/80 text-left text-xs uppercase text-slate-500">
                <tr>
                    <th class="px-4 py-3">Date</th>
                    <th class="px-4 py-3">Course</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Notes</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @forelse ($records as $record)
                    <tr>
                        <td class="px-4 py-3">{{ $record->date?->format('M j, Y') }}</td>
                        <td class="px-4 py-3">{{ $record->course->name ?? '—' }}</td>
                        <td class="px-4 py-3 capitalize font-medium">{{ $record->status }}</td>
                        <td class="px-4 py-3 text-slate-500">{{ $record->notes ?? '—' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-slate-500">No attendance records yet.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @if ($records->hasPages())
        <div class="text-sm text-slate-500">{{ $records->links() }}</div>
    @endif
</div>
@endsection
