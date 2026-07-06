<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\District;
use Illuminate\Http\Request;

class DistrictController extends Controller
{
    public function index()
    {
        return District::orderBy('name')->get();
    }

    public function zones()
    {
        return response()->json([
            [
                'zone' => 'dhaka',
                'label' => 'Dhaka',
                'delivery_charge' => District::where('name', 'Dhaka')->value('delivery_charge'),
            ],
            [
                'zone' => 'outside',
                'label' => 'Outside Dhaka',
                'delivery_charge' => District::where('name', '!=', 'Dhaka')->value('delivery_charge'),
            ],
        ]);
    }

    public function updateZone(Request $request, string $zone)
    {
        abort_unless(in_array($zone, ['dhaka', 'outside'], true), 404);

        $data = $request->validate([
            'delivery_charge' => ['required', 'numeric', 'min:0', 'max:9999.99'],
        ]);

        District::where('name', $zone === 'dhaka' ? '=' : '!=', 'Dhaka')->update($data);

        return response()->json(['zone' => $zone, 'label' => $zone === 'dhaka' ? 'Dhaka' : 'Outside Dhaka', 'delivery_charge' => $data['delivery_charge']]);
    }
}
