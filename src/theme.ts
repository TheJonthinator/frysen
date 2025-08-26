import type { ThemeOptions } from '@mui/material/styles';

// Custom color palette
const colors = {
  yinMnBlue: '#4C6085',
  celestialBlue: '#39A0ED',
  aquamarine: '#36F1CD',
  mint: '#13C4A3',
  blackOlive: '#32322C',
  darkGray: '#2a2a24',
  lightGray: '#404040',
  white: '#ffffff',
  lightText: '#e0e0e0',
  mutedText: '#b0b0b0',
};

export const createAppTheme = (): ThemeOptions => ({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.celestialBlue,
      light: colors.aquamarine,
      dark: colors.yinMnBlue,
    },
    secondary: {
      main: colors.mint,
      light: colors.aquamarine,
      dark: colors.yinMnBlue,
    },
    background: {
      default: colors.blackOlive,
      paper: colors.darkGray,
    },
    text: {
      primary: colors.white,
      secondary: colors.mutedText,
    },
    divider: colors.lightGray,
    action: {
      hover: `rgba(57, 160, 237, 0.15)`,
      selected: `rgba(57, 160, 237, 0.25)`,
    },
  },
      components: {
      MuiCard: {
        styleOverrides: {
          root: {
            background: `linear-gradient(180deg, ${colors.lightGray} 0%, ${colors.darkGray} 100%)`,
            border: `1px solid ${colors.lightGray}`,
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            '&:hover': {
              borderColor: colors.celestialBlue,
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
              background: `linear-gradient(180deg, ${colors.lightGray} 0%, ${colors.darkGray} 100%)`,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: colors.darkGray,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
            borderBottom: `1px solid ${colors.lightGray}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%)',
              pointerEvents: 'none',
            },
          },
          contained: {
            background: `linear-gradient(180deg, ${colors.celestialBlue} 0%, ${colors.yinMnBlue} 100%)`,
            boxShadow: '0 6px 20px rgba(57, 160, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            '&:hover': {
              background: `linear-gradient(180deg, ${colors.aquamarine} 0%, ${colors.celestialBlue} 100%)`,
              boxShadow: '0 8px 25px rgba(57, 160, 237, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
            },
            '&:active': {
              background: `linear-gradient(180deg, ${colors.yinMnBlue} 0%, ${colors.celestialBlue} 100%)`,
              boxShadow: '0 2px 10px rgba(57, 160, 237, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2)',
              transform: 'translateY(1px)',
            },
          },
          outlined: {
            background: `linear-gradient(180deg, rgba(57, 160, 237, 0.1) 0%, rgba(57, 160, 237, 0.05) 100%)`,
            borderColor: colors.celestialBlue,
            color: colors.celestialBlue,
            boxShadow: '0 4px 15px rgba(57, 160, 237, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            '&:hover': {
              background: `linear-gradient(180deg, rgba(57, 160, 237, 0.2) 0%, rgba(57, 160, 237, 0.1) 100%)`,
              borderColor: colors.aquamarine,
              boxShadow: '0 6px 20px rgba(57, 160, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            },
            '&:active': {
              background: `linear-gradient(180deg, rgba(57, 160, 237, 0.05) 0%, rgba(57, 160, 237, 0.1) 100%)`,
              boxShadow: '0 2px 10px rgba(57, 160, 237, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(1px)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '&:hover': {
              backgroundColor: 'rgba(57, 160, 237, 0.15)',
              backdropFilter: 'blur(10px)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 8,
              backdropFilter: 'blur(10px)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.celestialBlue,
                },
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.celestialBlue,
                },
              },
            },
          },
        },
      },
      MuiTypography: {
        styleOverrides: {
          root: {
            color: colors.white,
          },
          subtitle2: {
            color: colors.white,
            fontWeight: 600,
          },
          caption: {
            color: colors.mutedText,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.darkGray,
            backdropFilter: 'blur(15px)',
            border: `1px solid ${colors.lightGray}`,
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
}); 