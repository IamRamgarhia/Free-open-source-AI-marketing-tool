export interface NavItem {
  href: string;
  label: string;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    defaultOpen: true,
    items: [
      { href: "/", label: "Dashboard" },
      { href: "/brand", label: "Clients · Brand Brain" },
      { href: "/suggestions", label: "✨ AI Suggestions" },
      { href: "/platforms", label: "Pick a platform" },
      { href: "/launch-guide", label: "Step-by-step launch" },
    ],
  },
  {
    title: "Generate",
    defaultOpen: true,
    items: [
      { href: "/generate/campaign-kit", label: "Full Campaign Kit" },
      { href: "/generate/google", label: "Google · RSA" },
      { href: "/generate/google-pmax", label: "Google · Performance Max" },
      { href: "/generate/google-shopping", label: "Google · Shopping" },
      { href: "/generate/meta", label: "Meta · Feed/Reels" },
      { href: "/generate/tiktok", label: "TikTok · Hooks/UGC" },
      { href: "/generate/spark-ads", label: "TikTok · Spark Ads" },
      { href: "/generate/branded-hashtag-challenge", label: "TikTok · BHC" },
      { href: "/generate/youtube", label: "YouTube · Scripts" },
      { href: "/generate/linkedin", label: "LinkedIn · B2B" },
      { href: "/generate/twitter", label: "Twitter / X" },
      { href: "/generate/display", label: "Display banners" },
      { href: "/generate/hashtags", label: "Hashtags · any language" },
      { href: "/generate/email-subjects", label: "Email subjects" },
      { href: "/generate/lead-form", label: "Lead form" },
      { href: "/generate/creative-prompts", label: "AI image/video prompts" },
      { href: "/generate/content-calendar", label: "Social content calendar" },
    ],
  },
  {
    title: "Research",
    defaultOpen: true,
    items: [
      { href: "/research/competitors", label: "Steal & Beat" },
      { href: "/research/compare", label: "Compare 2 ads" },
      { href: "/benchmarks", label: "Benchmarks" },
    ],
  },
  {
    title: "Optimize",
    items: [
      { href: "/optimize/creative-score", label: "Creative Score" },
      { href: "/optimize/ctr", label: "CTR Optimizer" },
      { href: "/optimize/quality-score", label: "Quality Score" },
      { href: "/optimize/budget", label: "Budget Waste" },
      { href: "/optimize/budget-planner", label: "Budget Planner" },
      { href: "/optimize/ab-test", label: "A/B Test Planner" },
      { href: "/optimize/keywords", label: "Keyword Builder" },
      { href: "/optimize/audience", label: "Audience Targeting" },
      { href: "/optimize/landing-page", label: "Landing Page" },
      { href: "/optimize/bid-strategy", label: "Bid Strategy" },
      { href: "/optimize/ad-fatigue", label: "Ad Fatigue" },
    ],
  },
  {
    title: "Routines",
    items: [
      { href: "/checklist/daily", label: "Daily" },
      { href: "/checklist/weekly", label: "Weekly" },
      { href: "/checklist/monthly", label: "Monthly" },
    ],
  },
  {
    title: "Strategy",
    items: [
      { href: "/strategy", label: "What Ad Should I Run" },
      { href: "/strategy/decision-tree", label: "Decision Tree" },
      { href: "/report", label: "Report Generator" },
    ],
  },
  {
    title: "Learn",
    items: [
      { href: "/learn", label: "Concept Library" },
      { href: "/learn/courses", label: "Mini-courses" },
      { href: "/learn/frameworks", label: "Ad Copy School" },
    ],
  },
  {
    title: "Data",
    items: [
      { href: "/history", label: "History" },
      { href: "/campaigns", label: "Campaigns" },
      { href: "/settings", label: "Settings" },
      { href: "/about", label: "About · Dicecodes" },
    ],
  },
];
