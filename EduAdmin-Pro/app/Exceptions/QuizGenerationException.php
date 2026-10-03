<?php

namespace App\Exceptions;

use Exception;

class QuizGenerationException extends Exception
{
    public function __construct(
        string $message,
        public readonly ?string $errorCode = null,
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    public function toArray(): array
    {
        return array_filter([
            'message' => $this->getMessage(),
            'error_code' => $this->errorCode,
        ]);
    }
}
