<?php

namespace Database\Seeders;

use App\Models\District;
use Illuminate\Database\Seeder;

class DistrictSeeder extends Seeder
{
    private const DHAKA_DIVISION = [
        'Dhaka', 'Faridpur', 'Gazipur', 'Gopalganj', 'Kishoreganj', 'Madaripur',
        'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Rajbari', 'Shariatpur', 'Tangail',
    ];

    private const OTHER_DISTRICTS = [
        // Chittagong Division
        'Bandarban', 'Brahmanbaria', 'Chandpur', 'Chittagong', 'Comilla', "Cox's Bazar",
        'Feni', 'Khagrachhari', 'Lakshmipur', 'Noakhali', 'Rangamati',
        // Rajshahi Division
        'Bogra', 'Chapainawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj',
        // Khulna Division
        'Bagerhat', 'Chuadanga', 'Jessore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira',
        // Barisal Division
        'Barguna', 'Barisal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur',
        // Sylhet Division
        'Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet',
        // Rangpur Division
        'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon',
        // Mymensingh Division
        'Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur',
    ];

    public function run(): void
    {
        foreach (self::DHAKA_DIVISION as $name) {
            District::firstOrCreate(['name' => $name], ['delivery_charge' => $name === 'Dhaka' ? 60 : 120]);
        }

        foreach (self::OTHER_DISTRICTS as $name) {
            District::firstOrCreate(['name' => $name], ['delivery_charge' => 120]);
        }
    }
}
