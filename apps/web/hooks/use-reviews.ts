"use client";

import { useEffect, useState } from "react";

export interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  content: string;
}

export interface ReviewsStats {
  averageRating: number;
  totalReviews: number;
}

export const useReviews = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<ReviewsStats>({
    averageRating: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    let mounted = true;

    const loadWidget = () => {
      const container = document.createElement("div");
      container.id = `temp-reviews-${Date.now()}`;
      container.style.cssText =
        "position:absolute;left:-9999px;visibility:hidden;";
      document.body.appendChild(container);

      const script = document.createElement("script");
      script.src =
        "https://widget.reviews.io/carousel-inline-iframeless/dist.js?_t=2024062615";
      script.async = true;

      script.onload = () => {
        if (!mounted || !window.carouselInlineWidget) return;

        try {
          const widget = new window.carouselInlineWidget(container.id, {
            store: "getqr.com",
            sku: "",
            lang: "en",
            carousel_type: "topHeader",
            styles_carousel: "CarouselWidget--topHeader",
            options: {
              general: {
                review_type: "company, product",
                min_reviews: "1",
                max_reviews: "20",
              },
              reviews: {
                min_review_percent: 4,
                hide_empty_reviews: true,
              },
            },
          });

          // Poll for widget data instead of fixed timeout
          let attempts = 0;
          const maxAttempts = 25; // 25 * 200ms = 5 seconds max

          const pollForData = () => {
            if (!mounted) {
              if (container.parentNode) {
                document.body.removeChild(container);
              }
              return;
            }

            attempts++;

            try {
              const ratingElements = container.querySelectorAll(
                ".cssVar-subheading__number",
              );
              const reviewElements = container.querySelectorAll(
                ".R-ReviewsList__item",
              );

              // Check if data is ready
              const hasStats = ratingElements.length >= 2;
              const hasReviews = reviewElements.length > 0;

              if (hasStats || hasReviews) {
                // Extract stats
                if (hasStats) {
                  const averageRating = parseFloat(
                    ratingElements[0].textContent?.trim() || "0",
                  );
                  const totalReviews = parseInt(
                    ratingElements[1].textContent?.trim() || "0",
                  );

                  if (averageRating > 0 && totalReviews > 0) {
                    setStats({
                      averageRating,
                      totalReviews,
                    });
                  }
                }

                // Extract reviews
                if (hasReviews) {
                  const extracted: Testimonial[] = Array.from(reviewElements)
                    .map((el) => {
                      const nameEl = el.querySelector(".cssVar-authorName");
                      const name = nameEl?.textContent?.trim() || "Anonymous";

                      const contentEl = el.querySelector(
                        ".R-ReviewsList__item--body",
                      );
                      const content = contentEl?.textContent?.trim() || "";

                      return {
                        name,
                        role: "Verified Customer",
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=006666&color=fff`,
                        content,
                      };
                    })
                    .filter((t) => t.content.length > 10);

                  if (extracted.length > 0) {
                    setTestimonials(extracted);
                  }
                }

                // Cleanup after successful extraction
                if (container.parentNode) {
                  document.body.removeChild(container);
                }

                // Remove any other widget-related elements
                const widgetElements = document.querySelectorAll(
                  '[class*="CarouselWidget"], [id*="ReviewsWidget"]',
                );
                widgetElements.forEach((el) => {
                  if (el.parentNode) {
                    el.parentNode.removeChild(el);
                  }
                });
              } else if (attempts < maxAttempts) {
                // Continue polling if data not ready and haven't reached max attempts
                setTimeout(pollForData, 200);
              } else {
                // Max attempts reached, cleanup
                console.warn(
                  "Reviews.io widget data not found after max attempts",
                );
                if (container.parentNode) {
                  document.body.removeChild(container);
                }

                // Remove any other widget-related elements
                const widgetElements = document.querySelectorAll(
                  '[class*="CarouselWidget"], [id*="ReviewsWidget"]',
                );
                widgetElements.forEach((el) => {
                  if (el.parentNode) {
                    el.parentNode.removeChild(el);
                  }
                });
              }
            } catch (err) {
              console.error("Error extracting widget data:", err);
              if (container.parentNode) {
                document.body.removeChild(container);
              }

              // Remove any other widget-related elements
              const widgetElements = document.querySelectorAll(
                '[class*="CarouselWidget"], [id*="ReviewsWidget"]',
              );
              widgetElements.forEach((el) => {
                if (el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
            }
          };

          // Start polling after a short delay to let widget initialize
          setTimeout(pollForData, 500);
        } catch (err) {
          console.error("Error initializing widget:", err);
        }
      };

      script.onerror = () => {
        console.error("Failed to load Reviews.io widget script");
        if (container.parentNode) {
          document.body.removeChild(container);
        }
      };

      document.head.appendChild(script);
    };

    loadWidget();

    return () => {
      mounted = false;

      // Cleanup any remaining widget elements on unmount
      const widgetElements = document.querySelectorAll(
        '[class*="CarouselWidget"], [id*="ReviewsWidget"], [id^="temp-reviews-"]',
      );
      widgetElements.forEach((el) => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    };
  }, []);

  return {
    testimonials,
    stats,
  };
};
