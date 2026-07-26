import { MINI_SITE_DEFAULT_SELECTION, type MiniSiteLibrarySelection } from "@/lib/miniSitePlanAccess";
import { getMiniSiteTemplateEditorDefinition } from "@/lib/miniSiteTemplateEditorRegistry";
import type { MiniSiteTemplate } from "@/types/miniSite";

/** Builder focus targets that map onto the existing MiniSiteEditorCard. */
export type MiniSiteEditorFocus =
  | "settings"
  | "media"
  | "hero"
  | "about"
  | "services"
  | "trust"
  | "faq"
  | "contact"
  | "social"
  | "how-it-works"
  | "why-choose-us"
  | "pricing"
  | "reviews"
  | "footer"
  | "expertise"
  | "process"
  | "results"
  | "articles"
  | "works"
  | "testimonials";

/** Honest section status for the template builder nav. */
export type TemplateBuilderSectionMode =
  | "editable"
  | "managed_elsewhere"
  | "coming_soon"
  | "overview";

export type MiniSiteBuilderId = MiniSiteLibrarySelection;

export type TemplateBuilderSection = {
  id: string;
  label: string;
  helperText: string;
  mode: TemplateBuilderSectionMode;
  /** When editable on a mini-site template, open this area of MiniSiteEditorCard. */
  editorFocus?: MiniSiteEditorFocus;
  comingSoonTitle?: string;
  comingSoonBody?: string;
  /** When managed elsewhere, optional admin path for a real link. */
  managedHref?: string;
  managedLabel?: string;
};

export type TemplateBuilderConfig = {
  id: MiniSiteBuilderId;
  label: string;
  badge: string;
  category: string;
  description: string;
  previewLabel: string;
  tone: string;
  mediaSlotHints: string[];
  sections: TemplateBuilderSection[];
};

function mediaHintsFor(template: MiniSiteTemplate): string[] {
  const def = getMiniSiteTemplateEditorDefinition(template);
  return [
    ...def.imageMediaSlots.map((slot) => slot.label),
    ...def.videoMediaSlots.map((slot) => slot.label),
  ];
}

const STANDARD_BUILDER: TemplateBuilderConfig = {
  id: MINI_SITE_DEFAULT_SELECTION,
  label: "Default business profile",
  badge: "Default",
  category: "Public page",
  description:
    "The original public page layout for bookings, requests, reviews, and location.",
  previewLabel: "Default public profile",
  tone: "Familiar marketplace-style business page",
  mediaSlotHints: ["Business logo", "Service images", "Marketplace cover"],
  // Option A: no fake section nav — Default uses a single overview card.
  sections: [],
};

const CLEAN_BUILDER: TemplateBuilderConfig = {
  id: "clean",
  label: "Clean",
  badge: "Clean",
  category: "Minimal",
  description: "Minimal modern layout for simple service businesses.",
  previewLabel: "Clean mini-site preview",
  tone: "Calm editorial, focused CTAs",
  mediaSlotHints: mediaHintsFor("clean"),
  sections: [
    {
      id: "hero",
      label: "Hero",
      helperText: "Centered headline, badge, and primary actions.",
      mode: "editable",
      editorFocus: "hero",
    },
    {
      id: "about",
      label: "About",
      helperText: "Short editorial introduction for visitors.",
      mode: "editable",
      editorFocus: "about",
    },
    {
      id: "services",
      label: "Services",
      helperText: "Simple service list with booking links.",
      mode: "editable",
      editorFocus: "services",
    },
    {
      id: "benefits",
      label: "Benefits",
      helperText: "Trust strip and key differentiators.",
      mode: "editable",
      editorFocus: "trust",
    },
    {
      id: "faq",
      label: "FAQ",
      helperText: "Common questions in a clean list.",
      mode: "editable",
      editorFocus: "faq",
    },
    {
      id: "contact",
      label: "Contact",
      helperText: "Contact details and location cues.",
      mode: "editable",
      editorFocus: "contact",
    },
    {
      id: "social",
      label: "Social links",
      helperText: "Website and social profiles shown with contact.",
      mode: "editable",
      editorFocus: "social",
    },
    {
      id: "settings",
      label: "Settings",
      helperText: "Colors, background, corners, and media slots.",
      mode: "editable",
      editorFocus: "settings",
    },
  ],
};

const SERVICE_BUILDER: TemplateBuilderConfig = {
  id: "service",
  label: "Service",
  badge: "Service",
  category: "Commercial",
  description: "Commercial layout for businesses that sell services and requests.",
  previewLabel: "Service mini-site preview",
  tone: "Offer-first, conversion-focused",
  mediaSlotHints: mediaHintsFor("service"),
  sections: [
    {
      id: "hero",
      label: "Hero",
      helperText: "Business headline, CTAs, and trust pills.",
      mode: "editable",
      editorFocus: "hero",
    },
    {
      id: "services",
      label: "Services",
      helperText: "Highlighted service offers with pricing cues.",
      mode: "editable",
      editorFocus: "services",
    },
    {
      id: "how-it-works",
      label: "How it works",
      helperText: "Step-by-step booking or request flow.",
      mode: "editable",
      editorFocus: "how-it-works",
    },
    {
      id: "why-choose-us",
      label: "Why choose us",
      helperText: "Benefits and trust stats for local service buyers.",
      mode: "editable",
      editorFocus: "why-choose-us",
    },
    {
      id: "pricing",
      label: "Pricing / packages",
      helperText: "Package-style pricing presentation.",
      mode: "editable",
      editorFocus: "pricing",
    },
    {
      id: "reviews",
      label: "Testimonials / reviews",
      helperText: "Social proof for service quality.",
      mode: "editable",
      editorFocus: "reviews",
    },
    {
      id: "faq",
      label: "FAQ",
      helperText: "Customer questions before booking or requesting.",
      mode: "editable",
      editorFocus: "faq",
    },
    {
      id: "contact",
      label: "Contact",
      helperText: "Phone, address, and social links.",
      mode: "editable",
      editorFocus: "contact",
    },
    {
      id: "footer",
      label: "Footer",
      helperText: "Footer description, links, and social profiles.",
      mode: "editable",
      editorFocus: "footer",
    },
    {
      id: "settings",
      label: "Settings",
      helperText: "Brand colors, media slots, and layout style.",
      mode: "editable",
      editorFocus: "settings",
    },
  ],
};

const EXPERT_BUILDER: TemplateBuilderConfig = {
  id: "expert",
  label: "Expert",
  badge: "Expert",
  category: "Personal brand",
  description: "Personal specialist layout with articles, works, and testimonials.",
  previewLabel: "Expert mini-site preview",
  tone: "Credibility-first personal brand",
  mediaSlotHints: mediaHintsFor("expert"),
  sections: [
    {
      id: "hero",
      label: "Hero",
      helperText: "Profile intro, credentials, and primary CTAs.",
      mode: "editable",
      editorFocus: "hero",
    },
    {
      id: "about",
      label: "About",
      helperText: "Biography and credentials.",
      mode: "editable",
      editorFocus: "about",
    },
    {
      id: "services",
      label: "Services",
      helperText: "Real session offers from Admin Services.",
      mode: "editable",
      editorFocus: "services",
    },
    {
      id: "expertise",
      label: "Expertise",
      helperText: "Specializations and focus areas.",
      mode: "editable",
      editorFocus: "expertise",
    },
    {
      id: "process",
      label: "Process",
      helperText: "How clients work with you.",
      mode: "editable",
      editorFocus: "process",
    },
    {
      id: "results",
      label: "Results",
      helperText: "Proof points and outcomes.",
      mode: "editable",
      editorFocus: "results",
    },
    {
      id: "articles",
      label: "Articles",
      helperText: "Publications and thought leadership cards.",
      mode: "editable",
      editorFocus: "articles",
    },
    {
      id: "works",
      label: "Works",
      helperText: "Case studies and portfolio outcomes.",
      mode: "editable",
      editorFocus: "works",
    },
    {
      id: "testimonials",
      label: "Reviews",
      helperText: "Approved reviews and manual testimonials.",
      mode: "editable",
      editorFocus: "testimonials",
    },
    {
      id: "faq",
      label: "FAQ",
      helperText: "Common questions before booking.",
      mode: "editable",
      editorFocus: "faq",
    },
    {
      id: "contact",
      label: "Contact",
      helperText: "Final booking call-to-action.",
      mode: "editable",
      editorFocus: "contact",
    },
    {
      id: "footer",
      label: "Footer",
      helperText: "Links, contact, and copyright.",
      mode: "editable",
      editorFocus: "footer",
    },
    {
      id: "settings",
      label: "Settings",
      helperText: "Theme, typography, and media.",
      mode: "editable",
      editorFocus: "settings",
    },
  ],
};

const PORTFOLIO_BUILDER: TemplateBuilderConfig = {
  id: "portfolio",
  label: "Portfolio",
  badge: "Portfolio",
  category: "Creative",
  description: "Visual work and case-study focused creative layout.",
  previewLabel: "Portfolio mini-site preview",
  tone: "Bold creative presentation",
  mediaSlotHints: mediaHintsFor("portfolio"),
  sections: [
    {
      id: "hero",
      label: "Hero",
      helperText: "Asymmetric creative hero with visual panel.",
      mode: "editable",
      editorFocus: "hero",
    },
    {
      id: "projects",
      label: "Projects / selected work",
      helperText: "Featured work gallery and project cards.",
      mode: "editable",
    },
    {
      id: "about",
      label: "About me",
      helperText: "Studio note and creative positioning.",
      mode: "editable",
      editorFocus: "about",
    },
    {
      id: "skills",
      label: "Skills",
      helperText: "Capabilities and craft highlights.",
      mode: "editable",
    },
    {
      id: "services",
      label: "Services",
      helperText: "Services offered by this creative practice.",
      mode: "editable",
    },
    {
      id: "process",
      label: "Process",
      helperText: "How collaborations usually run.",
      mode: "editable",
    },
    {
      id: "testimonials",
      label: "Testimonials",
      helperText: "Client feedback on delivered work.",
      mode: "editable",
    },
    {
      id: "contact",
      label: "Contact",
      helperText: "Collaboration inquiry details.",
      mode: "editable",
      editorFocus: "contact",
    },
    {
      id: "footer",
      label: "Footer",
      helperText: "Footer links and contact information.",
      mode: "editable",
    },
    {
      id: "settings",
      label: "Settings",
      helperText: "Hero visuals, showreel, and brand style.",
      mode: "editable",
      editorFocus: "settings",
    },
  ],
};

const CLINIC_BUILDER: TemplateBuilderConfig = {
  id: "clinic",
  label: "Clinic",
  badge: "Clinic",
  category: "Healthcare",
  description: "Healthcare and wellness layout with appointment-focused framing.",
  previewLabel: "Clinic mini-site preview",
  tone: "Calm, trustworthy appointment-first",
  mediaSlotHints: mediaHintsFor("clinic"),
  sections: [
    {
      id: "appointment",
      label: "Appointment banner",
      helperText: "Appointment-focused hero and intake cues.",
      mode: "editable",
      editorFocus: "hero",
    },
    {
      id: "services",
      label: "Services",
      helperText: "Treatments and appointment offers.",
      mode: "editable",
      editorFocus: "services",
    },
    {
      id: "conditions",
      label: "Conditions / treatments",
      helperText: "Specialty and treatment highlights.",
      mode: "coming_soon",
      comingSoonTitle: "Conditions / treatments coming soon",
      comingSoonBody:
        "Specialty taxonomies are not stored yet. Use Services and Benefits to describe treatments for now.",
    },
    {
      id: "about",
      label: "About clinic",
      helperText: "Clinic introduction and care philosophy.",
      mode: "editable",
      editorFocus: "about",
    },
    {
      id: "team",
      label: "Doctors / team",
      helperText: "Provider profiles and team bios.",
      mode: "coming_soon",
      comingSoonTitle: "Doctors / team coming soon",
      comingSoonBody:
        "Provider and team profiles are not available yet. No fake medical staff data will be invented.",
    },
    {
      id: "testimonials",
      label: "Testimonials",
      helperText: "Patient confidence and care outcomes.",
      mode: "coming_soon",
      comingSoonTitle: "Testimonials coming soon",
      comingSoonBody:
        "Clinic testimonial blocks will be added later. Published reviews remain available when present.",
    },
    {
      id: "faq",
      label: "FAQ",
      helperText: "Common patient questions before booking.",
      mode: "editable",
      editorFocus: "faq",
    },
    {
      id: "contact",
      label: "Contact",
      helperText: "Appointment details, phone, and location.",
      mode: "editable",
      editorFocus: "contact",
    },
    {
      id: "settings",
      label: "Settings",
      helperText: "Clinic media slots, colors, and style.",
      mode: "editable",
      editorFocus: "settings",
    },
  ],
};

const TEACHER_BUILDER: TemplateBuilderConfig = {
  id: "teacher",
  label: "Teacher",
  badge: "Teacher",
  category: "Education",
  description: "Education and tutoring layout with lesson-focused framing.",
  previewLabel: "Teacher mini-site preview",
  tone: "Clear learning outcomes, warm guidance",
  mediaSlotHints: mediaHintsFor("teacher"),
  sections: [
    {
      id: "hero",
      label: "Hero",
      helperText: "Lesson outcome message with booking CTAs.",
      mode: "editable",
      editorFocus: "hero",
    },
    {
      id: "courses",
      label: "Courses / lessons",
      helperText: "Lesson and course offers from your services.",
      mode: "editable",
      editorFocus: "services",
    },
    {
      id: "about",
      label: "About",
      helperText: "Teacher introduction and teaching focus.",
      mode: "editable",
      editorFocus: "about",
    },
    {
      id: "approach",
      label: "Teaching approach",
      helperText: "How students learn with you.",
      mode: "editable",
      editorFocus: "trust",
    },
    {
      id: "testimonials",
      label: "Testimonials",
      helperText: "Student and parent feedback.",
      mode: "coming_soon",
      comingSoonTitle: "Testimonials coming soon",
      comingSoonBody:
        "Teacher-specific testimonials will be added later. No fake student quotes will be shown.",
    },
    {
      id: "faq",
      label: "FAQ",
      helperText: "Common student questions.",
      mode: "editable",
      editorFocus: "faq",
    },
    {
      id: "contact",
      label: "Contact",
      helperText: "Availability and booking contact details.",
      mode: "editable",
      editorFocus: "contact",
    },
    {
      id: "settings",
      label: "Settings",
      helperText: "Course media, lesson preview, and style.",
      mode: "editable",
      editorFocus: "settings",
    },
  ],
};

const COACH_BUILDER: TemplateBuilderConfig = {
  id: "coach",
  label: "Coach",
  badge: "Coach",
  category: "Coaching",
  description: "Coaching and programs layout with motivational framing.",
  previewLabel: "Coach mini-site preview",
  tone: "Motivational, outcome-driven",
  mediaSlotHints: mediaHintsFor("coach"),
  sections: [
    {
      id: "hero",
      label: "Hero",
      helperText: "Transformation headline with outcome chips.",
      mode: "editable",
      editorFocus: "hero",
    },
    {
      id: "programs",
      label: "Programs",
      helperText: "Coaching programs and sessions from your services.",
      mode: "editable",
      editorFocus: "services",
    },
    {
      id: "about",
      label: "About",
      helperText: "Coaching philosophy and positioning.",
      mode: "editable",
      editorFocus: "about",
    },
    {
      id: "process",
      label: "Coaching process",
      helperText: "Steps clients take on their journey.",
      mode: "coming_soon",
      comingSoonTitle: "Coaching process coming soon",
      comingSoonBody:
        "A dedicated process editor will be added later. Use Benefits to outline your coaching path today.",
    },
    {
      id: "benefits",
      label: "Benefits",
      helperText: "Outcomes and credibility highlights.",
      mode: "editable",
      editorFocus: "trust",
    },
    {
      id: "success-stories",
      label: "Success stories",
      helperText: "Client transformations and proof.",
      mode: "coming_soon",
      comingSoonTitle: "Success stories coming soon",
      comingSoonBody:
        "Success-story cards are not available yet. No fake client results will be invented.",
    },
    {
      id: "faq",
      label: "FAQ",
      helperText: "Common coaching questions.",
      mode: "editable",
      editorFocus: "faq",
    },
    {
      id: "contact",
      label: "Contact",
      helperText: "Connect and start the journey.",
      mode: "editable",
      editorFocus: "contact",
    },
    {
      id: "settings",
      label: "Settings",
      helperText: "Program media, colors, and style.",
      mode: "editable",
      editorFocus: "settings",
    },
  ],
};

export const TEMPLATE_BUILDER_CONFIGS: Record<MiniSiteBuilderId, TemplateBuilderConfig> = {
  [MINI_SITE_DEFAULT_SELECTION]: STANDARD_BUILDER,
  clean: CLEAN_BUILDER,
  service: SERVICE_BUILDER,
  expert: EXPERT_BUILDER,
  portfolio: PORTFOLIO_BUILDER,
  clinic: CLINIC_BUILDER,
  teacher: TEACHER_BUILDER,
  coach: COACH_BUILDER,
};

export function getTemplateBuilderConfig(builderId: MiniSiteBuilderId): TemplateBuilderConfig {
  return TEMPLATE_BUILDER_CONFIGS[builderId];
}

export function getAvailableSectionsForTemplate(builderId: MiniSiteBuilderId): TemplateBuilderSection[] {
  return getTemplateBuilderConfig(builderId).sections;
}

export function getTemplateBuilderLabel(builderId: MiniSiteBuilderId): string {
  return getTemplateBuilderConfig(builderId).label;
}

export function getTemplateBuilderSection(
  builderId: MiniSiteBuilderId,
  sectionId: string,
): TemplateBuilderSection | undefined {
  return getAvailableSectionsForTemplate(builderId).find((section) => section.id === sectionId);
}

export function getDefaultSectionIdForTemplate(builderId: MiniSiteBuilderId): string {
  return getAvailableSectionsForTemplate(builderId)[0]?.id ?? "settings";
}

export function isMiniSiteBuilderTemplate(builderId: MiniSiteBuilderId): builderId is MiniSiteTemplate {
  return builderId !== MINI_SITE_DEFAULT_SELECTION;
}
