'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The löneunderlag is now the Löner page itself; old links land there.
export default function PayrollBasisRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/company/invoicing/payroll'); }, [router]);
  return null;
}
