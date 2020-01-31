# Terraform 0.12 Upgrade

While we are in the process of upgrading terraform configurations from 0.11 to 0.12, it would be helpful to have both available. I recommend the following install process for terraform 0.12.

## Determine Executable Location

Enter the following command to find your terraform executable

```sh
$ which terraform
/usr/local/bin/terraform
```

Future commands will assume your terraform version is located in `/usr/local/bin` as well. If yours is in another directory, modify your commands appropriately.

## Rename Current Version

Rename the current terraform version to ensure it is still available

```sh
$ mv /usr/local/bin/terraform /usr/local/bin/terraform-0.11
```

## Download Terraform 0.12

Go to [the Terraform Downloads Page](https://www.terraform.io/downloads.html) and download the latest version 0.12 release. Then unzip the zip file you downloaded.  The terraform 0.12 executable will most likely be extracted to `/Users/$USER/Downloads/terraform`

## Move Terraform 0.12 to the installed bin directory

```sh
mv /Users/$USER/Downloads/terraform /usr/local/bin/
```

## Check your versions

Ensure that the versions for `terraform` and `terraform-0.11` are what you expect.

```sh
$ terraform-0.11 version
Terraform v0.11.14
+ provider.aws v2.13.0
+ provider.local v1.2.2
+ provider.template v2.1.2

Your version of Terraform is out of date! The latest version
is 0.12.3. You can update by downloading from www.terraform.io/downloads.html

$ terraform version
Terraform v0.12.3
+ provider.aws v2.13.0
+ provider.local v1.2.2
+ provider.template v2.1.2
```

## Upgrade Your Plugins

If you've already used Terraform on earlier versions, you may have stale versions
of the underlying plugins which connect back to AWS, Azure, etc.  You'll get an
error that looks like:

```sh
$ terraform plan

Error: Failed to instantiate provider "aws" to obtain schema: Incompatible API version with plugin. Plugin version: 4, Client versions: [5]
```

Just run the command below and you'll be good to go.

```
$ terraform init -upgrade
```
