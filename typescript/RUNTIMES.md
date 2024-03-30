# Supported JavaScript runtimes

This SDK is intended to be used in JavaScript runtimes that support the following features:

* [Web Fetch API][web-fetch]
* [Web Streams API](web-streams) and in particular `ReadableStream`
* [Async iterables][async-iter] using `Symbol.asyncIterator`

[web-fetch]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
[web-streams]: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
[async-iter]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_async_iterator_and_async_iterable_protocols

Runtime environments that are explicitly supported are:

- Evergreen browsers which include: Chrome, Safari, Edge, Firefox
- Node.js active and maintenance LTS releases
  - Currently, this is v18 and v20
- Bun v1 and above
- Deno v1.39
  - Note that Deno does not currently have native support for streaming file uploads backed by the filesystem ([issue link][deno-file-streaming])

[deno-file-streaming]: https://github.com/denoland/deno/issues/11018
