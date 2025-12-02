import colors from './colors';
import typography from './typography';
import spacing from './spacing';

// Ana tema objesi
const theme = {
  colors,
  typography,
  spacing,
  
  // Genel stiller
  styles: {
    // Container stilleri
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    // Card stilleri
    card: {
      backgroundColor: colors.card,
      borderRadius: spacing.borderRadius.lg,
      padding: spacing.md,
      marginVertical: spacing.sm,
      ...spacing.shadows?.medium,
    },
    
    // Button stilleri
    buttonPrimary: {
      backgroundColor: colors.primary,
      borderRadius: spacing.borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: spacing.layout.buttonHeight,
    },
    
    buttonSecondary: {
      backgroundColor: colors.white,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: spacing.borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: spacing.layout.buttonHeight,
    },
    
    buttonText: {
      ...typography.textStyles.button,
      color: colors.white,
    },
    
    buttonTextSecondary: {
      ...typography.textStyles.button,
      color: colors.primary,
    },
    
    // Input stilleri
    input: {
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: spacing.borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: spacing.layout.inputHeight,
      ...typography.textStyles.body,
      color: colors.textPrimary,
    },
    
    inputFocused: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    
    // Text stilleri
    textPrimary: {
      ...typography.textStyles.body,
      color: colors.textPrimary,
    },
    
    textSecondary: {
      ...typography.textStyles.body,
      color: colors.textSecondary,
    },
    
    textLight: {
      ...typography.textStyles.bodySmall,
      color: colors.textLight,
    },
    
    // Header stilleri
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: spacing.layout.headerHeight,
    },
    
    headerTitle: {
      ...typography.textStyles.h3,
      color: colors.white,
      fontWeight: typography.fontWeights.semibold,
    },
    
    // Tab bar stilleri
    tabBar: {
      backgroundColor: colors.white,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      height: spacing.layout.tabBarHeight,
    },
    
    tabBarLabel: {
      ...typography.textStyles.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    
    tabBarLabelActive: {
      ...typography.textStyles.caption,
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
    },
  },
};

export default theme;

