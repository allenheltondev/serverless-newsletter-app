# Serverless Newsletter App

Tired of looking for newsletter apps that don't do what you want or cost too much money? 

Host it yourself with the serverless newsletter app! This app uses SendGrid as the engine to manage and publish emails on your behalf. 

For a full summary on the solution, please [check out the blog post](https://readysetcloud.io/blog/allen.helton/how-i-built-an-open-source-newsletter-platform).

## Prerequisites

For this newsletter app to work as written, there are a few prereqs that must be met in your setup.

* Your newsletters must be written in [markdown](https://en.wikipedia.org/wiki/Markdown).
* Newsletters are checked into a repository in GitHub
* You have an application in [AWS Amplify](https://aws.amazon.com/amplify/) that has a runnable CI pipeline
* Newsletters have front matter in the format outlined in the [Newsletter Metadata](#newsletter-metadata)

## How It Works

![](https://readysetcloud.s3.amazonaws.com/newsletter_platform_1.jfif)

In an ideal workflow, the business process is as follows:

1. Write your newsletter in markdown in your GitHub repo in a designated newsletter folder
2. Commit and push the newsletter to your repo with the phrase *[newsletter]* at the beginning of your commit message
3. AWS Amplify autobuild will run and complete successfully
4. On success, a Lambda function runs that queries your GitHub account and looks for new files in your newsletter folder in the commit that contained *[newsletter]* in the message
5. The Lambda function triggers a Step Function workflow that will parse the content of your newsletter and pass it along to a dynamic template in SendGrid
6. The workflow sends you an email with the direct link to SendGrid for you to review and schedule
7. Your readers get your newsletter and are happy!
8. After several days, you receive another email with the stats from your newsletter (delivers, bounces, opens, and link clicks)

## Deployment

The solution is built using AWS SAM. To deploy the resources into the cloud you must install the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

Once installed, run the following commands in the root folder of the solution.

```bash
sam build --parallel
sam deploy --guided
```

This will walk you through deployment, prompting you for all the parameters necessary for proper use. Below are the parameters you must fill out on deploy.

|Parameter|Description|Required|
|---------|-----------|--------|
|TableName|Name of the DynamoDB table to create|No|
|GSI1|Name of the GSI on the DDB table|No|
|GitHubPAT|Personal Access Token to load newsletter content from your repository|Yes|
|GitHubOwner|The GitHub user name that owns the repository for your content|Yes|
|GitHubRepo|The repository name that contains your content|Yes|
|SendgridApiKey|The API key for SendGrid that will create and manage newsletter content and send emails for you (Might require full access)|Yes|
|DistributionListId|Identifier of the contact list for your newsletter (See [SendGrid Usage](#sendgrid-usage))|Yes|
|SendgridSenderId|Identifier of the email address to send your content|Yes|
|SendgridFromEmail|Plain text email address of the SendgridSenderId|Yes|
|NewsletterTemplateId|Identifier of the dynamic template to merge your data with|Yes|
|NewsletterTemplateVersionId|Identifier of the specific version of the dynamic template above|Yes|
|CorsDomain|The base url of your newsletter website. Used for restricting access to subscriber registration API|Yes|
|AdminEmail|Email address to send reports to. This is usually your email address|Yes|
|AmplifyProjectId|Identifier of the Amplify project that builds your newsletter|Yes|
|NewsletterName|Friendly name of your newsletter used in sending sponsor emails|Yes|

## SendGrid Usage

Managing of emails and tracking delivery, bounces, opens, and clicks is hard work. SendGrid offers all this functionality out-of-the-box with a generous free tier. With the SendGrid free plan, you can manage up to 2,000 contacts and send up to 6,000 newsletters a month. This means if you had 2,000 contacts, you could send three newsletters out in a given month to reach your 6,000 deliveries.

In addition to sending your newsletter, this application uses SendGrid to talk to **you**. If something goes wrong in any of the back-end automated processes, you will receive an email with a link to the execution for troubleshooting. 

The application sends emails for the following scenarios:

* Successful staging of your newsletter (with link to review)
* End of week stats on how your newsletter performed
* Reminders to your sponsors to submit their ad copy to you
* Back-end process failure notifications

### Configuration Steps

There are several steps in SendGrid you must take in order to get the solution working properly.

* [Create an API key](https://docs.sendgrid.com/ui/account-and-settings/api-keys)
* [Create a sender](https://docs.sendgrid.com/ui/sending-email/senders)
* [Create a contact list](https://docs.sendgrid.com/ui/managing-contacts/segmenting-your-contacts#creating-a-segment-with-marketing-campaigns)

Once you create the items above, you must get the id (usually from the URL) and use them as deployment parameters of the stack contained in this repository.

## Adding Subscribers

SendGrid has a [fully managed signup form](https://docs.sendgrid.com/ui/managing-contacts/create-and-manage-contacts#create-a-signup-form) if you wish to use it to add subscribers to your newsletter. You can walk through the wizard and get it going in a few minutes. You can embed an iframe in your site and be on your way. 

But if you do not like the formatting of the form, this solution provides an [open API endpoint](/openapi.yaml) that enables you to build your own form.

## Newsletter Metadata

To save metadata about your newsletter, you can add [front matter](https://gohugo.io/content-management/front-matter/) at the beginning of your file. This app requires a specific set of front matter to exist in order to function appropriately.

**Example**
```yaml
---
title: My First Issue
description: This description will show up as the preview in email
date: 2023-01-01
sponsor: Ready, Set, Cloud!
sponsor_description: Ready, Set, Cloud is a blog, newsletter, and podcast around all things related to the cloud, serverless development, and APIs. 
slug: /1
---
```

|Field|Description|Required?|
|-----|-----------|---------|
|title|Title of the newsletter issue |Yes|
|description| Brief summary of the newsletter. This shows up in the email preview delivered to readers|Yes|
|date|Publish date in YYYY-MM-DD format|Yes|
|sponsor|The name of the sponsor of the issue. See [Sponsors](#sponsors) for more details|No|
|sponsor_description|The ad copy to run for the sponsor in this issue|No|
|slug|Issue number with a leading forward slash. Must be in this format!|Yes|

## Sponsors

It is common for a newsletter to have a sponsor for a particular issue. This application handles sponsored ads and reminders to the contact every week.

This solution **automatically sends a reminder to the sponsor contact on Wednesdays.** It uses a [Step Function workflow](/workflows/sponsor-ad-copy-reminder.asl.json) to load the next sponsor and send the contact an email reminding them about the upcoming issue. If you wish to change the date the reminder is sent out, you can update the trigger on the `SendAdCopyReminderStateMachine` in the [template file](/template.yaml).

Enabling sponsor features requires you to have two data files structured in a specific format. The two files must live in the S3 bucket deployed in this solution:

* `sponsors/sponsor-calendar.json`
* `sponsors/sponsors.json`

### sponsor-calendar.json

This file contains the issue dates that have a sponsor. The file must be in the following format.

```json
[
  {
    "date": "2023-01-01",
    "sponsor": "Ready, Set, Cloud!"
  },
  {
    "date": "2023-01-08",
    "sponsor": "Ready, Set, Cloud!"
  }
]
```

The file is a simple json array that contains objects of dates and sponsor names. If a particular issue does not have a sponsor, you do not need to include it. 

The name of the sponsor must match the name of a sponsor in the `sponsors.json` file exactly.

### sponsors.json

This file contains information about the individual sponsors for your newsletter. Data must be in the following format:

```json
[
  {
    "name": "Ready, Set, Cloud!",
    "homepage": "https://www.readysetcloud.io",
    "logo_url": "https://www.readysetcloud.io/images/logo.png",
    "description": "This is the fallback description for the sponsor. If a sponsor wants to run the same ad week over week, you would add it here",
    "short_description": "This is a brief summary about the sponsor that does not change. Should be 10-20 words.",
    "contact": {
      "name": "Allen",
      "email": "allen@readysetcloud.io"
    }
  }
]
```

Once again, this file is a json array that contains information about the sponsor. These details will be embedded in your newsletter automatically based on the value in the `sponsor` field in your newsletter front matter.


### Sponsor ad placement

To inject a sponsored ad into your content, you must add the following short code in the markdown of your newsletter.

```yaml
{{< sponsor >}}
```

This short code will be processed and embed the `sponsor_description` from the front matter into your content. If there is no `sponsor_description` in your front matter, then it will default to the `description` property from the *sponsors.json* file.
