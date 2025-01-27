import type Stripe from "stripe";
import { createNewCustomer } from "./utils";

// Handle event "customer.created"
export async function customerCreated(event: Stripe.Event) {
  return await createNewCustomer(event);
}
