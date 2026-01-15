"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    jQuery?: any;
    $?: any;
  }
}

function initOwl() {
  const $ = window.jQuery || window.$;
  if (!$) return false;

  // plugin attaches here
  if (!$.fn || !$.fn.owlCarousel) return false;

  const $el = $("#intro-carousel");
  if (!$el.length) return true;

  // destroy old instance (safe)
  if ($el.hasClass("owl-loaded")) {
    $el.trigger("destroy.owl.carousel");
    $el.removeClass("owl-loaded owl-hidden");
    $el.find(".owl-stage-outer").children().unwrap();
    $el.find(".owl-stage").children().unwrap();
    $el.find(".owl-item").children().unwrap();
  }

  $el.owlCarousel({
    items: 1,
    loop: true,
    autoplay: true,
    autoplayTimeout: 4000,
    autoplayHoverPause: true,
    dots: true,
    nav: false,
  });

  return true;
}

export default function OwlInit() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const tick = () => {
      if (cancelled) return;
      tries += 1;

      const ok = initOwl();
      if (ok) return;

      // wait for scripts to load
      if (tries < 50) setTimeout(tick, 50); // ~2.5s max
    };

    tick();

    return () => {
      cancelled = true;
      const $ = window.jQuery || window.$;
      if ($?.fn?.owlCarousel) {
        const $el = $("#intro-carousel");
        if ($el.hasClass("owl-loaded")) $el.trigger("destroy.owl.carousel");
      }
    };
  }, [pathname]);

  return null;
}
