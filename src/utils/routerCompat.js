'use client';

import NextLink from 'next/link';
import { useParams as useNextParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { useDashboardActions } from '../layouts/DashboardActionsContext';

const resolveRelativeHref = (pathname, to) => {
  if (typeof to !== 'string' || to.startsWith('/')) {
    return to;
  }

  const baseSegments = pathname.split('/').filter(Boolean);
  const target = to.startsWith('./') ? to.slice(2) : to;

  return `/${[...baseSegments, target].filter(Boolean).join('/')}`;
};

export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback((to, options = {}) => {
    if (typeof to === 'number') {
      router.back();
      return;
    }

    const href = resolveRelativeHref(pathname, to);

    if (options.replace) {
      router.replace(href);
      return;
    }

    router.push(href);
  }, [pathname, router]);
}

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return {
    pathname,
    search: search ? `?${search}` : '',
  };
}

export function useParams() {
  return useNextParams();
}

export function useOutletContext() {
  return useDashboardActions();
}

export function Link({ to, href, children, ...props }) {
  return (
    <NextLink href={href || to} {...props}>
      {children}
    </NextLink>
  );
}

export function Navigate({ to, replace = false }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return null;
}

export function Outlet() {
  return null;
}

export function BrowserRouter({ children }) {
  return children;
}

export function Routes({ children }) {
  return children;
}

export function Route() {
  return null;
}
