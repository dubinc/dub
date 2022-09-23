<a href="https://dub.sh">
  <img alt="Dub – an open-source link shortener SaaS with built-in analytics + free custom domains." src="/public/static/thumbnail.png">
  <h1 align="center">Dub</h1>
</a>

<p align="center">
  An open-source link shortener SaaS with built-in analytics + free custom domains.
</p>

<p align="center">
  <a href="#introduction"><strong>Introduction</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#implementation"><strong>Implementation</strong></a> ·
  <a href="#contributing"><strong>Contributing</strong></a>
</p>
<br/>

## Introduction

Dub is an open-source link shortener with built-in analytics + free custom domains. Built with [Vercel Edge Functions](http://vercel.com/edge) and [Upstash Redis](https://docs.upstash.com/redis).

Here are some of the features that Dub provides out-of-the-box:

### Built-in Analytics

Dub provides a powerful analytics dashboard for your links, including geolocation, device, and browser information.

<img alt="Analytics Dashboard" src="/public/static/landing/analytics.png" height="500">

### Custom domains

You can easily configure custom domains on Dub – just add an A/CNAME record to your DNS provider and you're good to go. This is built on the [Vercel Domains API](https://domains-api.vercel.app/).

<img alt="Analytics Dashboard" src="/public/static/landing/domains.png" height="400">

## Deploy Your Own

You can deploy your own hosted version of Dub for greater privacy & control. Just click the link below to deploy a ready-to-go version of Dub to Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsteven-tey%2Fdub&demo-title=Dub%20-%20Open-Source%20Link%20Shortener&demo-description=An%20open-source%20link%20shortener%20SaaS%20built%20with%20Vercel%20Edge%20Functions%20and%20Upstash.&project-name=Dub&repository-name=dub&demo-url=https%3A%2F%2Fdub.sh&demo-image=https%3A%2F%2Fdub.sh%2Fstatic%2Fthumbnail.png&integration-ids=oac_V3R1GIpkoJorr6fqyiwdhl17&env=EMAIL_SERVER,EMAIL_FROM,NEXTAUTH_SECRET,VERCEL_PROJECT_ID,VERCEL_TEAM_ID,AUTH_BEARER_TOKEN,DATABASE_URL&envDescription=Follow%20the%20instructions%20here%20to%20set%20up%20the%20required%20env%20vars%3A&envLink=https%3A%2F%2Fgithub.com%2Fsteven-tey%2Fdub%2Fblob%2Fmain%2F.env.example)

## Tech Stack

- [Next.js](https://nextjs.org/) – framework
- [Typescript](https://www.typescriptlang.org/) – language
- [Tailwind](https://tailwindcss.com/) – CSS
- [Upstash](https://upstash.com/) – database
- [NextAuth.js](https://next-auth.js.org/) – auth
- [Vercel](https://vercel.com/) – hosting
- [Stripe](https://stripe.com/) – payments

## Implementation

Dub is built as a standard Next.js application with [Middleware](https://nextjs.org/docs/advanced-features/middleware) to handle multi-tenancy, inspired by [the Vercel Platforms Starter Kit](https://github.com/vercel/platforms).

[Redis](https://redis.io/) is used as the database for storing links and analytics data, which works well for key-value data types. Redis also has the Sorted Set data type, which is perfect for storing & retrieving time-series analytics data. Here's the full schema:

- `{hostname}:links` – hashmap of all links for a given hostname (e.g. `dub.sh:links`)
- `{hostname}:links:timestamps` – sorted set of all link timestamps for a given hostname (e.g. `dub.sh:links:timestamps`)
- `{hostname}:clicks:{linkId}` – sorted set of all clicks for a given link (e.g. `dub.sh:clicks:github`)
- `{hostname}:root:clicks` – sorted set of all root link clicks for a given hostname (e.g. `dub.sh:root:clicks`)

## Contributing

- [Open an issue](https://github.com/steven-tey/dub/issues) if you believe you've encountered a bug.
- Make a [pull request](https://github.com/steven-tey/dub/pull) to add new features/make quality-of-life improvements/fix bugs.

## Author

- Steven Tey ([@steventey](https://twitter.com/steventey))

## License

Inspired by [Plausible](https://plausible.io/), Dub is open-source under the GNU Affero General Public License Version 3 (AGPLv3) or any later version. You can [find it here](https://github.com/steven-tey/dub/blob/main/LICENSE.md).
