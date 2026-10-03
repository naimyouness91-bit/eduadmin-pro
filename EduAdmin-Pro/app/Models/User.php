<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'password', 'avatar', 'phone', 'address',
        'date_of_birth', 'gender', 'locale', 'timezone', 'theme',
        'bio', 'last_login_at', 'two_factor_confirmed_at',
    ];

    protected $hidden = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'two_factor_confirmed_at' => 'datetime',
        'date_of_birth' => 'date',
        'is_active' => 'boolean',
        'password' => 'hashed',
        'last_login_at' => 'datetime',
    ];

    // ─── Relationships ───────────────────────────────────────────
    public function student()   { return $this->hasOne(Student::class); }
    public function teacher()   { return $this->hasOne(Teacher::class); }
    public function parent()    { return $this->hasOne(ParentModel::class); }
    public function sentMessages()     { return $this->hasMany(Message::class, 'sender_id'); }
    public function receivedMessages() { return $this->hasMany(Message::class, 'receiver_id'); }
    public function activityLogs() { return $this->hasMany(ActivityLog::class); }
    public function loginEvents() { return $this->hasMany(LoginEvent::class); }
    public function announcements() { return $this->hasMany(Announcement::class, 'created_by'); }

    // ─── Role Helpers ────────────────────────────────────────────
    public function isSuperAdmin(): bool { return $this->role === 'super_admin'; }
    public function isAdmin(): bool      { return $this->role === 'admin'; }
    public function isTeacher(): bool    { return $this->role === 'teacher'; }
    public function isStudent(): bool    { return $this->role === 'student'; }
    public function isParent(): bool     { return $this->role === 'parent'; }
    public function hasRole(string|array $roles): bool {
        return in_array($this->role, (array)$roles);
    }

    // ─── Accessors ───────────────────────────────────────────────
    public function getAvatarUrlAttribute(): string {
        return $this->avatar
            ? asset('storage/' . $this->avatar)
            : "https://ui-avatars.com/api/?name=" . urlencode($this->name) . "&background=6366f1&color=fff";
    }

    public function hasTwoFactorEnabled(): bool {
        return !is_null($this->two_factor_confirmed_at);
    }

    /**
     * Update safe profile fields; privileged attributes require forceFill.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function updateProfileAttributes(array $attributes): void
    {
        $privileged = ['role', 'is_active', 'two_factor_secret', 'two_factor_recovery_codes'];
        $forced = array_intersect_key($attributes, array_flip($privileged));
        $safe = array_diff_key($attributes, array_flip($privileged));

        if ($safe !== []) {
            $this->update($safe);
        }

        if ($forced !== []) {
            $this->forceFill($forced)->save();
        }
    }
}