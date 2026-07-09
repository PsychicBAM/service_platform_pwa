import { MINI_SITE_TEMPLATES, type MiniSiteTemplate } from "@/types/miniSite";

export type MiniSiteFutureMediaSlotStatus = "coming_soon";

export type MiniSiteFutureMediaSlotType = "image" | "video";

export interface MiniSiteEditorBlockDefinition {
  id: string;
  label: string;
  description: string;
}

export interface MiniSiteFutureMediaSlotDefinition {
  id: string;
  label: string;
  type: MiniSiteFutureMediaSlotType;
  status: MiniSiteFutureMediaSlotStatus;
}

export interface MiniSiteImageMediaSlotDefinition {
  id: string;
  label: string;
}

export interface MiniSiteVideoMediaSlotDefinition {
  id: string;
  label: string;
  status: MiniSiteFutureMediaSlotStatus;
}

export interface MiniSiteTemplateEditorDefinition {
  template: MiniSiteTemplate;
  label: string;
  description: string;
  blocks: MiniSiteEditorBlockDefinition[];
  imageMediaSlots: MiniSiteImageMediaSlotDefinition[];
  videoMediaSlots: MiniSiteVideoMediaSlotDefinition[];
  /** @deprecated Use imageMediaSlots / videoMediaSlots */
  futureMediaSlots: MiniSiteFutureMediaSlotDefinition[];
}

const MINI_SITE_TEMPLATE_EDITOR_REGISTRY: Record<MiniSiteTemplate, MiniSiteTemplateEditorDefinition> = {
  clean: {
    template: "clean",
    label: "Clean",
    description: "Minimal editorial layout for a calm, focused public page.",
    blocks: [
      { id: "hero", label: "Editorial hero", description: "Centered headline, badge, and primary actions." },
      { id: "about", label: "About", description: "Short editorial introduction." },
      { id: "services", label: "Services list", description: "Simple service rows with booking links." },
      { id: "trustStrip", label: "Trust strip", description: "Compact trust highlights when trust section is hidden." },
      { id: "faq", label: "FAQ", description: "Common questions in a clean list." },
      { id: "contact", label: "Contact", description: "Contact details and social links." },
      { id: "bookingCta", label: "Booking CTA", description: "Final call-to-action band." },
    ],
    futureMediaSlots: [
      { id: "heroImage", label: "Hero image", type: "image", status: "coming_soon" },
    ],
    imageMediaSlots: [{ id: "heroImage", label: "Hero image" }],
    videoMediaSlots: [],
  },
  service: {
    template: "service",
    label: "Service",
    description: "Commercial local service business with strong offer presentation.",
    blocks: [
      { id: "hero", label: "Service hero", description: "Business headline, CTAs, and trust pills." },
      { id: "about", label: "About the business", description: "Local service introduction." },
      { id: "services", label: "Service offers", description: "Highlighted service cards with pricing." },
      { id: "trust", label: "Why choose us", description: "Benefits and trust stats." },
      { id: "faq", label: "FAQ", description: "Customer questions." },
      { id: "contact", label: "Contact & location", description: "Phone, address, and social links." },
      { id: "bookingCta", label: "Booking CTA", description: "Prominent booking prompt." },
    ],
    futureMediaSlots: [
      { id: "heroImage", label: "Hero image", type: "image", status: "coming_soon" },
      { id: "serviceImage", label: "Service image", type: "image", status: "coming_soon" },
      { id: "introVideo", label: "Intro video", type: "video", status: "coming_soon" },
    ],
    imageMediaSlots: [
      { id: "heroImage", label: "Hero image" },
      { id: "serviceImage", label: "Service image" },
    ],
    videoMediaSlots: [{ id: "introVideo", label: "Intro video", status: "coming_soon" }],
  },
  expert: {
    template: "expert",
    label: "Expert",
    description: "Personal consultant or advisor profile with session-focused offers.",
    blocks: [
      { id: "hero", label: "Expert hero", description: "Centered credibility hero with session CTAs." },
      { id: "about", label: "About", description: "Personal expertise and positioning." },
      { id: "services", label: "Sessions & offers", description: "Consultation and booking offers." },
      { id: "trust", label: "Credibility", description: "Trust stats and approach highlights." },
      { id: "faq", label: "FAQ", description: "Client questions." },
      { id: "contact", label: "Get in touch", description: "Contact and social links." },
      { id: "bookingCta", label: "Session CTA", description: "Book or request a session." },
    ],
    futureMediaSlots: [
      { id: "profileImage", label: "Profile image", type: "image", status: "coming_soon" },
      { id: "heroImage", label: "Hero image", type: "image", status: "coming_soon" },
      { id: "introVideo", label: "Intro video", type: "video", status: "coming_soon" },
    ],
    imageMediaSlots: [
      { id: "profileImage", label: "Profile image" },
      { id: "heroImage", label: "Hero image" },
    ],
    videoMediaSlots: [{ id: "introVideo", label: "Intro video", status: "coming_soon" }],
  },
  clinic: {
    template: "clinic",
    label: "Clinic",
    description: "Healthcare and wellness landing page with appointment-focused layout.",
    blocks: [
      { id: "hero", label: "Clinic hero", description: "Healthcare headline with trust chips and CTAs." },
      { id: "appointmentPanel", label: "Appointment panel", description: "Clinic intake summary in the hero." },
      { id: "capabilitiesStrip", label: "Clinic info strip", description: "Appointments, specialties, and contact highlights." },
      { id: "about", label: "About the clinic", description: "Clinic introduction and identity." },
      { id: "specialties", label: "Specialties & treatments", description: "Medical service and specialty cards." },
      { id: "patientCare", label: "Patient care", description: "Care process and trust stats." },
      { id: "faq", label: "Patient FAQ", description: "Common patient questions." },
      { id: "contact", label: "Appointment details", description: "Phone, address, and social links." },
      { id: "bookingCta", label: "Schedule visit CTA", description: "Final appointment call-to-action." },
    ],
    futureMediaSlots: [
      { id: "heroImage", label: "Hero image", type: "image", status: "coming_soon" },
      { id: "doctorOrClinicImage", label: "Doctor / clinic image", type: "image", status: "coming_soon" },
      { id: "introVideo", label: "Intro video", type: "video", status: "coming_soon" },
    ],
    imageMediaSlots: [
      { id: "heroImage", label: "Hero image" },
      { id: "doctorOrClinicImage", label: "Doctor / clinic image" },
    ],
    videoMediaSlots: [{ id: "introVideo", label: "Intro video", status: "coming_soon" }],
  },
  portfolio: {
    template: "portfolio",
    label: "Portfolio",
    description: "Bold creative studio or agency portfolio presentation.",
    blocks: [
      { id: "hero", label: "Creative hero", description: "Asymmetric hero with visual panel and CTAs." },
      { id: "capabilitiesStrip", label: "Capabilities strip", description: "Selected work and process highlights." },
      { id: "about", label: "Studio note", description: "Creative studio statement." },
      { id: "workShowcase", label: "Work showcase", description: "Project-style service cards." },
      { id: "process", label: "Creative process", description: "How you work and why clients choose you." },
      { id: "faq", label: "Project FAQ", description: "Collaboration questions." },
      { id: "contact", label: "Collaboration", description: "Contact and social links." },
      { id: "bookingCta", label: "Creative CTA", description: "Start a project call-to-action." },
    ],
    futureMediaSlots: [
      { id: "heroVisual", label: "Hero visual", type: "image", status: "coming_soon" },
      { id: "featuredWorkImage", label: "Featured work image", type: "image", status: "coming_soon" },
      { id: "showreel", label: "Showreel video", type: "video", status: "coming_soon" },
    ],
    imageMediaSlots: [
      { id: "heroVisual", label: "Hero visual" },
      { id: "featuredWorkImage", label: "Featured work image" },
    ],
    videoMediaSlots: [{ id: "showreel", label: "Showreel video", status: "coming_soon" }],
  },
  teacher: {
    template: "teacher",
    label: "Teacher",
    description: "Education and tutoring landing page with lesson-focused layout.",
    blocks: [
      { id: "hero", label: "Learning hero", description: "Lesson outcome message with booking CTAs." },
      { id: "lessonPanel", label: "Lesson overview panel", description: "Lesson summary using existing services." },
      { id: "highlightsStrip", label: "Learning highlights", description: "Lessons, approach, and support highlights." },
      { id: "about", label: "About the lessons", description: "Teacher and lesson introduction." },
      { id: "lessons", label: "Lessons & courses", description: "Lesson and course cards." },
      { id: "learningOutcomes", label: "Learning outcomes", description: "How learning works and trust highlights." },
      { id: "faq", label: "Student FAQ", description: "Common student questions." },
      { id: "contact", label: "Contact & availability", description: "Reach out to start learning." },
      { id: "bookingCta", label: "Start learning CTA", description: "Book a lesson call-to-action." },
    ],
    futureMediaSlots: [
      { id: "courseImage", label: "Course image", type: "image", status: "coming_soon" },
      { id: "lessonPreviewImage", label: "Lesson preview image", type: "image", status: "coming_soon" },
      { id: "introVideo", label: "Intro video", type: "video", status: "coming_soon" },
    ],
    imageMediaSlots: [
      { id: "courseImage", label: "Course image" },
      { id: "lessonPreviewImage", label: "Lesson preview image" },
    ],
    videoMediaSlots: [{ id: "introVideo", label: "Intro video", status: "coming_soon" }],
  },
  coach: {
    template: "coach",
    label: "Coach",
    description: "Coaching and transformation landing page with program-focused layout.",
    blocks: [
      { id: "hero", label: "Transformation hero", description: "Motivational headline with outcome chips." },
      { id: "programPanel", label: "Coaching program panel", description: "Program summary using existing services." },
      { id: "outcomesStrip", label: "Outcome highlights", description: "Programs, path, and focus highlights." },
      { id: "about", label: "Coaching philosophy", description: "Coaching approach and positioning." },
      { id: "programs", label: "Programs & sessions", description: "Coaching program and session cards." },
      { id: "transformationProcess", label: "Transformation process", description: "Coaching steps and credibility blocks." },
      { id: "faq", label: "Coaching FAQ", description: "Client coaching questions." },
      { id: "contact", label: "Connect", description: "Contact and social links." },
      { id: "bookingCta", label: "Start journey CTA", description: "Start your coaching journey call-to-action." },
    ],
    futureMediaSlots: [
      { id: "heroImage", label: "Hero image", type: "image", status: "coming_soon" },
      { id: "programImage", label: "Program image", type: "image", status: "coming_soon" },
      { id: "introVideo", label: "Intro video", type: "video", status: "coming_soon" },
    ],
    imageMediaSlots: [
      { id: "heroImage", label: "Hero image" },
      { id: "programImage", label: "Program image" },
    ],
    videoMediaSlots: [{ id: "introVideo", label: "Intro video", status: "coming_soon" }],
  },
};

export function getMiniSiteTemplateEditorDefinition(
  template: MiniSiteTemplate,
): MiniSiteTemplateEditorDefinition {
  return MINI_SITE_TEMPLATE_EDITOR_REGISTRY[template];
}

export function getAllMiniSiteTemplateEditorDefinitions(): MiniSiteTemplateEditorDefinition[] {
  return MINI_SITE_TEMPLATES.map((template) => MINI_SITE_TEMPLATE_EDITOR_REGISTRY[template]);
}

export function isMiniSiteEditorBlockLabelForTemplate(label: string, template: MiniSiteTemplate): boolean {
  return getMiniSiteTemplateEditorDefinition(template).blocks.some((block) => block.label === label);
}
