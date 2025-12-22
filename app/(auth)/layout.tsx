import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="flex justify-end p-4">
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>

      {children}
    </>
  )
}
