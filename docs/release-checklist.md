# Public release checklist

Complete these steps in order. Preparing the repository does not change its GitHub visibility or publish the community post.

## Repository

- [x] MIT license present.
- [x] README documents hosted, local, and self-hosted setup.
- [x] Privacy, security, contribution, and conduct policies present.
- [x] CI and dependency-update configuration present.
- [x] Internal scratch planning files removed from the release tree.
- [x] Current tree and Git history scanned for committed credentials.
- [ ] Decide whether to publish the existing development history or create a clean public release history. Deleted planning files remain visible in existing Git history even though no credential was found in them.
- [ ] Commit and push the release-preparation changes while the repository is still private.

## Hosted service

- [x] Health endpoint returns HTTP 200.
- [x] protected-resource metadata advertises the correct Auth0 issuer and `bunpro.read` scope.
- [x] unauthenticated MCP requests receive an OAuth challenge.
- [ ] Verify the post-deployment tool list includes `disconnect_bunpro_account`.
- [ ] Link and disconnect a disposable Bunpro test account; confirm its database row is removed.
- [ ] Confirm Auth0 sign-up, consent, and Dynamic Client Registration work for a user who is not the tenant administrator.
- [ ] Enable GitHub private vulnerability reporting.

## Publication

- [ ] Change the GitHub repository visibility from private to public.
- [ ] Clone the public repository without GitHub credentials and complete the local quick start.
- [ ] Recheck every link in the README and community post.
- [ ] Post [the Bunpro community draft](community-post.md).

Do not publish the community post while the GitHub source link is private or before the updated hosted deployment has been verified.
