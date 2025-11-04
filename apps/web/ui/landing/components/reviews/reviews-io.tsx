"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    carouselInlineWidget: any;
    reviewsIOData?: any;
  }
}

const reviewsIOTokenId = "2024062615";

const addScript = (src: string) => {
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
  return script;
};

const addLink = (href: string) => {
  const link = document.createElement("link");
  link.href = href;
  link.rel = "stylesheet";
  document.head.appendChild(link);
  return link;
};

const ReviewsIo = () => {
  useEffect(() => {
    const script = addScript(
      `https://widget.reviews.io/carousel-inline-iframeless/dist.js?_t=${reviewsIOTokenId}`,
    );
    addLink(
      `https://assets.reviews.io/css/widgets/carousel-widget.css?_t=${reviewsIOTokenId}`,
    );
    addLink(
      `https://assets.reviews.io/iconfont/reviewsio-icons/style.css?_t=${reviewsIOTokenId}`,
    );

    script.onload = () => {
      new window.carouselInlineWidget("reviewsio-carousel-widget", {
        /* Your REVIEWS.io account ID: */
        store: "getqr.com",
        sku: "",
        lang: "en",
        carousel_type: "topHeader",
        styles_carousel: "CarouselWidget--topHeader",

        /* Widget settings: */
        options: {
          general: {
            /* What reviews should the widget display? Available options: company, product, third_party. You can choose one type or multiple separated by comma. */
            review_type: "company, product",
            /* Minimum number of reviews required for widget to be displayed */
            min_reviews: "1",
            /* Maximum number of reviews to include in the carousel widget. */
            max_reviews: "20",
            address_format: "CITY, COUNTRY",
            /* Carousel auto-scrolling speed. 3000 = 3 seconds. If you want to disable auto-scroll, set this value to false. */
            enable_auto_scroll: 10000,
          },
          header: {
            /* Show overall rating stars */
            enable_overall_stars: true,
            rating_decimal_places: 2,
          },
          reviews: {
            /* Show customer name */
            enable_customer_name: true,
            /* Show customer location */
            enable_customer_location: true,
            /* Show "verified review" badge */
            enable_verified_badge: true,
            /* Show "verified subscriber" badge */
            enable_subscriber_badge: true,
            /* Show "I recommend this product" badge (Only for product reviews) */
            enable_recommends_badge: true,
            /* Show photos attached to reviews */
            enable_photos: true,
            /* Show videos attached to reviews */
            enable_videos: true,
            /* Show when review was written */
            enable_review_date: true,
            /* Hide reviews written by the same customer (This may occur when customer reviews multiple products) */
            disable_same_customer: true,
            /* Minimum star rating */
            min_review_percent: 4,
            /* Show 3rd party review source */
            third_party_source: true,
            /* Hide reviews without comments (still shows if review has a photo) */
            hide_empty_reviews: true,
            /* Show product name */
            enable_product_name: true,
            /* Show only reviews which have specific tags (multiple semicolon separated tags allowed i.e tag1;tag2) */
            tags: "",
            /* Show branch, only one input */
            branch: "",
            enable_branch_name: false,
          },
          popups: {
            /* Make review items clickable (When they are clicked, a popup appears with more information about a customer and review) */
            enable_review_popups: true,
            /* Show "was this review helpful" buttons */
            enable_helpful_buttons: true,
            /* Show how many times review was upvoted as helpful */
            enable_helpful_count: true,
            /* Show share buttons */
            enable_share_buttons: true,
          },
        },
        translations: {
          verified_customer: "Verified Customer",
        },
        styles: {
          "--base-font-size": "16px",
          "--base-maxwidth": "100%",

          "--reviewsio-logo-style": "var(--logo-normal)",

          "--common-star-color": "#006666",
          "--common-star-disabled-color": "rgba(0,0,0,0.1)",
          "--medium-star-size": "20px",
          "--small-star-size": "18px",
          "--x-small-star-size": "16px",
          "--x-small-star-display": "inline-flex",

          "--header-order": "1",
          "--header-width": "160px",
          "--header-bg-start-color": "transparent",
          "--header-bg-end-color": "transparent",
          "--header-gradient-direction": "135deg",
          "--header-padding": "0.5em",
          "--header-border-width": "0px",
          "--header-border-color": "transparent",
          "--header-border-radius": "12px",
          "--header-shadow-size": "0px",
          "--header-shadow-color": "transparent",

          "--header-star-color": "#006666",
          "--header-disabled-star-color": "rgba(0,0,0,0.1)",
          "--header-heading-text-color": "#212121",
          "--header-heading-font-size": "1.25rem",
          "--header-heading-font-weight": "600",
          "--header-heading-line-height": "1.4",
          "--header-heading-text-transform": "none",
          "--header-subheading-text-color": "#6E7275",
          "--header-subheading-font-size": "0.875rem",
          "--header-subheading-font-weight": "400",
          "--header-subheading-line-height": "1.5",
          "--header-subheading-text-transform": "none",

          "--item-maximum-columns": "4",
          "--item-background-start-color": "rgb(248, 252, 252)",
          "--item-background-end-color": "rgb(248, 252, 252)",
          "--item-gradient-direction": "135deg",
          "--item-padding": "2em",
          "--item-border-width": "0px",
          "--item-border-color": "transparent",
          "--item-border-radius": "12px",
          "--item-shadow-size": "0px",
          "--item-shadow-color": "transparent",

          "--heading-text-color": "#212121",
          "--heading-text-font-weight": "600",
          "--heading-text-font-family": "inherit",
          "--heading-text-line-height": "1.4",
          "--heading-text-letter-spacing": "0",
          "--heading-text-transform": "none",

          "--body-text-color": "#6E7275",
          "--body-text-font-weight": "500",
          "--body-text-font-family": "inherit",
          "--body-text-line-height": "1.6",
          "--body-text-letter-spacing": "0",
          "--body-text-transform": "none",

          "--scroll-button-icon-color": "#212121",
          "--scroll-button-icon-size": "24px",
          "--scroll-button-bg-color": "white",

          "--scroll-button-border-width": "1px",
          "--scroll-button-border-color": "#E2E2E3",

          "--scroll-button-border-radius": "12px",
          "--scroll-button-shadow-size": "4px",
          "--scroll-button-shadow-color": "rgba(0,0,0,0.05)",
          "--scroll-button-horizontal-position": "10px",
          "--scroll-button-vertical-position": "0px",

          "--badge-icon-color": "#006666",
          "--badge-icon-font-size": "15px",
          "--badge-text-color": "#212121",
          "--badge-text-font-size": "0.875rem",
          "--badge-text-letter-spacing": "0",
          "--badge-text-transform": "none",

          "--author-font-size": "0.875rem",
          "--author-font-weight": "600",
          "--author-text-transform": "none",

          "--photo-video-thumbnail-size": "60px",
          "--photo-video-thumbnail-border-radius": "8px",

          "--popup-backdrop-color": "rgba(0,0,0,0.75)",
          "--popup-color": "#ffffff",
          "--popup-star-color": "#006666",
          "--popup-disabled-star-color": "rgba(0,0,0,0.1)",
          "--popup-heading-text-color": "#212121",
          "--popup-body-text-color": "#6E7275",
          "--popup-badge-icon-color": "#006666",
          "--popup-badge-icon-font-size": "16px",
          "--popup-badge-text-color": "#212121",
          "--popup-badge-text-font-size": "14px",
          "--popup-border-width": "0px",
          "--popup-border-color": "transparent",
          "--popup-border-radius": "12px",
          "--popup-shadow-size": "24px",
          "--popup-shadow-color": "rgba(0,0,0,0.15)",
          "--popup-icon-color": "#212121",

          "--tooltip-bg-color": "#212121",
          "--tooltip-text-color": "#ffffff",
        },
      });
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div className="w-full" id="reviewsio-carousel-widget" />;
};

export default ReviewsIo;
