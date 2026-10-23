import { plain, PlainUser } from "./client";

export const upsertPlainCustomer = async (
  user: PlainUser & { email: string },
) => {
  const fullName = user.name || user.email;
  const shortName = user.name || user.email.split("@")[0];

  const result = await plain.upsertCustomer({
    identifier: {
      emailAddress: user.email,
    },
    onCreate: {
      fullName,
      shortName,
      email: {
        email: user.email,
        isVerified: true,
      },
      externalId: user.id,
    },
    onUpdate: {
      fullName: {
        value: fullName,
      },
      shortName: {
        value: shortName,
      },
      externalId: {
        value: user.id,
      },
    },
  });

  if (
    result.error?.type === "mutation_error" &&
    result.error.errorDetails.code ===
      "customer_already_exists_with_external_id"
  ) {
    return await plain.upsertCustomer({
      identifier: {
        externalId: user.id,
      },
      onCreate: {
        fullName,
        shortName,
        email: {
          email: user.email,
          isVerified: true,
        },
        externalId: user.id,
      },
      onUpdate: {
        fullName: {
          value: fullName,
        },
        shortName: {
          value: shortName,
        },
        email: {
          email: user.email,
          isVerified: true,
        },
      },
    });
  }

  return result;
};

export const syncPlainCustomerEmail = async ({
  id,
  name,
  email,
  oldEmail,
}: PlainUser & { email: string; oldEmail?: string }) => {
  const fullName = name || email;
  const shortName = name || email.split("@")[0];

  const { data: byExternalId, error: externalIdError } =
    await plain.getCustomerByExternalId({ externalId: id });

  if (externalIdError) {
    console.error(
      "Failed to lookup Plain customer by externalId:",
      externalIdError,
    );
    return;
  }

  let customer = byExternalId ?? null;

  if (!customer && oldEmail) {
    const { data: byEmail, error: emailError } = await plain.getCustomerByEmail(
      {
        email: oldEmail,
      },
    );

    if (emailError) {
      console.error("Failed to lookup Plain customer by email:", emailError);
      return;
    }

    customer = byEmail ?? null;
  }

  if (!customer) {
    return;
  }

  const result = await plain.upsertCustomer({
    identifier: {
      customerId: customer.id,
    },
    onCreate: {
      fullName,
      shortName,
      email: {
        email,
        isVerified: true,
      },
      externalId: id,
    },
    onUpdate: {
      email: {
        email,
        isVerified: true,
      },
      externalId: {
        value: id,
      },
    },
  });

  if (result.error) {
    console.error("Failed to sync Plain customer email:", result.error);
  }

  return result;
};
