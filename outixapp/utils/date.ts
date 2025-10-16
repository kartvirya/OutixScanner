// Simple date formatting utilities

export const formatAppDate = (date: string | number | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.warn('Date formatting error:', error);
    return '';
  }
};

export const formatAppDateTime = (date: string | number | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return dateObj.toLocaleString();
  } catch (error) {
    console.warn('Date formatting error:', error);
    return '';
  }
};

export const formatAppTime = (date: string | number | Date | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return dateObj.toLocaleTimeString();
  } catch (error) {
    console.warn('Time formatting error:', error);
    return '';
  }
};
