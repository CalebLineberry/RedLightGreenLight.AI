(function ($) {
  "use strict";

  // Prevent double initialization in Next.js
  if (window.__MAIN_JS_INITIALIZED__) return;
  window.__MAIN_JS_INITIALIZED__ = true;

  $(function () {

    /* ===============================
       Back to top button
    =============================== */
    $(window).on("scroll", function () {
      $(".back-to-top").toggle($(this).scrollTop() > 100);
    });

    $(document).on("click", ".back-to-top", function (e) {
      e.preventDefault();
      $("html, body").animate({ scrollTop: 0 }, 1500);
    });

    /* ===============================
       Sticky Header
    =============================== */
    if ($.fn.sticky && $("#header").length) {
      $("#header").sticky({ topSpacing: 0, zIndex: 50 });
    }

    /* ===============================
       Owl Carousels
    =============================== */
    if ($.fn.owlCarousel) {
      $("#intro-carousel").owlCarousel({
        autoplay: true,
        dots: false,
        loop: true,
        items: 1,
        animateOut: "fadeOut",
      });

      $(".testimonials-carousel").owlCarousel({
        autoplay: true,
        dots: true,
        loop: true,
        responsive: {
          0: { items: 1 },
          768: { items: 2 },
          900: { items: 3 },
        },
      });

      $(".clients-carousel").owlCarousel({
        autoplay: true,
        dots: true,
        loop: true,
        responsive: {
          0: { items: 2 },
          768: { items: 4 },
          900: { items: 6 },
        },
      });
    }

    /* ===============================
       WOW.js
    =============================== */
    if (window.WOW) {
      new WOW().init();
    }

    /* ===============================
       Superfish Menu
    =============================== */
    if ($.fn.superfish && $(".nav-menu").length) {
      $(".nav-menu").superfish({
        animation: { opacity: "show" },
        speed: 400,
      });
    }

    /* ===============================
       Mobile Navigation
    =============================== */
    if ($("#nav-menu-container").length && !$("#mobile-nav").length) {
      const $mobileNav = $("#nav-menu-container").clone().prop({ id: "mobile-nav" });
      $mobileNav.find("> ul").removeAttr("class id");
      $("body").append($mobileNav);
      $("body").prepend('<button id="mobile-nav-toggle"><i class="fa fa-bars"></i></button>');
      $("body").append('<div id="mobile-body-overly"></div>');
      $("#mobile-nav .menu-has-children").prepend('<i class="fa fa-chevron-down"></i>');
    }

    $(document).on("click", ".menu-has-children i", function () {
      $(this).next().toggleClass("menu-item-active");
      $(this).nextAll("ul").eq(0).slideToggle();
      $(this).toggleClass("fa-chevron-up fa-chevron-down");
    });

    $(document).on("click", "#mobile-nav-toggle", function () {
      $("body").toggleClass("mobile-nav-active");
      $("#mobile-nav-toggle i").toggleClass("fa-times fa-bars");
      $("#mobile-body-overly").toggle();
    });

    $(document).on("click", function (e) {
      if (!$("#mobile-nav, #mobile-nav-toggle").is(e.target) &&
          $("#mobile-nav, #mobile-nav-toggle").has(e.target).length === 0) {
        $("body").removeClass("mobile-nav-active");
        $("#mobile-body-overly").fadeOut();
        $("#mobile-nav-toggle i").removeClass("fa-times").addClass("fa-bars");
      }
    });

    /* ===============================
       Smooth Scroll
    =============================== */
    $(document).on("click", ".nav-menu a, #mobile-nav a, .scrollto", function (e) {
      const target = $(this.hash);
      if (target.length) {
        e.preventDefault();
        let offset = $("#header").outerHeight() || 0;
        $("html, body").animate(
          { scrollTop: target.offset().top - offset },
          1500
        );
      }
    });

    /* ===============================
       Magnific Popup
    =============================== */
    if ($.fn.magnificPopup) {
      $(".portfolio-popup").magnificPopup({
        type: "image",
        gallery: { enabled: true },
        mainClass: "mfp-fade",
        removalDelay: 300,
      });
    }

    /* ===============================
       Google Maps (SAFE)
    =============================== */
    if (
      window.google &&
      google.maps &&
      $("#google-map").length
    ) {
      const lat = $("#google-map").data("latitude");
      const lng = $("#google-map").data("longitude");

      if (lat && lng) {
        const map = new google.maps.Map(
          document.getElementById("google-map"),
          {
            zoom: 14,
            center: { lat, lng },
            scrollwheel: false,
          }
        );

        new google.maps.Marker({
          position: { lat, lng },
          map,
        });
      }
    }

  });
})(jQuery);
