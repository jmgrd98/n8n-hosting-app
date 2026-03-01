import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const { Link, useRouter, usePathname, redirect } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'always',
});
