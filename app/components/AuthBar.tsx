// components/AuthBar.tsx
"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function AuthBar() {
  return (
    <div className="flex justify-end items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="bg-[#125419] text-white px-4 py-2 rounded-md font-medium hover:bg-[#40916C] transition">
            Sign In
          </button>
        </SignInButton>

        <SignUpButton mode="modal">
          <button className="bg-[#810E1C] text-white px-4 py-2 rounded-md font-medium hover:bg-[#E63946] transition">
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>

      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
