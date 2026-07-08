<?php

namespace App\Http\Controllers;

use App\Models\Setting;

class PaymentSettingController extends Controller
{
    public function index()
    {
        return response()->json([
            'bkash_number' => Setting::get('bkash_number'),
        ]);
    }
}
