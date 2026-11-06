import snapshot from "../data/provider-discovery.json" with { type: "json" };
import { catalog } from "./catalog.ts";
export type DirectoryVariant = { id: string; label: string; input: string; url?: string };
export type DirectoryApp = { id: string; name: string; category: string; tags: string[]; variants: DirectoryVariant[]; guideId?: string; featured: boolean };
const key = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function safeURL(value: string | undefined) {
  try { const u = new URL(value || ""); return u.protocol === "https:" && !u.username && !u.password ? u.href : undefined; } catch { return undefined; }
}
const classification: Record<string, string> = {};
const groups: Record<string, string> = {
  "Developer tools": "GitHub|GitLab|Bitbucket|Gitea|Codeberg|Linear|Jira|Azure DevOps|Buildkite|CircleCI|Travis CI|LaunchDarkly|SonarCloud|Postman|ReadMe|Vercel|Netlify|Render|Railway|Replit|Docker|Docker Hub|npm|JFrog|Harness",
  "Communication": "Slack|Discord|Microsoft Teams|Zoom|Google Meet|Webex|Telegram|WhatsApp|Twilio|Vonage|8x8|3CX|RingCentral|Dialpad|Aircall|OpenPhone|Telnyx|MessageBird|Bird|Plivo|Exotel|Gupshup|MSG91|Interakt|WATI|Sendbird",
  "Email": "Gmail|Google Mail|Microsoft Outlook|Outlook|Zoho Mail|SendGrid|Mailgun|Postmark|Resend|Amazon SES|SparkPost|Brevo|Mailjet|MailerSend|Elastic Email|Loops",
  "Productivity & projects": "Notion|Microsoft OneNote|Evernote|Obsidian|Confluence|Coda|Airtable|Baserow|NocoDB|AppFlowy|ClickUp|Monday|monday.com|Asana|Trello|Todoist|Basecamp|Height|Fibery|Smartsheet|Wrike|Teamwork|Miro|Mural|Whimsical|Slite|Quip",
  "CRM & sales": "Salesforce|HubSpot|Pipedrive|Zoho|Zoho CRM|Zoho Bigin|Freshsales|Freshworks|Close|Copper|Attio|Folk|Nimble|Insightly|Keap|HighLevel|GoHighLevel|ActiveCampaign|LeadSquared|Apollo|Apollo.io|Outreach|Salesloft|Gong|ZoomInfo|Lusha|Clearbit|Clay|Accelo",
  "Customer support": "Zendesk|Freshdesk|Freshservice|Intercom|Help Scout|Front|Crisp|Tawk.to|LiveChat|Gorgias|Kustomer|Gladly|Dixa|Zoho Desk|Chatwoot|Zammad|Kayako|Reamaze|Plain|Pylon|Vitally|ChurnZero|Gainsight|Totango",
  "Payments & billing": "Stripe|PayPal|Razorpay|Cashfree Payments|PhonePe Payment Gateway|Paytm for Business|PayU|Adyen|Braintree|Square|Mollie|GoCardless|Chargebee|Chargify|Recurly|Paddle|Lemon Squeezy|Lemonsqueezy|Zuora|Bill|Bill.com|Mercury|Wise|Airwallex|Plaid|TrueLayer|Yodlee|Tink|Finicity",
  "Finance & accounting": "QuickBooks|Xero|FreshBooks|Zoho Books|Zoho Invoice|Wave|Sage|Sage Intacct|NetSuite|Oracle NetSuite|Pennylane|FreeAgent|Exact Online|Bexio|Abacus|Ramp|Brex|Expensify|SAP Concur|Concur|Dext|Fyle|Spendesk|Pleo|Navan|Addepar|Tally|TallyPrime",
  "Commerce & retail": "Shopify|WooCommerce|BigCommerce|Magento|Adobe Commerce|PrestaShop|Squarespace|Wix|Webflow|WordPress|Drupal|Ghost|Contentful|Sanity|Strapi|Storyblok|DatoCMS|Prismic|Commercetools|Etsy|eBay|Amazon|Amazon Selling Partner|Walmart|Faire|Zoho Inventory",
  "Marketing & social": "Mailchimp|Klaviyo|ConvertKit|Kit|MailerLite|Campaign Monitor|Constant Contact|GetResponse|Drip|Omnisend|Moosend|Sendinblue|Facebook|Instagram|Meta|LinkedIn|Twitter|X|TikTok|Pinterest|Reddit|YouTube|Buffer|Hootsuite|Sprout Social|Later|Facebook Ads|Google Ads|Microsoft Ads|Bing Ads|TikTok Ads|LinkedIn Ads|Snapchat|Snapchat Ads|Spotify|Twitch",
  "Analytics & data": "Google Analytics|Google Analytics 4|Mixpanel|Amplitude|PostHog|Plausible|Matomo|Segment|RudderStack|Heap|Hotjar|FullStory|Clarity|Microsoft Clarity|Looker|Looker Studio|Tableau|Power BI|Microsoft Power BI|Metabase|Redash|Mode|Domo|Sisense|Fivetran|Airbyte|dbt|Census|Hightouch|Databricks|Snowflake|BigQuery|Google BigQuery|ClickHouse|MotherDuck|Tinybird",
  "Cloud & infrastructure": "AWS|Amazon Web Services|Google Cloud|GCP|Microsoft Azure|Azure|DigitalOcean|Cloudflare|Fastly|Akamai|Linode|Hetzner|OVHcloud|Vultr|Scaleway|IBM Cloud|Oracle Cloud|Heroku|Supabase|Firebase|Appwrite|Convex|PlanetScale|Neon|Upstash|Aiven|CockroachDB|MongoDB Atlas|Turso|Backblaze|Wasabi|MinIO",
  "Monitoring & operations": "Datadog|New Relic|Grafana|Grafana Cloud|Prometheus|PagerDuty|Opsgenie|Incident.io|FireHydrant|Rootly|Better Stack|Better Uptime|UptimeRobot|Uptime.com|Statuspage|Sentry|Bugsnag|Rollbar|Honeycomb|Axiom|Logtail|Logz.io|Splunk|Elastic|Elasticsearch|Coralogix|Dynatrace|Checkly|Snyk|Semgrep|Socket|Wiz",
  "Identity & security": "Auth0|Okta|Clerk|WorkOS|Keycloak|ZITADEL|Ory|FusionAuth|OneLogin|Microsoft Entra|Azure AD|Azure Active Directory|JumpCloud|Ping Identity|Stytch|Descope|Logto|Duo Security|1Password|Bitwarden|LastPass|Keeper|Dashlane|Vault|HashiCorp Vault|DigiLocker|Entity Locker|API Setu",
  "HR & recruiting": "Zoho People|Zoho Recruit|Freshteam|BambooHR|Workday|Personio|HiBob|Breathe HR|BreatheHR|Gusto|Rippling|Deel|Remote|Oyster|Factorial|CharlieHR|Employment Hero|Keka|Darwinbox|greytHR|ADP|Paychex|Paylocity|Paycom|Namely|UKG|Greenhouse|Lever|Ashby|Workable|Breezy HR|Recruitee|Teamtailor|SmartRecruiters|JazzHR|Pinpoint|Bullhorn|Lattice|Culture Amp|15Five|Leapsome|PeopleHR|Zenefits",
  "Files & documents": "Google Drive|Microsoft OneDrive|OneDrive|SharePoint|Microsoft SharePoint|Dropbox|Box|Egnyte|Nextcloud|ownCloud|pCloud|Seafile|DocuSign|Dropbox Sign|HelloSign|Adobe Acrobat Sign|Adobe Sign|PandaDoc|SignNow|SignRequest|Documenso|DocuSeal|Zoho Sign|PDF.co|PDFMonkey|Docparser|Docupilot|Google Docs|Google Sheets|Microsoft Excel|Excel|Google Slides|Microsoft PowerPoint",
  "Calendar & scheduling": "Google Calendar|Microsoft Outlook Calendar|Outlook Calendar|Microsoft Calendar|Zoho Calendar|Calendly|Cal.com|SavvyCal|Acuity Scheduling|YouCanBookMe|SimplyBook.me|Setmore|OnceHub|Doodle|Chili Piper|Cronofy|Nylas|TidyCal|BookingKoala|Appointlet",
  "Design & media": "Figma|Canva|Adobe|Adobe Creative Cloud|Adobe Photoshop|Sketch|InVision|Framer|Penpot|Loom|Vimeo|Mux|Cloudinary|Bunny.net|Wistia|Descript|Synthesia|HeyGen|ElevenLabs|Unsplash|Pexels|Giphy|Brandfetch|Bynder|Frontify|Bannerbear|Placid|Abyssale|Remove.bg",
  "AI & search": "Anthropic|Hugging Face|Cohere|Mistral|Mistral AI|Groq|Together AI|Replicate|Fireworks AI|Perplexity|DeepSeek|Gemini|Google AI|Google Gemini|Ollama|LM Studio|LangSmith|Langfuse|Weights & Biases|Weaviate|Pinecone|Qdrant|Milvus|Chroma|Tavily|Exa|Brave Search|SerpAPI|Serper|Algolia|Meilisearch|Typesense|Kagi|Jina AI|Voyage AI|Deepgram|AssemblyAI|Firecrawl|Apify|Browserbase|Browserless",
  "Automation & webhooks": "Zapier|Make|Make.com|n8n|Pipedream|Activepieces|Windmill|Temporal|Trigger.dev|Inngest|IFTTT|Bardeen|Parabola|Relay.app|Workato|Tray.io|Integrately|Albato|Retool|Appsmith|Budibase|ToolJet|Superblocks|Kestra|Prefect|Dagster|Airflow|Apache Airflow|Svix|Hookdeck|Webhook.site|Beeceptor|HTTP|Generic OAuth2|Generic OAuth 2.0|OAuth2|Webhook",
  "Education & communities": "Moodle|Canvas|Canvas LMS|Blackboard|Google Classroom|Thinkific|Teachable|Kajabi|LearnWorlds|TalentLMS|Absorb LMS|Docebo|LearnUpon|360Learning|Skilljar|Circle|Mighty Networks|Patreon|Buy Me a Coffee|Ko-fi|Discourse|Eventbrite|Meetup|Luma|Lu.ma|Ticket Tailor|Cvent|Livestorm|Demio|Duolingo",
  "Maps & logistics": "Google Maps|Mapbox|HERE|HERE Technologies|TomTom|Mappls|OpenStreetMap|OpenRouteService|Radar|Geoapify|LocationIQ|Shiprocket|Delhivery|DHL|FedEx|UPS|USPS|Easyship|AfterShip|ShipStation|Shippo|EasyPost|Sendcloud|Onfleet|Samsara|Motive|Geotab|ArcGIS|Esri|ArcGIS Online",
  "Trading & market data": "Zerodha Kite Connect|Upstox|DhanHQ|Alpaca|Interactive Brokers|Tradier|Tradovate|Polygon|Polygon.io|Finnhub|Alpha Vantage|Twelve Data|Tiingo|Intrinio|EODHD|Financial Modeling Prep|Coinbase|Kraken|Binance|CoinGecko|CoinMarketCap",
};
for (const [category, names] of Object.entries(groups)) for (const name of names.split("|")) classification[key(name)] = category;
const categoryPrefixes = Object.entries(groups).flatMap(([category, names]) => names.split("|").map(name => ({name: name.toLowerCase(), category}))).sort((a,b) => b.name.length-a.name.length);
const indian = /^(zoho|freshdesk|freshsales|freshservice|freshteam|freshworks|razorpay|cashfree|phonepe|paytm|payu|exotel|gupshup|msg91|digilocker|entitylocker|apisetu|upstox|zerodha|dhanhq|mappls|keka|darwinbox|greythr|leadsquared|shiprocket|delhivery|interakt|wati)/;
const oss = new Set("GitLab|Gitea|Codeberg|Keycloak|ZITADEL|Ory|Logto|Appwrite|Supabase|Nextcloud|ownCloud|Seafile|Baserow|NocoDB|AppFlowy|Chatwoot|Zammad|WordPress|Drupal|Ghost|Strapi|PostHog|Plausible|Matomo|Metabase|Redash|Airbyte|Grafana|Prometheus|Penpot|Ollama|Langfuse|Qdrant|Weaviate|Milvus|Chroma|Meilisearch|Typesense|Activepieces|Windmill|Temporal|Appsmith|Budibase|ToolJet|Kestra|Prefect|Dagster|Apache Airflow|Moodle|Discourse|Documenso|DocuSeal|MinIO".split("|").map(key));
const featured = new Set("GitHub|Slack|Gmail|Notion|Google Drive|Google Sheets|Microsoft Teams|Microsoft Outlook|Salesforce|HubSpot|Shopify|Stripe|Razorpay|Cashfree Payments|PhonePe Payment Gateway|Paytm for Business|DigiLocker|API Setu|Zerodha Kite Connect|Upstox|DhanHQ|Zoho CRM|Freshdesk|Figma|Canva|Linear|Jira|Discord|Zoom|Calendly|Airtable|Supabase|Cloudflare|AWS|Hugging Face|PostHog|n8n|Zapier|Twilio|Gupshup|MSG91".split("|").map(key));
// Additional directory links are starting points, not reviewed OAuth guides.
const additions: [string, string, string, string][] = [
  ["cashfree-payments", "Cashfree Payments", "Payments & billing", "https://www.cashfree.com/docs"],
  ["phonepe-pg", "PhonePe Payment Gateway", "Payments & billing", "https://www.phonepe.com/business-solutions/"],
  ["paytm-business", "Paytm for Business", "Payments & billing", "https://business.paytm.com/support/what-are-the-payment-solutions-offered-by-paytm-for-developers"],
  ["digilocker", "DigiLocker", "Identity & security", "https://www.digilocker.gov.in/web/data-exchange"],
  ["entity-locker", "Entity Locker", "Identity & security", "https://entity.digilocker.gov.in/web"],
  ["api-setu", "API Setu", "Identity & security", "https://apisetu.gov.in/digilocker"],
  ["zerodha-kite", "Zerodha Kite Connect", "Trading & market data", "https://kite.trade/docs/connect/v3/"],
  ["upstox", "Upstox", "Trading & market data", "https://upstox.com/developer/api-documentation/open-api/"],
  ["dhanhq", "DhanHQ", "Trading & market data", "https://api.dhan.co/v2/"],
  ["gupshup", "Gupshup", "Communication", "https://www.gupshup.io/developers"],
  ["msg91", "MSG91", "Communication", "https://docs.msg91.com/OVERVIEW"],
];
function categoryFor(name: string, id: string) {
  if (classification[key(name)]) return classification[key(name)];
  const prefix = categoryPrefixes.find(p => name.toLowerCase().startsWith(p.name + " ") || name.toLowerCase().startsWith(p.name + " -"));
  if (prefix) return prefix.category;
  for (const [pattern, category] of [
    [/recruit|payroll|hris|human.resource/, "HR & recruiting"], [/calendar|scheduling|booking/, "Calendar & scheduling"],
    [/crm|salesforce|hubspot/, "CRM & sales"], [/invoice|accounting|expense|bookkeep/, "Finance & accounting"],
    [/payment|billing|checkout/, "Payments & billing"], [/email|smtp/, "Email"],
    [/storage|drive|document|esign|signature/, "Files & documents"], [/analytics|warehouse|bigquery/, "Analytics & data"],
    [/ticket|helpdesk|support/, "Customer support"], [/webhook|automation|workflow/, "Automation & webhooks"],
    [/advertis|marketing|campaign|social/, "Marketing & social"], [/identity|security|password/, "Identity & security"],
    [/github|gitlab|devops|buildkite|developer/, "Developer tools"],
  ] as [RegExp, string][]) if (pattern.test((name + " " + id).toLowerCase())) return category;
  return "More platforms";
}
function tagsFor(name: string) {
  return [indian.test(key(name)) && "Indian platforms", oss.has(key(name)) && "Open-source ecosystem",
    /^(google|gmail)/i.test(name) && "Google ecosystem", /^(microsoft|azure|outlook|sharepoint|onedrive)/i.test(name) && "Microsoft ecosystem"].filter((tag): tag is string => !!tag);
}
const apps = new Map<string, DirectoryApp>();
for (const [id, row] of Object.entries(snapshot.providers)) {
  const name = (row.display_name || id).replace(/\s*\([^)]*\)/g, "").trim();
  const groupId = key(name);
  if (!groupId) continue;
  if (!apps.has(groupId)) apps.set(groupId, {id: groupId, name, category: categoryFor(name, id), tags: tagsFor(name), variants: [], featured: featured.has(groupId)});
  apps.get(groupId)!.variants.push({id, label: row.display_name || id, input: id, url: safeURL(row.docs)});
}
for (const [id, name, category, url] of additions) if (!apps.has(key(name))) apps.set(key(name), {id:key(name),name,category,tags:tagsFor(name),featured:featured.has(key(name)),variants:[{id,label:name,input:url,url}]});
for (const guide of catalog) {
  const id = key(guide.name);
  const app = apps.get(id) || {id,name:guide.name,category:guide.category,tags:tagsFor(guide.name),featured:true,variants:[{id:guide.id,label:guide.name,input:guide.name}]};
  app.guideId = guide.id; app.featured = true; apps.set(id,app);
}
for (const app of apps.values()) app.variants.sort((a,b) => a.id.length - b.id.length || a.id.localeCompare(b.id));
export const appDirectory = [...apps.values()].sort((a,b) => Number(!!b.guideId)-Number(!!a.guideId) || Number(b.featured)-Number(a.featured) || a.name.localeCompare(b.name));
export const directoryCategories = [...new Set(appDirectory.map(app=>app.category))].sort();
export const directoryCollections = ["Indian platforms", "Open-source ecosystem", "Google ecosystem", "Microsoft ecosystem"];
export function findDirectoryApps(query="", category="All categories", collection="All platforms", mode="all", pins:string[]=[]) {
  const tokens = query.normalize("NFKC").toLowerCase().trim().split(/\s+/).filter(Boolean);
  return appDirectory.filter(app => tokens.every(token => [app.name,app.category,...app.tags,...app.variants.map(v=>v.label+" "+v.id)].join(" ").toLowerCase().includes(token)) &&
    (category==="All categories" || app.category===category) && (collection==="All platforms" || app.tags.includes(collection)) &&
    (mode!=="reviewed" || !!app.guideId) && (mode!=="pinned" || pins.includes(app.id)));
}
