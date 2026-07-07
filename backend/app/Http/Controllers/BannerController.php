<?php

namespace App\Http\Controllers;

use App\Models\Banner;

class BannerController extends Controller
{
    public function index()
    {
        return Banner::orderBy('sort_order')->limit(4)->get();
    }
}
