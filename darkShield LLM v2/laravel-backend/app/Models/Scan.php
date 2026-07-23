<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Scan extends Model
{
    protected $fillable = [
        'url',
        'extracted_text',
        'text_length',
        'regex_results',
        'regex_score',
        'llm_classification',
        'is_dark_pattern',
        'llm_model_used',
    ];

    protected $casts = [
        'regex_results'      => 'array',
        'llm_classification' => 'array',
        'is_dark_pattern'    => 'boolean',
        'regex_score'        => 'float',
    ];
}
