<?php

namespace App\Services;

use Carbon\Carbon;

class SlotMergeService
{
    /**
     * Merge consecutive time slots into combined ranges.
     *
     * Input: ["18:00-19:00", "19:00-20:00", "21:00-22:00"]
     * Output: "6:00 PM - 8:00 PM, 9:00 PM - 10:00 PM"
     *
     * @param array $slots Array of time slot strings (e.g., "18:00-19:00")
     * @return string Merged and formatted time ranges
     */
    public static function mergeSlots(array $slots): string
    {
        if (empty($slots)) {
            return '';
        }

        if (count($slots) === 1) {
            return self::formatSlot($slots[0]);
        }

        $parsed = self::parseAndSort($slots);
        $merged = self::mergeConsecutive($parsed);

        return self::formatMergedRanges($merged);
    }

    /**
     * Parse time slots and sort by start time.
     *
     * @param array $slots
     * @return array Array of ['start' => minutes, 'end' => minutes, 'original' => slot]
     */
    protected static function parseAndSort(array $slots): array
    {
        $parsed = [];

        foreach ($slots as $slot) {
            $times = self::parseSlot($slot);
            if ($times) {
                $parsed[] = $times;
            }
        }

        usort($parsed, fn($a, $b) => $a['start'] <=> $b['start']);

        return $parsed;
    }

    /**
     * Parse a slot string into start and end times in minutes since midnight.
     *
     * @param string $slot Slot string like "18:00-19:00"
     * @return array|null ['start' => int, 'end' => int]
     */
    protected static function parseSlot(string $slot): ?array
    {
        if (!preg_match('/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/', $slot, $matches)) {
            return null;
        }

        $startHour = (int) $matches[1];
        $startMin = (int) $matches[2];
        $endHour = (int) $matches[3];
        $endMin = (int) $matches[4];

        return [
            'start' => $startHour * 60 + $startMin,
            'end' => $endHour * 60 + $endMin,
        ];
    }

    /**
     * Merge consecutive time ranges.
     *
     * @param array $parsed Sorted array of parsed time ranges
     * @return array Merged time ranges
     */
    protected static function mergeConsecutive(array $parsed): array
    {
        if (empty($parsed)) {
            return [];
        }

        $merged = [];
        $current = $parsed[0];

        for ($i = 1; $i < count($parsed); $i++) {
            $next = $parsed[$i];

            // Check if consecutive (current end == next start)
            if ($current['end'] === $next['start']) {
                $current['end'] = $next['end'];
            } else {
                $merged[] = $current;
                $current = $next;
            }
        }

        $merged[] = $current;

        return $merged;
    }

    /**
     * Format merged ranges into human-readable string.
     *
     * @param array $ranges
     * @return string
     */
    protected static function formatMergedRanges(array $ranges): string
    {
        $formatted = [];

        foreach ($ranges as $range) {
            $formatted[] = self::formatTime($range['start']) . ' - ' . self::formatTime($range['end']);
        }

        return implode(', ', $formatted);
    }

    /**
     * Format a single slot string to 12-hour format.
     *
     * @param string $slot Slot string like "18:00-19:00"
     * @return string Formatted like "6:00 PM - 7:00 PM"
     */
    public static function formatSlot(string $slot): string
    {
        $parsed = self::parseSlot($slot);

        if (!$parsed) {
            return $slot;
        }

        return self::formatTime($parsed['start']) . ' - ' . self::formatTime($parsed['end']);
    }

    /**
     * Convert minutes since midnight to 12-hour format string.
     *
     * @param int $minutes
     * @return string
     */
    protected static function formatTime(int $minutes): string
    {
        $hours = intdiv($minutes, 60);
        $mins = $minutes % 60;

        $period = $hours >= 12 ? 'PM' : 'AM';
        $displayHour = $hours % 12;
        if ($displayHour === 0) {
            $displayHour = 12;
        }

        return sprintf('%d:%02d %s', $displayHour, $mins, $period);
    }

    /**
     * Get total duration of slots in minutes.
     *
     * @param array $slots
     * @return int
     */
    public static function getTotalDuration(array $slots): int
    {
        $total = 0;

        foreach ($slots as $slot) {
            $parsed = self::parseSlot($slot);
            if ($parsed) {
                $total += $parsed['end'] - $parsed['start'];
            }
        }

        return $total;
    }

    /**
     * Get duration in human-readable format.
     *
     * @param array $slots
     * @return string
     */
    public static function getDurationText(array $slots): string
    {
        $minutes = self::getTotalDuration($slots);
        $hours = intdiv($minutes, 60);
        $mins = $minutes % 60;

        if ($hours === 0) {
            return "{$mins} minutes";
        }

        if ($mins === 0) {
            return $hours === 1 ? "1 hour" : "{$hours} hours";
        }

        return "{$hours} hr {$mins} min";
    }
}
