<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Student Bulletin — {{ $display['student_id'] }}</title>
    <style>
        @page { margin: 28px 32px; }
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 11px;
            color: #1e293b;
            line-height: 1.45;
            margin: 0;
        }
        .header-table { width: 100%; border-bottom: 3px solid #6366f1; padding-bottom: 14px; margin-bottom: 18px; }
        .header-table td { vertical-align: top; }
        .school-name { font-size: 20px; font-weight: bold; color: #4f46e5; margin: 0 0 4px 0; }
        .school-meta { font-size: 10px; color: #64748b; margin: 0; }
        .doc-title { font-size: 13px; font-weight: bold; color: #334155; margin: 8px 0 0 0; }
        .meta-right { text-align: right; font-size: 10px; color: #64748b; }
        .badge {
            display: inline-block;
            background: #eef2ff;
            color: #4338ca;
            font-size: 9px;
            font-weight: bold;
            padding: 3px 8px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-box {
            width: 100%;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 16px;
        }
        .info-box h2 { font-size: 16px; margin: 0 0 10px 0; color: #0f172a; }
        .info-grid { width: 100%; }
        .info-grid td { width: 50%; padding: 3px 8px 3px 0; font-size: 10px; vertical-align: top; }
        .info-grid strong { color: #475569; }
        .summary-table { width: 100%; margin-bottom: 18px; border-collapse: separate; border-spacing: 8px 0; }
        .summary-table td {
            width: 33%;
            background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%);
            border: 1px solid #c7d2fe;
            border-radius: 8px;
            text-align: center;
            padding: 12px 8px;
        }
        .summary-value { font-size: 22px; font-weight: bold; color: #4f46e5; display: block; }
        .summary-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 4px; display: block; }
        h3.section-title {
            font-size: 12px;
            color: #4f46e5;
            border-left: 4px solid #6366f1;
            padding-left: 8px;
            margin: 16px 0 8px 0;
        }
        table.data { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        table.data th {
            background: #6366f1;
            color: #ffffff;
            font-size: 10px;
            padding: 8px 10px;
            text-align: left;
        }
        table.data td {
            font-size: 10px;
            padding: 7px 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        table.data tr:nth-child(even) td { background: #f8fafc; }
        .empty-row { text-align: center; color: #94a3b8; font-style: italic; }
        .footer-table { width: 100%; margin-top: 20px; padding-top: 12px; border-top: 1px solid #cbd5e1; }
        .footer-table td { vertical-align: middle; font-size: 9px; color: #64748b; }
        .qr-wrap { text-align: right; }
        .qr-wrap svg { width: 90px; height: 90px; }
        .verify { font-family: monospace; font-size: 9px; color: #475569; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td style="width: 80px;">{!! $logoHtml !!}</td>
            <td>
                <p class="school-name">{{ $schoolName }}</p>
                @if($schoolAddress)<p class="school-meta">{{ $schoolAddress }}</p>@endif
                @if($schoolPhone || $schoolEmail)
                    <p class="school-meta">
                        @if($schoolPhone){{ $schoolPhone }}@endif
                        @if($schoolPhone && $schoolEmail) · @endif
                        @if($schoolEmail){{ $schoolEmail }}@endif
                    </p>
                @endif
                <p class="doc-title">Official Student Bulletin / Report Card</p>
            </td>
            <td class="meta-right" style="width: 28%;">
                <span class="badge">Verified document</span>
                <p style="margin-top:8px;"><strong>Generated</strong><br>{{ $generatedAt }}</p>
                <p style="margin-top:6px;"><strong>Reference</strong><br>{{ $display['student_id'] }}</p>
                <p style="margin-top:6px;"><strong>{{ $display['academic_year'] }}</strong><br>{{ $display['semester'] }}</p>
            </td>
        </tr>
    </table>

    <div class="info-box">
        <h2>{{ $display['student_name'] }}</h2>
        <table class="info-grid">
            <tr>
                <td><strong>Student ID:</strong> {{ $display['student_id'] }}</td>
                <td><strong>Email:</strong> {{ $display['email'] }}</td>
            </tr>
            <tr>
                <td><strong>Grade level:</strong> {{ $display['grade_level'] }}</td>
                <td><strong>Section:</strong> {{ $display['section'] }}</td>
            </tr>
            <tr>
                <td><strong>Status:</strong> {{ $display['enrollment_status'] }}</td>
                <td><strong>Guardian:</strong> {{ $display['guardian_name'] }}</td>
            </tr>
        </table>
    </div>

    <table class="summary-table">
        <tr>
            <td>
                <span class="summary-value">{{ $display['average_grade'] }}</span>
                <span class="summary-label">Average score</span>
            </td>
            <td>
                <span class="summary-value">{{ $display['attendance_rate'] }}</span>
                <span class="summary-label">Attendance rate</span>
            </td>
            <td>
                <span class="summary-value">{{ $display['courses_enrolled'] }}</span>
                <span class="summary-label">Courses enrolled</span>
            </td>
        </tr>
    </table>

    <h3 class="section-title">Grades by course</h3>
    <table class="data">
        <thead>
            <tr>
                <th>Course</th>
                <th>Course average</th>
                <th>Assessments</th>
            </tr>
        </thead>
        <tbody>
            @forelse($report['grades_by_course'] as $row)
                <tr>
                    <td>{{ $row['course']['name'] ?? '—' }}</td>
                    <td>{{ isset($row['average']) ? round($row['average'], 1).'%' : 'N/A' }}</td>
                    <td>{{ count($row['grades'] ?? []) }}</td>
                </tr>
            @empty
                <tr><td colspan="3" class="empty-row">No grades recorded for this student.</td></tr>
            @endforelse
        </tbody>
    </table>

    @if(count($grades_flat) > 0)
        <h3 class="section-title">Grade details</h3>
        <table class="data">
            <thead>
                <tr>
                    <th>Course</th>
                    <th>Assessment</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                @foreach($grades_flat as $g)
                    <tr>
                        <td>{{ $g['course'] }}</td>
                        <td>{{ $g['title'] }}</td>
                        <td>{{ $g['type'] }}</td>
                        <td>{{ $g['score'] }}</td>
                        <td>{{ $g['percentage'] }}</td>
                        <td>{{ $g['date'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <h3 class="section-title">Attendance summary</h3>
    <table class="data">
        <thead>
            <tr>
                <th>Course</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Late</th>
                <th>Excused</th>
                <th>Rate</th>
            </tr>
        </thead>
        <tbody>
            @forelse($report['attendance_by_course'] as $row)
                <tr>
                    <td>{{ $row['course']['name'] ?? '—' }}</td>
                    <td>{{ $row['present'] ?? 0 }}</td>
                    <td>{{ $row['absent'] ?? 0 }}</td>
                    <td>{{ $row['late'] ?? 0 }}</td>
                    <td>{{ $row['excused'] ?? 0 }}</td>
                    <td>{{ isset($row['rate']) ? round($row['rate'], 1).'%' : '100%' }}</td>
                </tr>
            @empty
                <tr><td colspan="6" class="empty-row">No attendance records on file.</td></tr>
            @endforelse
        </tbody>
    </table>

    <table class="footer-table">
        <tr>
            <td style="width: 70%;">
                <p><strong>Document verification</strong></p>
                <p class="verify">Code: {{ $verifyShort }}</p>
                <p style="margin-top:6px;">This bulletin was generated electronically by EduAdmin Pro. Scan the QR code to verify authenticity.</p>
            </td>
            <td class="qr-wrap">{!! $qrSvg !!}</td>
        </tr>
    </table>
</body>
</html>
