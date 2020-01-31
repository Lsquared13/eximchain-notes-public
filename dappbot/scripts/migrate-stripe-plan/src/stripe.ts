import Stripe from 'stripe';
import { freeTierStripePlan } from '@eximchain/dappbot-types/spec/methods/payment';


export default function (stripeKey: string) {
    const stripe = new Stripe(stripeKey);
    return {
        async getCustomer(email: string) {
            const matchingList = await stripe.customers.list({ email })

            if (matchingList.data.length === 0) {
                return null;
            } else if (matchingList.data.length > 1) {
                throw new Error(`Two customers listed for ${email}, must be an error!`);
            }

            // Performing additional retrieve allows us to expand
            // the source_data on the customer object.
            const customerId = matchingList.data[0].id;
            return await stripe.customers.retrieve(customerId, {
                expand: ['default_source']
            })
        },

        async getCustomerById(customerId: string) {
            return await stripe.customers.retrieve(customerId, {
                expand: ['default_source']
            })
        },

        async getSubscriptionByCustomerId(stripeCustomerId: string) {
            const matchingList = await stripe.subscriptions.list({
                customer: stripeCustomerId
            });

            if (matchingList.data.length === 0) {
                return null;
            } else if (matchingList.data.length > 1) {
                throw new Error(`Multiple subscriptions listed for Stripe Customer ${stripeCustomerId}, must be an error!.`);
            }

            return matchingList.data[0];
        },

        /**
         * Given a customerId, returns their unpaid invoice.
         * If they do not have an invoice which has been
         * attempted but not paid, it returns null.
         * 
         * @param customerId 
         */
        async getUnpaidInvoice(customerId: string) {
            const invoices = await stripe.invoices.list({
                customer: customerId
            });
            if (invoices.data.length === 0) {
                return null;
            }
            for (var invoice of invoices.data) {
                if (invoice.attempted && !invoice.paid) {
                    return invoice;
                }
            }
            return null;
        },

        async getDraftInvoice(customerId: string) {
            const invoices = await stripe.invoices.list({
                customer: customerId
            });
            if (invoices.data.length === 0) {
                return null;
            }
            for (var invoice of invoices.data) {
                if (invoice.status === 'draft') {
                    return invoice;
                }
            }
            return null;
        },

        async closeInvoices(customerId: string) {
            const draftInvoice = await this.getDraftInvoice(customerId);
            let closedDraft, voidedUnpaid;
            if (draftInvoice) {
                closedDraft = await stripe.invoices.finalizeInvoice(draftInvoice.id)
                // @ts-ignore Stripe types are missing this fxn
                closedDraft = await stripe.invoices.voidInvoice(draftInvoice.id);
            }
            const unpaidInvoice = await this.getUnpaidInvoice(customerId);
            if (unpaidInvoice && unpaidInvoice.status === 'open') {
                // @ts-ignore Stripe types are missing this fxn,
                // but it's there if you check the node_modules
                voidedUnpaid = await stripe.invoices.voidInvoice(unpaidInvoice.id);
            }
            return [closedDraft, voidedUnpaid]
        },

        /**
         * This function takes a customer ID, removes its current subscription
         * item, and adds a new one corresponding to the free tier's standard
         * capacity.  It rests on a few key simplifying assumptions which are
         * true today, but if used later, may need to be reconsidered:
         * 
         * 1. All users only have standard dapps, so all subs will have one
         *    item and it will correspond to the old standard pricing plan.
         * 
         * 2. We are migrating to a plan whose `id === 'standard'`.
         * 
         * @param email 
         * @param newPlans 
         */
        async migrateStandardSubscription(customerId: string) {
            const subscription = await this.getSubscriptionByCustomerId(customerId);
            if (!subscription) {
                throw new Error(`Unable to update subscription for customer ${customerId}, no subscription exist.`);
            }
            const currentItem = subscription.items.data.slice()[0];
            console.log('Got to sub migration')
            const updatedSub = await stripe.subscriptions.update(subscription.id, { 
                items : [
                    { id: currentItem.id, deleted: true },
                    { plan: 'standard', quantity: freeTierStripePlan().standard }
                ],
                billing_cycle_anchor: 'now',
                trial_end: 'now'
            })
            // const newInvoice = await stripe.invoices.create({ customer: customerId, auto_advance: true });
            // console.log('new invoice id: ',newInvoice.id);
            // const finalizedInvoice = await stripe.invoices.finalizeInvoice(newInvoice.id);
            // console.log(`finalized id ${finalizedInvoice.id} and status ${finalizedInvoice.status}`)
            // const nullPaidInvoice = await stripe.invoices.pay(finalizedInvoice.id);
            // const activeSub = await this.getSubscriptionByCustomerId(customerId);
            if (!updatedSub) throw new Error("We updated a sub but now it doesn't exist anymore?")
            return updatedSub;
        }
    }
}