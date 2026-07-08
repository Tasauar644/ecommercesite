<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class PaymentSettingController extends Controller
{
    public function index()
    {
        return response()->json([
            'bkash_number' => Setting::get('bkash_number'),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'bkash_number' => ['nullable', 'string', 'max:20'],
        ]);

        Setting::set('bkash_number', $data['bkash_number'] ?? null);

        return response()->json(['bkash_number' => $data['bkash_number'] ?? null]);
    }
}
