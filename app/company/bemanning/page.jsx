import { redirect } from 'next/navigation';

// Bemanning merged into Planering (Personal) — 2026-11-10.
export default function BemanningRedirect() {
  redirect('/company/schedule');
}
