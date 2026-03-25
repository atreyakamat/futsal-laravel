<?php

namespace Tests\Unit;

use App\Services\SlotMergeService;
use PHPUnit\Framework\TestCase;

class SlotMergeServiceTest extends TestCase
{
    public function test_merges_two_consecutive_slots(): void
    {
        $slots = ['18:00-19:00', '19:00-20:00'];
        $result = SlotMergeService::mergeSlots($slots);

        $this->assertEquals('6:00 PM - 8:00 PM', $result);
    }

    public function test_merges_three_consecutive_slots(): void
    {
        $slots = ['18:00-19:00', '19:00-20:00', '20:00-21:00'];
        $result = SlotMergeService::mergeSlots($slots);

        $this->assertEquals('6:00 PM - 9:00 PM', $result);
    }

    public function test_handles_non_consecutive_slots(): void
    {
        $slots = ['18:00-19:00', '21:00-22:00'];
        $result = SlotMergeService::mergeSlots($slots);

        $this->assertEquals('6:00 PM - 7:00 PM, 9:00 PM - 10:00 PM', $result);
    }

    public function test_handles_mixed_consecutive_and_non_consecutive(): void
    {
        $slots = ['18:00-19:00', '19:00-20:00', '21:00-22:00'];
        $result = SlotMergeService::mergeSlots($slots);

        $this->assertEquals('6:00 PM - 8:00 PM, 9:00 PM - 10:00 PM', $result);
    }

    public function test_handles_single_slot(): void
    {
        $slots = ['18:00-19:00'];
        $result = SlotMergeService::mergeSlots($slots);

        $this->assertEquals('6:00 PM - 7:00 PM', $result);
    }

    public function test_handles_empty_array(): void
    {
        $slots = [];
        $result = SlotMergeService::mergeSlots($slots);

        $this->assertEquals('', $result);
    }

    public function test_handles_unsorted_slots(): void
    {
        $slots = ['20:00-21:00', '18:00-19:00', '19:00-20:00'];
        $result = SlotMergeService::mergeSlots($slots);

        $this->assertEquals('6:00 PM - 9:00 PM', $result);
    }

    public function test_formats_single_slot(): void
    {
        $slot = '14:00-15:00';
        $result = SlotMergeService::formatSlot($slot);

        $this->assertEquals('2:00 PM - 3:00 PM', $result);
    }

    public function test_formats_morning_slot(): void
    {
        $slot = '06:00-07:00';
        $result = SlotMergeService::formatSlot($slot);

        $this->assertEquals('6:00 AM - 7:00 AM', $result);
    }

    public function test_formats_noon_slot(): void
    {
        $slot = '12:00-13:00';
        $result = SlotMergeService::formatSlot($slot);

        $this->assertEquals('12:00 PM - 1:00 PM', $result);
    }

    public function test_formats_midnight_slot(): void
    {
        $slot = '00:00-01:00';
        $result = SlotMergeService::formatSlot($slot);

        $this->assertEquals('12:00 AM - 1:00 AM', $result);
    }

    public function test_total_duration_single_slot(): void
    {
        $slots = ['18:00-19:00'];
        $duration = SlotMergeService::getTotalDuration($slots);

        $this->assertEquals(60, $duration);
    }

    public function test_total_duration_multiple_slots(): void
    {
        $slots = ['18:00-19:00', '19:00-20:00', '20:00-21:00'];
        $duration = SlotMergeService::getTotalDuration($slots);

        $this->assertEquals(180, $duration);
    }

    public function test_duration_text_one_hour(): void
    {
        $slots = ['18:00-19:00'];
        $duration = SlotMergeService::getDurationText($slots);

        $this->assertEquals('1 hour', $duration);
    }

    public function test_duration_text_multiple_hours(): void
    {
        $slots = ['18:00-19:00', '19:00-20:00'];
        $duration = SlotMergeService::getDurationText($slots);

        $this->assertEquals('2 hours', $duration);
    }

    public function test_duration_text_half_hour(): void
    {
        $slots = ['18:00-18:30'];
        $duration = SlotMergeService::getDurationText($slots);

        $this->assertEquals('30 minutes', $duration);
    }
}
