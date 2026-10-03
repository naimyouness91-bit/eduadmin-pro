<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->string('audience', 32)->nullable()->after('type');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->boolean('is_scholarship')->default(false)->after('enrollment_status');
        });
    }

    public function down(): void
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropColumn('audience');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('is_scholarship');
        });
    }
};
