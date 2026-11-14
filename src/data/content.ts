import {
  Wrench,
  Zap,
  Wind,
  Waves,
  ScanLine,
  Pipette,
  Siren,
} from "lucide-react";
export const business = {
  phone: "714-410-2728",
  tel: "tel:+17144102728",
  email: "robert@fwccompanies.com",
  address: "2007 E Miraloma Ave, Placentia, CA 92870",
  name: "FWC Plumbing & Rooter",
  slogan: "ONE CALL, WE DO IT ALL",
  secondarySlogan: "WE HANDLE PROBLEMS OTHERS CAN'T FIGURE OUT",
  website: "https://fwccompanies.com",
  bbb: "https://www.bbb.org/us/ca/placentia/profile/general-contractor/fwc-llc-1126-850066125",
};
// Service photos sourced from the client's current site (fwccompanies.com).
// TODO: Client confirmation required — confirm photo rights; the HVAC image
// may be stock/AI-generated and should be replaced with a real FWC job photo.
export type ServiceImage = {
  src: string;
  width: number;
  height: number;
  position: string;
  alt: string;
};
export const services: {
  id: string;
  name: string;
  icon: typeof Wrench;
  summary: string;
  items: string[];
  image?: ServiceImage;
}[] = [
  {
    id: "plumbing",
    image: {
      src: "/assets/images/services/plumbing.webp",
      width: 720,
      height: 537,
      position: "center 40%",
      alt: "FWC crew standing with new water heaters on a multifamily job",
    },
    name: "Plumbing installations & repairs",
    icon: Wrench,
    summary: "From a dripping faucet to a full-system repipe.",
    items: [
      "Water heaters & boilers, including tankless systems",
      "New installations & repairs",
      "Preventative maintenance",
      "Leak detection & slab-leak repair",
      "Repipes: gas & water, including PEX & copper",
      "Fixture repairs, installations & code updates",
    ],
  },
  {
    id: "electrical",
    image: {
      src: "/assets/images/services/electrical.webp",
      width: 451,
      height: 600,
      position: "center 35%",
      alt: "Electrical panels mounted on exposed wall studs during an upgrade",
    },
    name: "Electrical",
    icon: Zap,
    summary: "Practical solutions. Power you can depend on.",
    items: [
      "Panel rebuilds, upgrades & breakers",
      "Dedicated circuits & EV-charger wiring",
      "Lighting, outlets, switches & GFCI",
      "Troubleshooting, remodels & new construction",
    ],
  },
  {
    id: "hvac",
    image: {
      src: "/assets/images/services/hvac.webp",
      width: 800,
      height: 600,
      position: "center 30%",
      alt: "Technician servicing an outdoor air-conditioning condenser",
    },
    name: "Heating & cooling",
    icon: Wind,
    summary: "Keep your property comfortable, season after season.",
    items: [
      "Central, split & mini-split systems",
      "Heat pumps, rooftop & package units",
      "Soffit-mounted air handlers & change-outs",
      "Repairs, maintenance & new installations",
    ],
  },
  {
    id: "sewer",
    image: {
      src: "/assets/images/services/sewer.webp",
      width: 600,
      height: 799,
      position: "center 55%",
      alt: "Replacement sewer pipe being fitted in an open trench",
    },
    name: "Drain & sewer repair",
    icon: Waves,
    summary: "Find the problem. Restore the flow.",
    items: [
      "Camera inspections",
      "Main-line repairs",
      "Damaged drain & sewer restoration",
      "Cast iron, ABS, PVC, clay, concrete, DIP & HDPE",
    ],
  },
  {
    id: "trenchless",
    image: {
      src: "/assets/images/services/trenchless.webp",
      width: 600,
      height: 800,
      position: "center 45%",
      alt: "Technician feeding a line into a pipe access trench",
    },
    name: "Trenchless pipe repair",
    icon: ScanLine,
    summary: "Restore aging pipes with less disruption.",
    items: [
      "Epoxy / cured-in-place pipe lining",
      "Pipe bursting",
      "Inspection, cleaning, lining & evaluation",
      "Residential & multifamily applications",
    ],
  },
  {
    id: "drains",
    image: {
      src: "/assets/images/services/drains.webp",
      width: 600,
      height: 450,
      position: "center 40%",
      alt: "FWC truck towing a drain-jetting trailer at a home",
    },
    name: "Rooter & drain cleaning",
    icon: Pipette,
    summary: "Clear stubborn clogs and get ahead of root problems.",
    items: [
      "Rooter & drain blockage",
      "Snaking, augering & root cutting",
      "Hydro-jetting & high-flow sewer jetting",
      "Chain knocking, descaling & rotary brushes",
      "Flex-shaft & enzymatic / biological treatments",
    ],
  },
  {
    id: "emergency",
    name: "Emergency services",
    icon: Siren,
    summary: "When it cannot wait until tomorrow.",
    items: [
      "Emergency plumbing leaks",
      "Electrical failures",
      "Urgent heating & cooling service",
      "Call to discuss your situation & availability",
    ],
  },
];
// Problem-first entry points for the services ticker. Each maps to a service id
// above so a tap can preselect the estimate form. Labels describe symptoms only —
// no response-time, pricing or guarantee claims.
export const problems: { label: string; service: string }[] = [
  { label: "No hot water", service: "plumbing" },
  { label: "Clogged drain", service: "drains" },
  { label: "Breaker keeps tripping", service: "electrical" },
  { label: "AC not cooling", service: "hvac" },
  { label: "Leak or slab leak", service: "plumbing" },
  { label: "Sewer backup", service: "sewer" },
  { label: "Tree roots in the line", service: "drains" },
  { label: "EV-charger wiring", service: "electrical" },
  { label: "Heat not working", service: "hvac" },
  { label: "Aging pipes", service: "trenchless" },
  { label: "Water heater install", service: "plumbing" },
  { label: "Panel upgrade", service: "electrical" },
];
export const faqs = [
  [
    "What services does FWC provide?",
    "FWC Plumbing & Rooter provides plumbing, rooter, drain cleaning, sewer and trenchless pipe services. Our team also offers electrical and heating and cooling services. We serve residential, multi-family, commercial and institutional properties, including HOA communities.",
  ],
  [
    "Can I call outside regular business hours?",
    "Yes. We offer 24/7 service. Call 714-410-2728 to discuss your issue, location and current availability.",
  ],
  [
    "Do you work with property managers?",
    "Yes. Residential and multifamily properties are a core focus of FWC’s published service offering. Contact us to discuss your property and project scope.",
  ],
  [
    "Do you serve my ZIP code?",
    "FWC is based in Placentia, California. Call with your ZIP code so the team can confirm coverage for your location and the service you need.",
  ],
  [
    "What is trenchless pipe repair?",
    "Trenchless methods can restore or replace certain damaged pipes while reducing excavation. FWC offers pipe lining and pipe bursting. An inspection helps determine which method is suitable.",
  ],
  [
    "What should I include in my estimate request?",
    "Tell us the service you need, your ZIP code and a short description of the issue. For urgent help, calling is the quickest way to discuss availability.",
  ],
];
