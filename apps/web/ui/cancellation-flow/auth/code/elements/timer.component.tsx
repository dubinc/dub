import { FC } from "react";
import { useTimer } from "../hooks/timer.hook";

interface ITimerComponentProps {
  resendCode: (callback: () => void) => void;
}

export const TimerComponent: FC<Readonly<ITimerComponentProps>> = ({
  resendCode,
}) => {
  const { time, formatTime, isTimerEnded, resetTimer } = useTimer(
    1,
    "emailVerifyCodeTimer",
  );

  const minutesArr = formatTime(time.minutes);
  const secondsArr = formatTime(time.seconds);

  const handleResendCode = () => {
    resendCode(resetTimer);
  };

  return (
    <div className="mx-auto h-fit w-fit text-sm text-neutral-500">
      {!isTimerEnded ? (
        `Request a new code in ${minutesArr}:${secondsArr}`
      ) : (
        <span>
          Didn't receive it? Check your spam folder or{" "}
          <span
            className="cursor-pointer text-blue-500 underline"
            onClick={handleResendCode}
          >
            resend code
          </span>
          .
        </span>
      )}
    </div>
  );
};
