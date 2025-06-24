## Installation

```bash
go get github.com/dubinc/dub-go
```

## Basic Usage

Here's how you can use the Dub Go SDK:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	dub "github.com/dubinc/dub-go"
)

func main() {
	// Initialize the Dub SDK with your API key
	d := dub.New(
		dub.WithSecurity(os.Getenv("DUB_API_KEY")), // optional, defaults to DUB_API_KEY
	)
}
```

Additional resources:

1. [NPM Package](https://d.to/go/sdk)
2. [SDK Reference](https://github.com/dubinc/dub-go/blob/main/README.md)
3. [Examples](https://github.com/dubinc/examples/tree/main/go)
