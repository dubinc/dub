## Installation

```bash
composer require dub/dub-php
```

## Basic Usage

Here's how you can use the Dub PHP SDK:

```php
<?php

declare(strict_types=1);

require 'vendor/autoload.php';

use Dub\Dub;
use Dub\Models\Operations;

// Initialize the Dub SDK with your API key
$dub = Dub::builder()
  ->setSecurity(getenv('DUB_API_KEY')) // optional, defaults to DUB_API_KEY
  ->build();
```

Additional resources:

1. [NPM Package](https://d.to/php/sdk)
2. [SDK Reference](https://github.com/dubinc/dub-php/blob/main/README.md)
3. [Examples](https://github.com/dubinc/examples/tree/main/php)
