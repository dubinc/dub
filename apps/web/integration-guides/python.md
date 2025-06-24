## Installation

```bash
pip install dub
```

## Basic Usage

Here's how you can use the Dub Python SDK:

```python
import os
import dub
from dub.models import operations

# Initialize the Dub SDK with your API key
d = dub.Dub(
  token=os.environ['DUB_API_KEY'], # optional, defaults to DUB_API_KEY
)
```

Additional resources:

1. [NPM Package](https://d.to/python/sdk)
2. [SDK Reference](https://github.com/dubinc/dub-python/blob/main/README.md)
3. [Examples](https://github.com/dubinc/examples/tree/main/python)
