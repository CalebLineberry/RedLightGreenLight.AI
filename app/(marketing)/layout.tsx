// app/marketing/layout.tsx
import { ReactNode } from "react";
import Script from "next/script";
import "../../public/lib/bootstrap/css/bootstrap.min.css";
import "../../public/lib/font-awesome/css/font-awesome.min.css";
import "../../public/lib/animate/animate.min.css";
import "../../public/lib/ionicons/css/ionicons.min.css";
import "../../public/lib/owlcarousel/assets/owl.carousel.min.css";
import "../../public/lib/magnific-popup/magnific-popup.css";
import "../../public/css/marketing.css";
//import "../../js/main.js"; // optional: if you convert it to module
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";


export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
     {/* Top auth bar */}
      <header className="w-full">
        <div className="flex justify-end items-center pr-16 pl-6 py-3">
          <SignedOut>
            <div className="flex gap-3">
              <SignInButton mode="modal">
                <button className="bg-[#2D6A4F] text-white px-4 py-2 rounded-md font-medium hover:bg-[#40916C] transition">
                  Sign In
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="bg-[#C1121F] text-white px-4 py-2 rounded-md font-medium hover:bg-[#E63946] transition">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>
      {/* JS Libraries */}
      <Script src="/lib/jquery/jquery.min.js" strategy="beforeInteractive" />
      <Script src="/lib/jquery/jquery-migrate.min.js" strategy="beforeInteractive" />
      <Script src="/lib/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
      <Script src="/lib/easing/easing.min.js" strategy="afterInteractive" />
      <Script src="/lib/superfish/hoverIntent.js" strategy="afterInteractive" />
      <Script src="/lib/superfish/superfish.min.js" strategy="afterInteractive" />
      <Script src="/lib/wow/wow.min.js" strategy="afterInteractive" />
      <Script src="/lib/owlcarousel/owl.carousel.min.js" strategy="afterInteractive" />
      <Script src="/lib/magnific-popup/magnific-popup.min.js" strategy="afterInteractive" />
      <Script src="/lib/sticky/sticky.js" strategy="afterInteractive" />
      <Script src="/js/main.js" strategy="afterInteractive" />

      <main>{children}</main>
    </>
  );
}
