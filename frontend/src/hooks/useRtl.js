import { useTranslation } from 'react-i18next';
import { ARABIC_ENABLED } from '../i18n';

/**
 * RTL state synced with i18n / document.documentElement.dir (no page refresh).
 * Returns LTR while Arabic support is disabled.
 */
export function useRtl() {
  const { i18n } = useTranslation();

  if (!ARABIC_ENABLED) {
    return { isRtl: false, dir: 'ltr' };
  }

  const isRtl = i18n.language === 'ar' || document.documentElement.dir === 'rtl';

  return {
    isRtl,
    dir: isRtl ? 'rtl' : 'ltr',
  };
}

export function isRtlActive() {
  if (!ARABIC_ENABLED) {
    return false;
  }

  return document.documentElement.dir === 'rtl' || document.documentElement.lang === 'ar';
}
