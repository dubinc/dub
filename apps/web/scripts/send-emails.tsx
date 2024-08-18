import "dotenv-flow/config";
import { sendEmail } from "emails";
import FailedPayment from "emails/failed-payment";

const attemptCount = 2;
const amountDue = 2400;
const user = {
  name: "Steven",
  email: "stevensteel97@gmail.com",
};
const workspace = {
  name: "Dub",
  slug: "dub",
};

async function main() {
  const res = await sendEmail({
    email: user.email as string,
    from: "steven@dub.co",
    subject: `${
      attemptCount == 2
        ? "2nd notice: "
        : attemptCount == 3
          ? "3rd notice: "
          : ""
    }Your payment for Dub.co failed`,
    react: (
      <FailedPayment
        attemptCount={attemptCount}
        amountDue={amountDue}
        user={user}
        workspace={workspace}
      />
    ),
  });

  console.log({ res });
}

main();
