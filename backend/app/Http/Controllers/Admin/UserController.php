<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    // 'manage_users' is intentionally excluded — the Users tab is role-gated (admin/superadmin only), never permission-gated,
    // so an employee can never manage user accounts no matter what's granted to them.
    private const PERMISSIONS = ['manage_products', 'manage_categories', 'manage_orders', 'manage_customers', 'manage_delivery'];

    public function index(Request $request)
    {
        $query = User::select('id', 'name', 'username', 'phone', 'email', 'avatar_path', 'role', 'permissions', 'is_active', 'created_at');

        // A plain admin only ever sees employee accounts — not other admins, not superadmins, not even themselves.
        // Only a superadmin sees the full staff list.
        if ($request->user()->role !== 'superadmin') {
            $query->where('role', 'employee');
        }

        return $query->latest()->paginate(20);
    }

    public function update(Request $request, User $user)
    {
        abort_if(
            $user->role !== 'employee' && $request->user()->role !== 'superadmin',
            403,
            'Only superadmins can manage admin or superadmin accounts.'
        );

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($user->id)],
            'email' => ['nullable', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'required', Rule::in(['employee', 'admin', 'superadmin'])],
            'permissions' => ['array'],
            'permissions.*' => [Rule::in(self::PERMISSIONS)],
            'avatar' => ['nullable', 'image', 'max:2048'],
            'remove_avatar' => ['sometimes', 'boolean'],
        ]);

        $removeAvatar = $data['remove_avatar'] ?? false;
        unset($data['avatar'], $data['remove_avatar']);

        // A multipart request can't express "an empty array" for permissions[] — sending
        // zero entries just omits the key entirely, which would otherwise be indistinguishable
        // from "the caller didn't touch permissions at all". This marker disambiguates it.
        if ($request->boolean('permissions_included') && ! array_key_exists('permissions', $data)) {
            $data['permissions'] = [];
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $data['avatar_path'] = $request->file('avatar')->store('avatars', 'public');
        } elseif ($removeAvatar && $user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $data['avatar_path'] = null;
        }

        $isSelf = $user->id === $request->user()->id;

        if (array_key_exists('role', $data) && $data['role'] !== $user->role) {
            // Only a superadmin may change anyone's role — a plain admin could otherwise promote
            // an employee straight to admin/superadmin, which is a privilege escalation.
            abort_unless($request->user()->role === 'superadmin', 403, 'Only superadmins can change roles.');
            abort_if($isSelf, 422, "You can't change your own role.");

            // Admins/superadmins have full access by default; only 'employee' accounts use scoped permissions.
            if ($data['role'] !== 'employee') {
                $data['permissions'] = [];
            }
        }

        if ($isSelf) {
            abort_if(array_key_exists('is_active', $data) && ! $data['is_active'], 422, "You can't deactivate your own account.");

            // Never let anyone — including a superadmin — escalate their own permissions through this form.
            unset($data['permissions']);
        }

        $wasActive = $user->is_active;
        $user->update($data);

        if ($wasActive && ! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json($user);
    }

    public function resetPassword(Request $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 422, "You can't reset your own password this way.");

        $user->update(['password' => Hash::make(self::DEFAULT_RESET_PASSWORD)]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset to the default password.']);
    }

    private const DEFAULT_RESET_PASSWORD = '12345678';
}
