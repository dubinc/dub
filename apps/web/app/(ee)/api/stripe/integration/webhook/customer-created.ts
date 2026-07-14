import type Stripe from "stripe";
import { syncCustomer } from "./utils/sync-customer";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.CustomerCreatedEvent) {
  return await syncCustomer(event);
}
