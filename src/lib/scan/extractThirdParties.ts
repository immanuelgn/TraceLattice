import { getDomain } from "tldts";
import { classifyDomain } from "./detectTrackers";
import type { ParsedHtml, ResourceFinding, ThirdPartyFinding } from "./types";

export function extractThirdParties(parsed: ParsedHtml, finalUrl: string) {
  const targetHostname = new URL(finalUrl).hostname;
  const targetRoot = getDomain(targetHostname, { allowPrivateDomains: true }) || targetHostname;
  const resources: ResourceFinding[] = parsed.resources.map((resource) => {
    const domain = new URL(resource.url).hostname.toLowerCase();
    const resourceRoot = getDomain(domain, { allowPrivateDomains: true }) || domain;
    return { ...resource, domain, thirdParty: resourceRoot !== targetRoot };
  });

  const grouped = new Map<string, ThirdPartyFinding>();
  for (const resource of resources.filter((item) => item.thirdParty)) {
    const current = grouped.get(resource.domain) || {
      domain: resource.domain,
      category: classifyDomain(resource.domain),
      resourceTypes: [],
      count: 0,
    };
    current.count += 1;
    if (!current.resourceTypes.includes(resource.type)) current.resourceTypes.push(resource.type);
    grouped.set(resource.domain, current);
  }

  return { resources, thirdParties: [...grouped.values()].sort((a, b) => b.count - a.count) };
}
