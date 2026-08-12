# Private preview checklist

Keep the repository private and share the connection only inside the approved Bunpro community group.

## Repository

- [x] MIT license present.
- [x] README documents hosted, local, and self-hosted setup.
- [x] Privacy, security, contribution, and conduct policies present.
- [x] Current tree and Git history scanned for committed credentials.
- [x] Account API Token request contract captured in a confidential research note.
- [x] Confirm no active documentation instructs users to provide a Bunpro password, Auth0 login, database, or setup link.
- [x] Run the full verification suite after the direct-token cutover.

## Hosted service

- [ ] Remove obsolete Auth0, PostgreSQL, encryption-key, setup-token, username, and password variables from Railway.
- [ ] Redeploy the direct-token build.
- [ ] Confirm `GET /healthz` returns HTTP 200.
- [ ] Confirm a missing Bearer token receives HTTP 401 without leaking request data.
- [ ] Confirm one valid caller token reaches `get_connection_status` and is not persisted.
- [ ] Confirm one invalid token produces a sanitized Bunpro authentication error.

## Atlas acceptance

- [ ] Implement the date-bounded Study Day Summary using only whitelisted read routes.
- [ ] Compare at least one known Study Day with Bunpro.
- [ ] Simulate authentication, throttling, or route-drift failure and verify Atlas does not advance its Bunpro Watermark.

## Sharing boundary

- [ ] Keep the GitHub repository private.
- [ ] Recheck every link in the README and private community draft.
- [ ] Share [the draft](community-post.md) only in the approved private Bunpro community group.

Do not publish the temporary token mechanism in a public forum.
