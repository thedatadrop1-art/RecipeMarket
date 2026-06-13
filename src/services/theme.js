const theme = {
  colors: {
    primary: '#C8502A',
    primaryLight: '#E8724A',
    primaryDark: '#8B3219',
    background: '#FAF7F4',
    backgroundCard: '#FFFFFF',
    backgroundSecondary: '#F2EDE8',
    backgroundTertiary: '#EAE2DA',
    text: '#1C1008',
    textSecondary: '#6B5744',
    textMuted: '#9E8878',
    border: '#DDD5CC',
    borderLight: '#EDE8E4',
    accent: '#D4A853',
    accentLight: '#FDF3E0',
    success: '#5A8A3C',
    successLight: '#E8F2E0',
    error: '#C0392B',
    errorLight: '#FAEDED',
    cream: '#FBF8F5',
    brown: '#3D2314',
    gold: '#C9A84C',
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  radius: {
    sm: 8, md: 12, lg: 16, xl: 24, full: 999,
  },
  shadows: {
    small: {
      shadowColor: '#3D2314',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#3D2314',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export default theme;
export { theme };