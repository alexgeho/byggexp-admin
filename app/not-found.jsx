import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist or has been moved.</p>
        <Link href="/login" className="ant-btn ant-btn-primary">
          Go to login
        </Link>
      </section>
    </main>
  );
}
