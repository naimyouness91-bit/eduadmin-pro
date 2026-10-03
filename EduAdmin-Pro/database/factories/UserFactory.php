<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => 'password',
            'remember_token' => Str::random(10),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            if (blank($user->role)) {
                $user->forceFill(['role' => 'student', 'is_active' => true])->save();
            }
        });
    }

    public function admin(): static
    {
        return $this->afterCreating(function (User $user) {
            $user->forceFill(['role' => 'admin', 'is_active' => true])->save();
        });
    }

    public function teacher(): static
    {
        return $this->afterCreating(function (User $user) {
            $user->forceFill(['role' => 'teacher', 'is_active' => true])->save();
        });
    }

    public function student(): static
    {
        return $this->afterCreating(function (User $user) {
            $user->forceFill(['role' => 'student', 'is_active' => true])->save();
        });
    }

    public function parent(): static
    {
        return $this->afterCreating(function (User $user) {
            $user->forceFill(['role' => 'parent', 'is_active' => true])->save();
        });
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
