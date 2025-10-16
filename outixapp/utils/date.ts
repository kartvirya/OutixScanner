/**
 * Date utility functions for the Outix Scanner app
 */

/**
 * Formats a date string or Date object to a user-friendly format
 * @param date - Date string or Date object to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatAppDateTime = (
  date: string | Date | null | undefined,
  options: {
    includeTime?: boolean;
    format?: 'short' | 'long' | 'medium';
  } = {}
): string => {
  if (!date) {
    return 'No date';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const { includeTime = false, format = 'medium' } = options;

    // Format options for different styles
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: format === 'short' ? 'short' : format === 'long' ? 'long' : 'numeric',
      day: 'numeric',
    };

    if (includeTime) {
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
    }

    return new Intl.DateTimeFormat('en-AU', formatOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a date to show relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) {
    return 'No date';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
      return formatAppDateTime(dateObj, { format: 'short' });
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
};

/**
 * Checks if a date is today
 * @param date - Date string or Date object
 * @returns True if the date is today
 */
export const isToday = (date: string | Date | null | undefined): boolean => {
  if (!date) return false;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
};

/**
 * Formats a date for display in event cards
 * @param date - Date string or Date object
 * @returns Formatted date string for event display
 */
export const formatEventDate = (date: string | Date | null | undefined): string => {
  if (!date) {
    return 'No date';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    if (isToday(dateObj)) {
      return 'Today';
    }

    // Check if it's tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (
      dateObj.getDate() === tomorrow.getDate() &&
      dateObj.getMonth() === tomorrow.getMonth() &&
      dateObj.getFullYear() === tomorrow.getFullYear()
    ) {
      return 'Tomorrow';
    }

    // For other dates, show the formatted date
    return formatAppDateTime(dateObj, { format: 'medium' });
  } catch (error) {
    console.error('Error formatting event date:', error);
    return 'Invalid date';
  }
};

/**
 * Parses a date string and returns a Date object
 * @param dateString - Date string to parse
 * @returns Date object or null if invalid
 */
export const parseDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Gets the time difference between two dates in milliseconds
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Time difference in milliseconds
 */
export const getTimeDifference = (
  date1: string | Date,
  date2: string | Date
): number => {
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    return Math.abs(d1.getTime() - d2.getTime());
  } catch (error) {
    console.error('Error calculating time difference:', error);
    return 0;
  }
};

/**
 * Formats a date string to show only the date part (no time)
 * @param dateString - Date string to format
 * @returns Formatted date string
 */
export const formatAppDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'No date';
  }

  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting app date:', error);
    return 'Invalid date';
  }
};

/**
 * Formats a time string to show only the time part (no date)
 * @param timeString - Time string to format
 * @returns Formatted time string
 */
export const formatAppTime = (timeString: string | null | undefined): string => {
  if (!timeString) {
    return 'No time';
  }

  try {
    // Handle different time formats
    let date: Date;
    
    // If it's a full datetime string, parse it
    if (timeString.includes('T') || timeString.includes(' ')) {
      date = new Date(timeString);
    } else {
      // If it's just a time string, create a date with today's date
      const today = new Date();
      const [hours, minutes] = timeString.split(':');
      date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                     parseInt(hours, 10), parseInt(minutes, 10));
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }

    return new Intl.DateTimeFormat('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch (error) {
    console.error('Error formatting app time:', error);
    return 'Invalid time';
  }
};
