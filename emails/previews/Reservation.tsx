import Reservation from "../Reservation";
import BulletedList from "../components/BulletedList";

export function reservationCanceled() {
  return (
    <Reservation
      headline="Reservation Canceled"
      bulletedList={
        <BulletedList
          items={[
            "Salazar in Silver Lake",
            "Sunday, Aug 22 at 1:30pm",
            "Party of 4, patio",
          ]}
        />
      }
      body={
        <>
          If this was a mistake or if you changed your mind, you can use the
          link below to rebook your reservation.
        </>
      }
      ctaText={"Rebook Now"}
    />
  );
}

export function reservationConfirmed() {
  return (
    <Reservation
      headline="Reservation Confirmed"
      bulletedList={
        <BulletedList
          items={[
            "Salazar in Silver Lake",
            "Saturday, Aug 22 at 1:30pm",
            "Party of 4, patio",
          ]}
        />
      }
      body={
        <>
          Thanks for booking your reservation at Salazar with BookBook! If you
          need to cancel or make any changes, just click the link above.
        </>
      }
      ctaText={"View Reservation"}
    />
  );
}

export function reservationChanged() {
  return (
    <Reservation
      headline="Reservation Changed"
      bulletedList={
        <BulletedList
          items={[
            "Salazar in Silver Lake",
            "Sunday, Aug 22 at 1:30pm",
            "Party of 4, patio",
          ]}
        />
      }
      body={
        <>
          You’re all set! Your reservation at Salazar has been successfully
          changed. If you have any questions, please reply to this email.
        </>
      }
      ctaText={"View Reservation"}
    />
  );
}
