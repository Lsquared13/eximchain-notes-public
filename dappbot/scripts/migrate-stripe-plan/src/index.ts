#!/usr/bin/env node

import yargs, { Arguments } from 'yargs';
import path from 'path';
import fs from 'fs';
import parse from 'csv-parser';
import StripeClient from './stripe';

interface Customer {
  id: string
  Email: string
}

interface MigrateArgs {
  exportPath: string
  stripeKey: string
}
type Args = Arguments<MigrateArgs>

export function cleanExit(message: string) {
  console.log(`\n${message}\n`)
  process.exit(1);
}

yargs
  .command(
    'migrate <exportPath> <stripeKey>',
    'Migrate users in export from deleted "standard" plan to new "standard" plan.',
    function (yargs) {
      yargs
        .positional('exportPath', {
          type: 'string',
          describe: 'Path from cwd to a customers.csv export from Stripe.'
        })
        .positional('stripeKey', {
          type: 'string',
          describe: 'Stripe API key.'
        })
    },
    function (argv:Args) {
      console.log(`Attempting to load from ${path.resolve(process.cwd(), argv.exportPath)}`)
      let customers: Customer[] = [];
      fs.createReadStream(path.resolve(process.cwd(), argv.exportPath))
        .pipe(parse())
        .on('data', (data) => customers.push(data))
        .on('end', async () => {
          console.log(`Found ${customers.length} customers in export`)
          const Stripe = StripeClient(argv.stripeKey);
          for (var customer of customers) {
            const customerId = customer.id;
            const [closedDraft, voidedInvoice] = await Stripe.closeInvoices(customerId);
            const migratedSub = await Stripe.migrateStandardSubscription(customerId);
            if (!migratedSub) return;
            console.log(`Sub status for ${customer.Email} after migration & void: ${migratedSub.status}`)
          }
          
        });
    }
  )
  .help('help')
  .alias('help', 'h')
  .argv