<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    // 'manage_users' is intentionally excluded — the Users tab is role-gated (admin/superadmin only), never permission-gated.
    private const PERMISSIONS = ['manage_products', 'manage_categories', 'manage_orders', 'manage_customers', 'manage_delivery'];

    public function index()
    {
        return User::whereIn('role', ['admin', 'superadmin'])
            ->select('id', 'name', 'username', 'phone', 'email', 'role', 'permissions', 'created_at')
            ->latest()
            ->paginate(20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:users,username'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['employee', 'admin', 'superadmin'])],
            'permissions' => ['array'],
            'permissions.*' => [Rule::in(self::PERMISSIONS)],
        ]);

        $employee = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            // Admins/superadmins have full access by default; only 'employee' accounts use scoped permissions.
            'permissions' => $data['role'] === 'employee' ? ($data['permissions'] ?? []) : [],
        ]);

        return response()->json($employee, 201);
    }

    public function update(Request $request, User $employee)
    {
        abort_unless(in_array($employee->role, ['admin', 'superadmin'], true), 404);

        $data = $request->validate([
            'role' => ['sometimes', 'required', Rule::in(['admin', 'superadmin'])],
            'permissions' => ['array'],
            'permissions.*' => [Rule::in(self::PERMISSIONS)],
        ]);

        $employee->update($data);

        return response()->json($employee);
    }

    public function destroy(Request $request, User $employee)
    {
        abort_unless(in_array($employee->role, ['admin', 'superadmin'], true), 404);
        abort_if($employee->id === $request->user()->id, 422, "You can't remove your own account.");

        $employee->delete();

        return response()->json(['message' => 'Employee removed']);
    }
}
