// app/marketing/layout.tsx
import { ReactNode } from "react";

import Script from "next/script";
import "../../../public/lib/bootstrap/css/bootstrap.min.css";
import "../../../public/lib/font-awesome/css/font-awesome.min.css";
import "../../../public/lib/animate/animate.min.css";
import "../../../public/lib/ionicons/css/ionicons.min.css";
import "../../../public/lib/owlcarousel/assets/owl.carousel.min.css";
import "../../../public/lib/magnific-popup/magnific-popup.css";
import "../../../public/css/marketing.css";
//import "../../js/main.js"; // optional: if you convert it to module

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


export default async function ReportsLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <>      
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
