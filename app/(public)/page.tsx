import Link from 'next/link';

const STEPS = [
  {
    number: 1,
    title: 'Connect or Upload',
    description:
      'Bring your own Supabase project or upload an Excel file — your data, your rules.',
  },
  {
    number: 2,
    title: 'Map Your Columns',
    description:
      'Match your headers to the 7 required fields. Keep extras as custom fields.',
  },
  {
    number: 3,
    title: 'Analyze With AI',
    description:
      'GPT-4o turns your monthly performance into a concise, ready-to-share briefing.',
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="bg-slate-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            From Excel to AI-Powered Portfolio Intelligence in 15 Minutes.
          </h1>
          <p className="mt-5 text-lg text-slate-300">
            Connect your Supabase project or upload your data. Get automated monthly briefings
            powered by GPT-4o.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/auth?tab=signup"
              className="rounded-md bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-400"
            >
              Get Started Free
            </Link>
            <Link
              href="/auth"
              className="rounded-md border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-slate-900">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
                  {step.number}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Start analyzing your portfolio today.
          </h2>
          <Link
            href="/auth?tab=signup"
            className="rounded-md bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-400"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </>
  );
}
