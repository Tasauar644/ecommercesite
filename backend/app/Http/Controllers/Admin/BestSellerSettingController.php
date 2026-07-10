<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class BestSellerSettingController extends Controller
{
    public function index()
    {
        return response()->json([
            'auto_enabled' => Setting::get('auto_best_seller_enabled', '0') === '1',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'auto_enabled' => ['required', 'boolean'],
        ]);

        Setting::set('auto_best_seller_enabled', $data['auto_enabled'] ? '1' : '0');

        return response()->json(['auto_enabled' => $data['auto_enabled']]);
    }
}
