<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class CourseDocumentTextExtractor
{
    public const MAX_EXTRACT_CHARS = 50000;

    /**
     * @return array{text: string, error: string|null}
     */
    public function extractFromUpload(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        try {
            $text = match ($extension) {
                'txt' => $this->extractTxt($file->getRealPath()),
                'pdf' => $this->extractPdf($file->getRealPath()),
                'docx' => $this->extractDocx($file->getRealPath()),
                'doc' => $this->extractDocx($file->getRealPath()),
                default => throw new \InvalidArgumentException('Unsupported file type. Use PDF, DOCX, or TXT.'),
            };

            $text = $this->normalizeText($text);

            if (strlen(trim($text)) < 50) {
                return [
                    'text' => '',
                    'error' => 'Could not extract enough text from the file. Try a text-based PDF or DOCX.',
                ];
            }

            return ['text' => Str::limit($text, self::MAX_EXTRACT_CHARS, ''), 'error' => null];
        } catch (\Throwable $e) {
            return ['text' => '', 'error' => $e->getMessage()];
        }
    }

    /**
     * @return array{text: string, error: string|null}
     */
    public function extractFromDisk(string $diskPath): array
    {
        if (! Storage::disk('local')->exists($diskPath)) {
            return ['text' => '', 'error' => 'File not found.'];
        }

        $fullPath = Storage::disk('local')->path($diskPath);
        $extension = strtolower(pathinfo($diskPath, PATHINFO_EXTENSION));

        try {
            $text = match ($extension) {
                'txt' => $this->extractTxt($fullPath),
                'pdf' => $this->extractPdf($fullPath),
                'docx', 'doc' => $this->extractDocx($fullPath),
                default => throw new \InvalidArgumentException('Unsupported file type.'),
            };

            $text = $this->normalizeText($text);

            if (strlen(trim($text)) < 50) {
                return [
                    'text' => '',
                    'error' => 'Could not extract enough text from the file.',
                ];
            }

            return ['text' => Str::limit($text, self::MAX_EXTRACT_CHARS, ''), 'error' => null];
        } catch (\Throwable $e) {
            return ['text' => '', 'error' => $e->getMessage()];
        }
    }

    protected function extractTxt(string $path): string
    {
        $content = file_get_contents($path);

        return $content !== false ? $content : '';
    }

    protected function extractPdf(string $path): string
    {
        if (class_exists(\Smalot\PdfParser\Parser::class)) {
            $parser = new \Smalot\PdfParser\Parser();
            $pdf = $parser->parseFile($path);

            return $pdf->getText();
        }

        return $this->extractPdfBasic($path);
    }

    protected function extractPdfBasic(string $path): string
    {
        $raw = file_get_contents($path);
        if ($raw === false) {
            return '';
        }

        $parts = [];
        if (preg_match_all('/\(([^\\\\()]*(?:\\\\.[^\\\\()]*)*)\)/s', $raw, $matches)) {
            foreach ($matches[1] as $segment) {
                $decoded = stripcslashes($segment);
                if (preg_match('/[\p{L}\p{N}]/u', $decoded)) {
                    $parts[] = $decoded;
                }
            }
        }

        return implode(' ', $parts);
    }

    protected function extractDocx(string $path): string
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new \RuntimeException('Could not open DOCX archive.');
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            throw new \RuntimeException('Invalid DOCX structure.');
        }

        $xml = preg_replace('/<w:tab[^>]*\/>/', "\t", $xml);
        $xml = preg_replace('/<w:br[^>]*\/>/', "\n", $xml);
        $xml = preg_replace('/<\/w:p>/', "\n", $xml);
        $text = strip_tags($xml);

        return html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    protected function normalizeText(string $text): string
    {
        $text = preg_replace("/\r\n|\r/", "\n", $text) ?? $text;
        $text = preg_replace('/[ \t]+/', ' ', $text) ?? $text;
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;

        return trim($text);
    }
}
