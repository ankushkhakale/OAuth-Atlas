# Provider discovery metadata

`provider-discovery.json` contains factual provider names, public documentation URLs, and public website origins extracted from NangoHQ's provider directory. It contains no Nango runtime implementation, OAuth credentials, authentication templates, or prewritten guides. These hints only locate documentation; they are not evidence of OAuth support.

Source: https://github.com/NangoHQ/nango/blob/master/packages/providers/providers.yaml

Nango's source repository is source-available under Elastic License 2.0, not an OSI-approved open-source license. No Nango service or executable code is used by Atlas. Original source attribution and license are retained here for the public metadata reference. The authored Atlas code and its runtime dependencies are open-source; the metadata is third-party factual reference material.

Upstream license: https://github.com/NangoHQ/nango/blob/master/LICENSE

Refresh with `pnpm discovery:refresh`; the snapshot records the source hash and capture time. A known provider's discovery hints remain available if GitHub or public search is temporarily unavailable. New providers can still resolve through live registry/search or a supplied homepage.
