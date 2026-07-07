<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    private const MAX_BANNERS = 4;

    public function index()
    {
        return Banner::orderBy('sort_order')->get();
    }

    public function store(Request $request)
    {
        abort_if(Banner::count() >= self::MAX_BANNERS, 422, 'You can only have up to '.self::MAX_BANNERS.' banners.');

        $data = $request->validate([
            'image' => ['required', 'image', 'max:4096'],
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        $banner = Banner::create([
            'image_path' => $request->file('image')->store('banners', 'public'),
            'caption' => $data['caption'] ?? null,
            'sort_order' => (int) Banner::max('sort_order') + 1,
        ]);

        return response()->json($banner, 201);
    }

    public function update(Request $request, Banner $banner)
    {
        $data = $request->validate([
            'image' => ['sometimes', 'image', 'max:4096'],
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        if ($request->hasFile('image')) {
            Storage::disk('public')->delete($banner->image_path);
            $data['image_path'] = $request->file('image')->store('banners', 'public');
        }
        unset($data['image']);

        $banner->update($data);

        return response()->json($banner->fresh());
    }

    public function destroy(Banner $banner)
    {
        Storage::disk('public')->delete($banner->image_path);
        $banner->delete();

        return response()->json(['message' => 'Banner deleted']);
    }
}
