"use client";

export function ConsentNotice() {
  return (
    <span className="px-6 pb-4 text-center text-xs text-neutral-500">
      By creating an account, you consent that you agree to our <br />
      <a href="/eula" className="underline hover:text-neutral-800">
        Terms&nbsp;&&nbsp;Conditions
      </a>{" "}
      and the{" "}
      <a href="/privacy-policy" className="underline hover:text-neutral-800">
        Privacy Policy
      </a>
      .
    </span>
  );
}
