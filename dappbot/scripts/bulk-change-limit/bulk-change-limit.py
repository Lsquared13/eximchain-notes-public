import argparse
import boto3
import time

# CONSTANTS
NUM_DAPPS_ATTR = 'custom:num_dapps'
STANDARD_LIMIT_ATTR = 'custom:standard_limit'
PROFESSIONAL_LIMIT_ATTR = 'custom:professional_limit'
ENTERPRISE_LIMIT_ATTR = 'custom:enterprise_limit'
PAYMENT_PROVIDER_ATTR = 'custom:payment_provider'
PAYMENT_STATUS_ATTR = 'custom:payment_status'
EMAIL_ATTR = 'email'
EMAIL_VERIFIED_ATTR = 'email_verified'

# HARD CODED ARGS
# These Emails will be moved to the new limit
EMAILS = ['karnachowhan203@gmail.com', 'melekblockchain+1@gmail.com', 'gambhirkhun66@gmail.com',
'harishv8152@gmail.com', 'sateeshkumar94414@gmail.com', 'aj.23291391@gmail.come', 'bhukyasumanraja143@gmail.com',
'tony.li@vechain.com', '727092844@qq.com', 'balamanusha26@gmail.com', 'john@eximchain.com', 'nguyenvana9696@gmail.com',
'vjm_tamil@yahoo.com', 'brasaelizabeth+cli@gmail.com', 'douglas@eximchain.com', 'mdrahmar6677@gmail.com',
'dulalsarkar91221.ds@gmail.com', 'spgkrishna9@gmail.com', 'juan+sep3@eximchain.com', 'piedad@blueinstinct.com',
'skar724@gmail.com', 'williamlopezc@gmail.com', 'pengaixin0208@163.com', 'izharali9110493280@gmail.com',
'Zedhu77.dev@gmail.com', 'Lavanya27@gmail.com', 'nileshchaudhari007@gmail.com', 'hopeliu21@gmail.com',
'spambox888@outlook.com', 'dangbh271@gmail.com', 'tradenext96@gmail.com', 'venkatsainath2000@gmail.com',
'santhossanthosh486@gmail.com', 'tkkt9@mail-lab.net', 'wwwrahulkashyap9773866861@gmail.com', 'andrew@eximchain.com',
'johanes@singasoft.com', 'manojdhara123456@gmail.com', 'satoshiyumyum@gmail.com', 'ajaykumargunja0185@gmail.com',
'dragos.rz@gmail.com', 'oktay@creosafe.com', 'janice.hua@vechain.org', 'rajashekarrajashrkar9148@gimal.com',
'shekarb06@gmail.com', 'aj.23291391@gmail.com', 'nagaprasad9000@gmail.com', 'Badboyammu1998@gmail.com',
'j.osullivan42+cli@gmail.com', 'bhupendrrathore576@gmail.com', 'p.roslaniec@gmail.com', 'krishnabaroi42@gmail.com',
'rohini.saffroncareers@gmail.com', 'edstrom6@gmail.com', 'dileepsdileeps791@gmail.com', 'Jaipalreddyb00@gmail.com',
'Msmahimsmahi@gemil.com', 'andrey.hedg@gmail.com', 'huertasjuan23@gmail.com', 'rukminianilrukminianil15917@gmail.com']
# This is the limit that will be set
LIMIT_TO_SET = STANDARD_LIMIT_ATTR
# This is the new value the limit will be set to
NEW_LIMIT_VALUE = '5'
# Wait this many seconds between requests to avoid being throttled
SLEEP_SECONDS = 2

ATTRIBUTE = {'Name': LIMIT_TO_SET, 'Value': NEW_LIMIT_VALUE}

cognito = boto3.client('cognito-idp')

def parse_args():
    parser = argparse.ArgumentParser(description='Manage Cognito Users for auth testing')
    parser.add_argument('--user-pool-id', dest='user_pool_id', required=True)
    return parser.parse_args()

def run(args):
    for email in EMAILS:
            cognito.admin_update_user_attributes(UserPoolId=args.user_pool_id, Username=email, UserAttributes=[ATTRIBUTE])
            print(f'Changed limit for {email}')
            time.sleep(SLEEP_SECONDS)

# Executes the command specified in the provided argparse namespace
def execute_command(args):
    run(args)

args = parse_args()
execute_command(args)