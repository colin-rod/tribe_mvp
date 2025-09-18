import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-8">
            Welcome to{' '}
            <span className="text-primary-600">Tribe</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl">
            Smart baby update distribution platform. Share precious moments with your loved ones in a private, secure environment.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="btn btn-primary px-8 py-3 text-lg"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn btn-secondary px-8 py-3 text-lg"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-16 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            Private Sharing{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Share updates with family and friends in a secure, private environment only for your loved ones.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            Smart Distribution{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            AI-powered suggestions for who should receive which updates, when they should get them.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            Easy Management{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Simple interface to manage your children, recipients, and sharing preferences all in one place.
          </p>
        </div>
      </div>
    </main>
  )
}