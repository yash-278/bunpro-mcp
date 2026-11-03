import { defineRailway, github, preserve, project, service } from "railway/iac";

// The hosted deployment at bunpro.yashkadam.com. Railway doesn't read this file
// during deploys: preview with `railway config plan` and apply with
// `railway config apply`. Railway builds the root Dockerfile and restarts on
// failure up to 10 times by default, so neither is set here.
export default defineRailway(() => {
  const bunproMcp = service("bunpro-mcp", {
    source: github("yash-278/bunpro-mcp", { checkSuites: false }),
    deploy: {
      startCommand: "node dist/index.js",
      healthcheckPath: "/healthz",
      healthcheckTimeout: 100,
      sleepApplication: true,
    },
    replicas: { "asia-southeast1-eqsg3a": 1 },
    domains: ["bunpro.yashkadam.com"],
    env: { NODE_ENV: preserve(), PUBLIC_BASE_URL: preserve(), TRANSPORT: preserve() },
  });

  return project("bunpro-mcp", {
    resources: [bunproMcp],
  });
});
