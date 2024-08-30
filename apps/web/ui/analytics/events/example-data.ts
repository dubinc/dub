const common = {
  ip: "0.0.0.0",
  referer: "(direct)",
  qr: 0,
  device: "Desktop",
  browser: "Chrome",
  os: "Mac OS",
};

const dubLink = {
  link_id: "1",
  domain: "dub.sh", // TODO: update to dub.link
  key: "uxUrVCz",
  url: "https://dub.co/",
  link: {
    id: "1",
    domain: "dub.sh", // TODO: update to dub.link
    key: "uxUrVCz",
    url: "https://dub.co/",
  },
};

const githubLink = {
  link_id: "3",
  domain: "git.new",
  key: "9XyzIho",
  url: "https://github.com/dubinc/dub",
  link: {
    id: "3",
    domain: "git.new",
    key: "9XyzIho",
    url: "https://github.com/dubinc/dub",
  },
};

const steven = {
  customer_name: "Steven",
  customer_email: "",
  customer_avatar: "https://avatar.vercel.sh/s.png?text=S",
  customer: {
    name: "Steven",
    email: "",
    avatar: "https://avatar.vercel.sh/s.png?text=S",
  },
};

const tim = {
  customer_name: "Tim",
  customer_email: "",
  customer_avatar: "https://avatar.vercel.sh/t.png?text=T",
  customer: {
    name: "Tim",
    email: "",
    avatar: "https://avatar.vercel.sh/t.png?text=T",
  },
};

const kiran = {
  customer_name: "Kiran",
  customer_email: "",
  customer_avatar: "https://avatar.vercel.sh/k.png?text=K",
  customer: {
    name: "Kiran",
    email: "",
    avatar: "https://avatar.vercel.sh/k.png?text=K",
  },
};

export const exampleData = {
  clicks: [
    {
      ...common,
      timestamp: "2024-06-09T16:12:02.556Z",
      click_id: "1",
      continent: "NA",
      country: "US",
      city: "San Francisco",
      ...dubLink,
    },
    {
      ...common,
      timestamp: "2024-06-09T15:52:02.556Z",
      click_id: "2",
      continent: "NA",
      country: "US",
      city: "San Francisco",
      ...dubLink,
    },
    {
      ...common,
      timestamp: "2024-06-08T13:32:02.556Z",
      click_id: "3",
      continent: "NA",
      country: "US",
      city: "New York",
      ...githubLink,
    },
  ],
  leads: [
    {
      ...common,
      click_id: "1",
      timestamp: "2024-06-11T17:03:56.000Z",
      event_id: "YbL8RwLTRRCxQz5H",
      event_name: "Sign up",
      continent: "NA",
      country: "US",
      city: "San Francisco",
      ...dubLink,
      ...steven,
    },
    {
      ...common,
      click_id: "2",
      timestamp: "2024-06-10T16:07:56.000Z",
      event_id: "YbL8RwLTRRCxQz5H",
      event_name: "Sign up",
      continent: "AS",
      country: "IN",
      city: "Kerala",
      ...dubLink,
      ...kiran,
    },
    {
      ...common,
      click_id: "3",
      timestamp: "2024-06-10T16:07:56.000Z",
      event_id: "YbL8RwLTRRCxQz5H",
      event_name: "Sign up",
      continent: "NA",
      country: "US",
      city: "Pittsburgh",
      ...dubLink,
      ...tim,
    },
  ],
  sales: [
    {
      ...common,
      click_id: "1",
      timestamp: "2024-06-14T18:36:01.000Z",
      event_id: "Nffk2cwShKu5lQ7E",
      event_name: "Purchase",
      payment_processor: "stripe",
      invoice_id: "123456",
      saleAmount: 900,
      continent: "NA",
      country: "US",
      city: "San Francisco",
      ...dubLink,
      ...steven,
    },
    {
      ...common,
      click_id: "2",
      timestamp: "2024-06-13T20:36:06.000Z",
      event_id: "Nffk2cwShKu5lQ7E",
      event_name: "Purchase",
      payment_processor: "stripe",
      invoice_id: "123456",
      saleAmount: 700,
      continent: "NA",
      country: "US",
      city: "Pittsburgh",
      ...dubLink,
      ...tim,
    },
    {
      ...common,
      click_id: "2",
      timestamp: "2024-06-13T22:02:06.000Z",
      event_id: "Nffk2cwShKu5lQ7E",
      event_name: "Purchase",
      payment_processor: "stripe",
      invoice_id: "123456",
      saleAmount: 1000,
      continent: "AS",
      country: "IN",
      city: "Kerala",
      ...dubLink,
      ...kiran,
    },
  ],
};
