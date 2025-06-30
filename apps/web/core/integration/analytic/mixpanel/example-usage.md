# Mixpanel Usage Examples

## Environment Variables

Make sure to set the following environment variables:

```bash
# For client-side (browser)
NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN=your_mixpanel_token

# For server-side
MIXPANEL_PROJECT_TOKEN=your_mixpanel_token
```

## Client-side Usage (Browser)

```typescript
import { mixpanelClient } from 'core/integration/analytic/mixpanel';
import { trackClientEvents } from 'core/integration/analytic/analytic.service';
import { EAnalyticEvents } from 'core/integration/analytic/interfaces/analytic.interface';

// Initialize and identify user
mixpanelClient.identify('user-123');

// Set user properties
mixpanelClient.peopleSet({
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium'
});

// Set properties only once (won't overwrite existing)
mixpanelClient.peopleSetOnce({
  first_login_date: new Date().toISOString(),
  signup_source: 'website'
});

// Track events
mixpanelClient.track({
  eventName: 'Page Viewed',
  props: {
    page: '/dashboard',
    source: 'direct'
  }
});

// Using the analytics service wrapper (recommended)
trackClientEvents({
  event: EAnalyticEvents.PURCHASE_SUCCESS,
  user: userObject,
  params: {
    amount: 29.99,
    currency: 'USD',
    plan: 'premium'
  }
});
```

## Server-side Usage (API Routes, Server Actions)

```typescript
import { mixpanelServer } from 'core/integration/analytic/mixpanel';
import { 
  trackServerEvents, 
  setPeopleAnalyticServer,
  setPeopleAnalyticOnceServer,
  identifyUserServer,
  incrementPeoplePropertyServer,
  addToListPropertyServer,
  createUserAliasServer
} from 'core/integration/analytic/analytic-server.service';
import { EAnalyticEvents } from 'core/integration/analytic/interfaces/analytic.interface';

// Track events on server
await trackServerEvents({
  event: EAnalyticEvents.PURCHASE_SUCCESS,
  distinct_id: 'user-123',
  params: {
    amount: 29.99,
    currency: 'USD',
    plan: 'premium',
    payment_method: 'stripe'
  }
});

// Set user properties
await setPeopleAnalyticServer({
  distinct_id: 'user-123',
  props: {
    email: 'user@example.com',
    subscription_status: 'active',
    last_payment_date: new Date().toISOString()
  }
});

// Set properties only once
await setPeopleAnalyticOnceServer({
  distinct_id: 'user-123',
  props: {
    first_purchase_date: new Date().toISOString(),
    signup_source: 'api'
  }
});

// Identify user with properties
await identifyUserServer({
  distinct_id: 'user-123',
  props: {
    email: 'user@example.com',
    name: 'John Doe'
  }
});

// Increment numeric properties
await incrementPeoplePropertyServer('user-123', 'total_purchases', 1);
await incrementPeoplePropertyServer('user-123', 'total_spent', 29.99);

// Add to list properties
await addToListPropertyServer('user-123', 'purchased_products', ['premium_plan']);
await addToListPropertyServer('user-123', 'payment_methods', ['stripe']);

// Create user alias (useful for anonymous to identified user mapping)
await createUserAliasServer('user-123', 'anonymous-id-456');

// Direct usage of mixpanelServer
await mixpanelServer.track({
  eventName: 'Custom Server Event',
  distinct_id: 'user-123',
  props: {
    custom_property: 'custom_value',
    timestamp: new Date().toISOString()
  }
});
```

## API Route Example

```typescript
// app/api/track-purchase/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { trackServerEvents } from 'core/integration/analytic/analytic-server.service';
import { EAnalyticEvents } from 'core/integration/analytic/interfaces/analytic.interface';

export async function POST(req: NextRequest) {
  try {
    const { userId, amount, currency, planCode } = await req.json();

    // Track the purchase event
    await trackServerEvents({
      event: EAnalyticEvents.PURCHASE_SUCCESS,
      distinct_id: userId,
      params: {
        amount,
        currency,
        plan_code: planCode,
        timestamp: new Date().toISOString(),
        source: 'api'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track purchase:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}
```

## Best Practices

1. **Error Handling**: All server functions are designed to not throw errors to avoid breaking your main application flow. They log errors instead.

2. **Environment**: Always set appropriate environment variables for both client and server.

3. **User Identification**: Use consistent `distinct_id` across client and server to maintain user identity.

4. **Async Operations**: Server-side functions are async and should be awaited.

5. **Properties**: Be consistent with property names and types across client and server tracking.

6. **Privacy**: Be mindful of what data you're sending to Mixpanel, especially PII. 