<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Emploi du temps — {{ $class_section->label ?? 'Classe' }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #1e293b; margin: 16px; }
        h1 { font-size: 15px; margin: 0 0 4px; color: #1e293b; }
        .meta { font-size: 8px; color: #64748b; margin-bottom: 10px; }
        .grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .grid th { background: #334155; color: #fff; padding: 6px 3px; font-size: 8px; border: 1px solid #475569; text-align: center; }
        .grid th.period { background: #1e293b; width: 72px; text-align: left; padding-left: 6px; }
        .grid td { border: 1px solid #cbd5e1; vertical-align: top; padding: 4px; height: 48px; }
        .grid td.period { background: #f1f5f9; font-weight: 700; font-size: 7px; color: #475569; }
        .cell { padding: 3px; background: #f8fafc; border-left: 2px solid #6366f1; min-height: 40px; }
        .subject { font-weight: 700; font-size: 8px; color: #312e81; }
        .meta-line { font-size: 7px; color: #64748b; margin-top: 1px; }
    </style>
</head>
<body>
    <h1>Emploi du temps — {{ $class_section->label ?? '' }}</h1>
    <p class="meta">
        @if($timetable->academic_year) {{ $timetable->academic_year }} @endif
        @if($timetable->semester) · {{ $timetable->semester }} @endif
    </p>
    <table class="grid">
        <thead>
            <tr>
                <th class="period">Créneau</th>
                @foreach($days as $day)
                    @if($day['value'] <= 6)
                        <th>{{ $day['label_fr'] ?? $day['label'] ?? $day['short'] }}</th>
                    @endif
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($periods ?? \App\Support\TimetablePeriods::PERIODS as $period)
                <tr>
                    <td class="period">{{ $period['label'] }}</td>
                    @foreach($days as $day)
                        @if($day['value'] <= 6)
                            @php
                                $key = $day['value'] . '|' . substr($period['start'], 0, 5);
                                $session = $cells[$key] ?? null;
                            @endphp
                            <td>
                                @if($session)
                                    <div class="cell">
                                        <div class="subject">{{ $session['course']['name'] ?? '—' }}</div>
                                        <div class="meta-line">{{ $session['teacher']['user']['name'] ?? '—' }}</div>
                                        <div class="meta-line">{{ $session['room'] ?? '—' }}</div>
                                        @if(!empty($session['notes']))
                                            <div class="meta-line">{{ $session['notes'] }}</div>
                                        @endif
                                    </div>
                                @endif
                            </td>
                        @endif
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
