import argparse
import boto3

NUM_DAPPS_ATTR = 'custom:num_dapps'
STANDARD_LIMIT_ATTR = 'custom:standard_limit'
PROFESSIONAL_LIMIT_ATTR = 'custom:professional_limit'
ENTERPRISE_LIMIT_ATTR = 'custom:enterprise_limit'
PAYMENT_PROVIDER_ATTR = 'custom:payment_provider'
PAYMENT_STATUS_ATTR = 'custom:payment_status'
EMAIL_ATTR = 'email'
EMAIL_VERIFIED_ATTR = 'email_verified'

cognito = boto3.client('cognito-idp')

def parse_args():
    parser = argparse.ArgumentParser(description='Manage Cognito Users for auth testing')
    parser.add_argument('--user-pool-id', dest='user_pool_id', required=True)
    return parser.parse_args()

def run(args):
    response = cognito.list_users(UserPoolId=args.user_pool_id, AttributesToGet=['email'])
    emails = [user['Attributes'][0]['Value'] for user in response['Users']]

    print('')
    print(emails)
    print('')
    for email in emails:
        print(email)

# Executes the command specified in the provided argparse namespace
def execute_command(args):
    run(args)

args = parse_args()
execute_command(args)