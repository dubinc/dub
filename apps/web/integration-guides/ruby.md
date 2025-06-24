## Installation

```bash
gem install dub
```

## Basic Usage

Here's how you can use the Dub Ruby SDK:

```ruby
require 'dub'

# Initialize the Dub SDK with your API key
dub = ::OpenApiSDK::Dub.new
dub.config_security(
  ::OpenApiSDK::Shared::Security.new(
    token: ENV['DUB_API_KEY'], # optional, defaults to DUB_API_KEY
  )
)
```

Additional resources:

1. [NPM Package](https://d.to/ruby/sdk)
2. [SDK Reference](https://github.com/dubinc/dub-ruby/blob/main/README.md)
3. [Examples](https://github.com/dubinc/examples/tree/main/ruby)
