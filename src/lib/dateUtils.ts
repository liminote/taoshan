export interface BusinessDateInfo {
    businessDate: Date;
    businessMonthKey: string;
    isNightOwl: boolean;
}

/**
 * Parses a date string and returns the business date information.
 * Day boundary is 05:00 AM, meaning any time before 05:00 AM is attributed to the previous calendar day.
 * Night Owl period is defined as >= 22:30 and < 05:00.
 *
 * @param dateStr The date string from Google Sheets (e.g. "2026/03/01 03:30" or "2026-03-01 03:30")
 * @returns BusinessDateInfo or null if invalid date
 */
export function getBusinessDateAndPeriod(dateStr: string | undefined): BusinessDateInfo | null {
    if (!dateStr) return null;

    const date = new Date(dateStr.replace(/\//g, '-'));
    if (isNaN(date.getTime())) return null;

    // Clone date for business logic
    const businessDate = new Date(date.getTime());

    // Shift back by 5 hours to align everything before 5 AM to the previous day
    businessDate.setHours(businessDate.getHours() - 5);

    const businessMonthKey = `${businessDate.getFullYear()}-${String(businessDate.getMonth() + 1).padStart(2, '0')}`;

    // Determine Night Owl logic
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Night owl is >= 22:30 (1350 mins) OR < 05:00 (300 mins)
    const isNightOwl = timeInMinutes >= (22 * 60 + 30) || timeInMinutes < (5 * 60);

    return {
        businessDate,
        businessMonthKey,
        isNightOwl
    };
}
