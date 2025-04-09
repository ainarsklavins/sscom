This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Setting Up Automated Monitoring (Cron Job)

This application includes an API endpoint (`/api/run-monitor`) designed to be triggered periodically by a scheduler (like Google Cloud Scheduler, Vercel Cron Jobs, EasyCron, or a standard system cron) to automatically scrape listings and send email summaries.

**Endpoint Details:**

*   **URL:** `{YOUR_DEPLOYED_APP_URL}/api/run-monitor` (Replace `{YOUR_DEPLOYED_APP_URL}` with the actual URL where your app is hosted, e.g., `https://your-app.vercel.app`)
*   **HTTP Method:** `GET`

**Security:**

The endpoint is secured using a secret Bearer token. To trigger it successfully, you must:

1.  **Set a `CRON_SECRET`:** Define a strong, random secret string for the `CRON_SECRET` variable in your environment variables (both locally in `.env.local` for testing and, more importantly, in your deployment environment - e.g., Vercel Environment Variables).
    ```.env.local
    # Example:
    CRON_SECRET='aVeryStrong_and_Random-Secret123!@#'
    ```
2.  **Send Authorization Header:** Your scheduler must send an `Authorization` header with the request, formatted as `Bearer {YOUR_CRON_SECRET}`.

**Example Configuration:**

*   **Using `curl` (for testing or simple system cron):**
    ```bash
    curl -H "Authorization: Bearer YOUR_CRON_SECRET" "{YOUR_DEPLOYED_APP_URL}/api/run-monitor"
    ```
*   **Using Google Cloud Scheduler:**
    *   **Target Type:** `HTTP`
    *   **URL:** `{YOUR_DEPLOYED_APP_URL}/api/run-monitor`
    *   **HTTP Method:** `GET`
    *   **Headers:** Add a header with Name = `Authorization` and Value = `Bearer YOUR_CRON_SECRET`
    *   **Frequency:** Define your schedule (e.g., `0 6 * * *` for 6:00 AM daily)
    *   **Timezone:** Set according to your requirement (e.g., `Europe/Riga`)
*   **Using Vercel Cron Jobs (in `vercel.json`):**
    ```json
    {
      "crons": [
        {
          "path": "/api/run-monitor",
          "schedule": "0 6 * * *", // 6:00 AM UTC daily - adjust as needed
          "headers": {
             "Authorization": "Bearer YOUR_CRON_SECRET" 
          }
        }
      ]
    }
    ```
    *(Note: Vercel Cron schedule is in UTC. You need to adjust the time accordingly. You also need to set `CRON_SECRET` as a Vercel Environment Variable.)*

**Important for Production:**

For the cron job to actually *send* emails (and not just generate previews), ensure the `SEND_EMAIL_MODE` environment variable is set to `send` in your deployment environment:

```
SEND_EMAIL_MODE='send'
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
