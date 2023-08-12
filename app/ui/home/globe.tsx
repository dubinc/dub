import GlobeClient from "./globe-client";

export default async function Globe() {
  const response = process.env.TINYBIRD_API_KEY
    ? await fetch(`https://api.us-east.tinybird.co/v0/pipes/coordinates.json`, {
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
        },
        next: {
          revalidate: 43200, // every 12 hours
        },
      })
        .then((res) => res.json())
        .then((res) => res.data)
        .catch(() => [])
    : [];

  const markers = response.map(({ latitude, longitude }, idx) => {
    return {
      location: [latitude, longitude],
      size: 0.075 - (0.075 / 50) * idx,
    };
  });

  return <GlobeClient markers={markers} />;
}
