<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scans', function (Blueprint $table) {
            $table->id();
            $table->string('url', 2048);
            $table->text('extracted_text');
            $table->integer('text_length');
            $table->json('regex_results')->nullable();
            $table->float('regex_score')->nullable();
            $table->json('llm_classification')->nullable();
            $table->boolean('is_dark_pattern')->nullable();
            $table->string('llm_model_used')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scans');
    }
};
