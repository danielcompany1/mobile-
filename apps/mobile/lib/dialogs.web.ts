import type { AlertButton } from 'react-native';

export function showAlert(title: string, message: string, buttons?: AlertButton[]) {
  if (typeof window === 'undefined') return;
  const action = buttons?.find((button) => button.style !== 'cancel');
  if (buttons?.some((button) => button.style === 'cancel')) {
    if (window.confirm(`${title}\n\n${message}`)) action?.onPress?.();
    else buttons.find((button) => button.style === 'cancel')?.onPress?.();
  } else {
    window.alert(`${title}\n\n${message}`);
    action?.onPress?.();
  }
}
