// Ana renk paleti - Dashboard Mobile için
export const colors = {
  // Ana renkler
  primary: '#ff615e',        // Ana turuncu/kırmızı
  primaryDark: '#ff3d3a',    // Koyu turuncu/kırmızı
  primaryLight: '#ff8582',   // Açık turuncu/kırmızı
  
  // İkincil renkler
  secondary: '#34495E',      // Koyu gri
  secondaryLight: '#5D6D7E', // Açık gri
  
  // Nötr renkler
  white: '#f0f0f3',
  black: '#000000',
  gray: '#95A5A6',
  lightGray: '#ECF0F1',
  darkGray: '#7F8C8D',
  
  // Durum renkleri
  success: '#ff615e',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',
  
  // Arka plan renkleri
  background: '#f0f0f3',
  surface: '#f0f0f3',
  card: '#f0f0f3',
  
  // Metin renkleri
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  textLight: '#95A5A6',
  
  // Border ve divider
  border: '#E5E7EB',
  divider: '#F1F3F4',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// Gradient renkleri
export const gradients = {
  primary: ['#ff615e', '#ff3d3a'],
  secondary: ['#34495E', '#2C3E50'],
  light: ['#f0f0f3', '#F8F9FA'],
};

// Gölge renkleri
export const shadows = {
  small: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export default colors;

