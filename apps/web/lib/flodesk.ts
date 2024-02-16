export async function subscribe({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) {
  return fetch("https://api.flodesk.com/v1/subscribers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.FLODESK_API_KEY}`,
    },
    body: JSON.stringify({
      email,
      ...(name && {
        first_name: name.split(" ")[0],
        last_name: name.split(" ").slice(1).join(" "),
      }),
    }),
  }).then((res) => res.json());
}

export async function unsubscribe(email: string) {
  return fetch(`https://api.flodesk.com/v1/subscribers/${email}/unsubscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.FLODESK_API_KEY}`,
    },
  }).then((res) => res.json());
}
