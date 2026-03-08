import { ProgressiveBlur } from "@dub/ui";
import { cn } from "@dub/utils";

const LOGO_COUNT = 13;
const ROW_COUNT = 4;

// Randomly shuffle the logos in each row
const ROWS = [...Array(ROW_COUNT)].map(() => {
  const cols = [...Array(LOGO_COUNT)].map((_, col) => col);

  // Shuffle the columns
  let currentIndex = cols.length;

  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [cols[currentIndex], cols[randomIndex]] = [
      cols[randomIndex],
      cols[currentIndex],
    ];
  }

  return cols;
});

const BLUR_STEPS = 5;
const BLUR_STEP_SIZE = 5;

const BLACK = "rgba(0,0,0,1)";
const TRANSPARENT = "rgba(0,0,0,0)";

export function ProgramLogos() {
  return (
    <div className="relative size-full overflow-hidden">
      {/* Gradient */}
      {[...Array(2)].map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "absolute bottom-0 left-1/2 size-[80px] -translate-x-1/2 translate-y-1/2 scale-x-[1.6]",
            idx === 0 ? "mix-blend-overlay" : "opacity-15",
          )}
        >
          {[...Array(idx === 0 ? 2 : 1)].map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2]",
                "bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]",
              )}
            />
          ))}
        </div>
      ))}

      <div className="relative isolate size-full">
        <div className="relative size-full [mask-composite:intersect] [mask-image:linear-gradient(#000f_50%,#0006),linear-gradient(90deg,#000f_50%,#000a)]">
          <div className="translate-y-[30%] skew-y-[-16deg]">
            <div className="flex flex-col gap-7">
              {ROWS.map((cols, row) => (
                <div key={row} className="flex items-center gap-5">
                  {[...Array(2)].map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "relative flex items-center gap-5",
                        "motion-safe:animate-infinite-scroll [--scroll:-100%] motion-safe:[animation-duration:30s]",
                        row % 2 === 0 &&
                          "motion-safe:[animation-direction:reverse]",
                      )}
                    >
                      {cols.map((logoIndex, col) => {
                        return (
                          <div
                            key={col}
                            className="size-[4.5rem] rounded-full"
                            style={{
                              backgroundImage:
                                "url(https://assets.dub.co/misc/partner-auth-logos.png)",
                              backgroundSize: `${LOGO_COUNT * 100}%`,
                              backgroundPositionX:
                                (LOGO_COUNT - (logoIndex % LOGO_COUNT)) * 100 +
                                "%",
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progressive blur */}
        <div className="absolute inset-0">
          <div className="absolute inset-y-0 right-0 w-1/4">
            <ProgressiveBlur side="right" strength={6} steps={8} />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1/4">
            <ProgressiveBlur side="bottom" strength={6} steps={8} />
          </div>
        </div>
      </div>
    </div>
  );
}
