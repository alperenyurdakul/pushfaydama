// Spacing değerleri (8px tabanlı sistem)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

// Border radius değerleri
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// Layout boyutları
export const layout = {
  // Header yükseklikleri
  headerHeight: 60,
  headerHeightLarge: 80,
  
  // Tab bar yüksekliği
  tabBarHeight: 60,
  
  // Button boyutları
  buttonHeight: 48,
  buttonHeightSmall: 36,
  buttonHeightLarge: 56,
  
  // Input boyutları
  inputHeight: 48,
  
  // Card boyutları
  cardPadding: spacing.md,
  cardMargin: spacing.sm,
  
  // Icon boyutları
  iconSmall: 16,
  iconMedium: 24,
  iconLarge: 32,
  iconXLarge: 40,
};

// Responsive breakpoints
export const breakpoints = {
  small: 375,
  medium: 414,
  large: 768,
};

export default {
  spacing,
  borderRadius,
  layout,
  breakpoints,
};

