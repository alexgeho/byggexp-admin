'use client';

export default function Error({ error, reset }) {
  console.log(error?.message);
  
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Something went wrong</h1>
        <p>{error?.message || 'An unexpected error occurred while loading this page.'}</p>
        <button type="button" className="ant-btn ant-btn-primary" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
