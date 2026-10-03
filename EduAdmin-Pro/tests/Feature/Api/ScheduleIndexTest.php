<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesTestUsers;
use Tests\TestCase;

class ScheduleIndexTest extends TestCase
{
    use CreatesTestUsers;
    use RefreshDatabase;

    public function test_get_schedules_with_active_only_query(): void
    {
        Sanctum::actingAs($this->createAdminUser());

        $this->getJson('/api/schedules?active_only=1')->assertOk();
        $this->getJson('/api/schedules?active_only=true')->assertOk();
    }
}
