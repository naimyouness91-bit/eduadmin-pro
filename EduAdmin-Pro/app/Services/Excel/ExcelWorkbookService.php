<?php

namespace App\Services\Excel;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExcelWorkbookService
{
    /**
     * @return array{headers: array<int, string>, rows: array<int, array<string, string|null>>}
     */
    public function parseUpload(UploadedFile $file): array
    {
        $path = $file->getRealPath() ?: $file->getPathname();
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension === 'csv') {
            return $this->parseCsv($path);
        }

        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $raw = $sheet->toArray(null, true, true, false);

        if (count($raw) < 1) {
            return ['headers' => [], 'rows' => []];
        }

        $headerRow = array_shift($raw);
        $headers = $this->normalizeHeaders($headerRow);

        $rows = [];
        foreach ($raw as $index => $cells) {
            if ($this->isEmptyRow($cells)) {
                continue;
            }
            $row = [];
            foreach ($headers as $i => $key) {
                $row[$key] = isset($cells[$i]) ? trim((string) $cells[$i]) : null;
            }
            $rows[] = $row;
        }

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * @return array{headers: array<int, string>, rows: array<int, array<string, string|null>>}
     */
    protected function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return ['headers' => [], 'rows' => []];
        }

        $headerRow = fgetcsv($handle);
        if ($headerRow === false) {
            fclose($handle);

            return ['headers' => [], 'rows' => []];
        }

        $headers = $this->normalizeHeaders($headerRow);
        $rows = [];

        while (($cells = fgetcsv($handle)) !== false) {
            if ($this->isEmptyRow($cells)) {
                continue;
            }
            $row = [];
            foreach ($headers as $i => $key) {
                $row[$key] = isset($cells[$i]) ? trim((string) $cells[$i]) : null;
            }
            $rows[] = $row;
        }

        fclose($handle);

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * @param  array<int, string>  $headerRow
     * @return array<int, string>
     */
    public function normalizeHeaders(array $headerRow): array
    {
        return array_map(function ($cell) {
            $label = trim((string) $cell);
            $label = preg_replace('/\s*\*+\s*$/', '', $label) ?? $label;
            $key = Str::slug(strtolower($label), '_');

            return match ($key) {
                'e_mail', 'email_address' => 'email',
                'student_number', 'student_code' => 'student_id',
                'teacher_number', 'teacher_code' => 'teacher_id',
                'course_code' => 'code',
                'course_name' => 'name',
                default => $key,
            };
        }, $headerRow);
    }

    /**
     * @param  array<int, string>  $expected
     * @param  array<int, string>  $actual
     * @return array<int, string>
     */
    public function missingRequiredHeaders(array $expected, array $actual): array
    {
        $missing = [];
        foreach ($expected as $header) {
            if (! in_array($header, $actual, true)) {
                $missing[] = $header;
            }
        }

        return $missing;
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $dataRows
     */
    public function downloadSpreadsheet(array $headers, array $dataRows, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        foreach ($headers as $col => $header) {
            $sheet->setCellValue([$col + 1, 1], $header);
        }

        foreach ($dataRows as $rowIndex => $row) {
            foreach ($row as $col => $value) {
                $sheet->setCellValue([$col + 1, $rowIndex + 2], $value);
            }
        }

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  array<int, string>  $cells
     */
    protected function isEmptyRow(array $cells): bool
    {
        foreach ($cells as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}
