# Single URL switch to dedicated domain with GitHub Pages redirect

We plan to migrate hosting from GitHub Pages to dedicated infrastructure (such as AWS S3 and Lambda) in the long term, but want subscribers to experience at most one URL migration. We will switch to a dedicated domain we own so future infrastructure migrations only require updating DNS records without breaking user subscriptions.

## Consequences

- Calendar clients (Google Calendar, Apple Calendar, Outlook) follow HTTP redirects during sync but do not permanently update their stored subscription URL. Existing `zlypher.github.io/lol-events/...` subscribers therefore depend on GitHub's automatic 301 redirect to the custom domain indefinitely.
- GitHub Pages must remain enabled with the custom domain configured in this repository even after calendar generation and hosting migrate to AWS.
- Outlook desktop is known to handle cross-domain HTTP 301 redirects unreliably; some desktop users may need to re-subscribe manually after the domain migration.
