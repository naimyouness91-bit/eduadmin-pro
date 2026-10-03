<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('timetable_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('timetable_entries', 'notes')) {
                $table->string('notes', 255)->nullable()->after('room');
            }
        });
    }

    public function down(): void
    {
        Schema::table('timetable_entries', function (Blueprint $table) {
            if (Schema::hasColumn('timetable_entries', 'notes')) {
                $table->dropColumn('notes');
            }
        });
    }
};
