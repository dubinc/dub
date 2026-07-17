import type Stripe from "stripe";
import { syncCustomer } from "./utils/sync-customer";

// Handle event "customer.updated"
export async function customerUpdated(event: Stripe.CustomerUpdatedEvent) {
  return await syncCustomer(event);
}
