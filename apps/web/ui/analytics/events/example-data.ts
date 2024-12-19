const common = {
  ip: "0.0.0.0",
  referer: "(direct)",
  qr: 0,
  device: "Desktop",
  browser: "Chrome",
  os: "Mac OS",
};

const dubLink = {
  id: "1",
  domain: "dub.link",
  key: "uxUrVCz",
  shortLink: "https://dub.co/uxUrVCz",
  url: "https://dub.co/",
};

const githubLink = {
  id: "3",
  domain: "git.new",
  key: "9XyzIho",
  shortLink: "https://git.new/9XyzIho",
  url: "https://github.com/dubinc/dub",
};

const steven = {
  name: "Steven",
  email: "",
  avatar: "https://avatar.vercel.sh/s.png?text=S",
};

const tim = {
  name: "Tim",
  email: "",
  avatar: "https://avatar.vercel.sh/t.png?text=T",
};

const kiran = {
  name: "Kiran",
  email: "",
  avatar: "https://avatar.vercel.sh/k.png?text=K",
};

export const exampleData = {
  clicks: [
    {
      event: "click",
      timestamp: new Date().toISOString(),
      click: {
        id: "1",
        country: "US",
        city: "San Francisco",
        region: "US-CA",
        continent: "NA",
        ...common,
      },
      link: dubLink,
    },
    {
      event: "click",
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      click: {
        id: "2",
        country: "US",
        city: "New York",
        region: "US-NY",
        continent: "NA",
        ...common,
      },
      link: dubLink,
    },
    {
      event: "click",
      timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      click: {
        id: "3",
        country: "US",
        city: "Pittsburgh",
        region: "US-PA",
        continent: "NA",
        ...common,
      },
      link: githubLink,
    },
  ],
  leads: [
    {
      event: "lead",
      timestamp: new Date().toISOString(),
      eventId: "YbL8RwLTRRCxQz5H",
      eventName: "Sign up",
      click: {
        id: "1",
        country: "US",
        city: "San Francisco",
        region: "US-CA",
        continent: "NA",
        ...common,
      },
      link: dubLink,
      customer: steven,
    },
    {
      event: "lead",
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      eventId: "YbL8RwLTRRCxQz5H",
      eventName: "Sign up",
      click: {
        id: "1",
        country: "US",
        city: "San Francisco",
        region: "US-CA",
        continent: "NA",
        ...common,
      },
      link: dubLink,
      customer: kiran,
    },
    {
      event: "lead",
      timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      eventId: "YbL8RwLTRRCxQz5H",
      eventName: "Sign up",
      click: {
        id: "3",
        country: "US",
        city: "Pittsburgh",
        region: "US-PA",
        continent: "NA",
        ...common,
      },
      link: githubLink,
      customer: tim,
    },
  ],
  sales: [
    {
      event: "sale",
      timestamp: new Date().toISOString(),
      eventId: "Nffk2cwShKu5lQ7E",
      eventName: "Purchase",
      sale: {
        amount: 900,
        paymentProcessor: "stripe",
        invoiceId: "123456",
      },
      click: {
        id: "1",
        country: "US",
        city: "San Francisco",
        region: "US-CA",
        continent: "NA",
        ...common,
      },
      link: dubLink,
      customer: steven,
    },
    {
      event: "sale",
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      eventId: "Nffk2cwShKu5lQ7E",
      eventName: "Purchase",
      sale: {
        amount: 700,
        paymentProcessor: "stripe",
        invoiceId: "123456",
      },
      click: {
        id: "2",
        country: "US",
        city: "Pittsburgh",
        region: "US-PA",
        continent: "NA",
        ...common,
      },
      link: dubLink,
      customer: tim,
    },
    {
      event: "sale",
      timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      eventId: "Nffk2cwShKu5lQ7E",
      eventName: "Purchase",
      sale: {
        amount: 1000,
        paymentProcessor: "stripe",
        invoiceId: "123456",
      },
      click: {
        id: "3",
        country: "IN",
        city: "Kerala",
        region: "IN-KL",
        continent: "AS",
        ...common,
      },
      link: dubLink,
      customer: kiran,
    },
  ],
};
