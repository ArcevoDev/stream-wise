import { GraduationCap, Brain, Target, Users, HeartHandshake, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

export interface StepItem {
  n: string;
  title: string;
  text: string;
}

export interface WhyPoint {
  icon: LucideIcon;
  stat: string;
  title: string;
  text: string;
  source: string;
}

export const FEATURES: FeatureItem[] = [
  {
    icon: GraduationCap,
    title: "Personalised stream match",
    text: "Science, Humanities, or Business, recommended from your real academic scores, not guesswork.",
  },
  {
    icon: Brain,
    title: "Two research-backed quizzes",
    text: "A 48-item vocational interest (RIASEC) quiz and a 20-item personality (BFI) questionnaire.",
  },
  {
    icon: Target,
    title: "JAMB subject check",
    text: "Validate your O'Level subjects against real university course requirements before you apply.",
  },
];

export const STEPS: StepItem[] = [
  { n: "01", title: "Create an account", text: "Sign up with your school details and give your informed consent." },
  { n: "02", title: "Enter your scores", text: "JSS3 average + SS1 subject scores across your stream's core subjects." },
  { n: "03", title: "Complete the quizzes", text: "Rate your interests (RIASEC) and personality (BFI). Takes about 10 minutes." },
  { n: "04", title: "Get your result", text: "A ranked recommendation with confidence level, guidance, and a JAMB validator." },
];

/** Why StreamWise exists: the problem in numbers. These are the same
 *  verifiable figures cited in the project's Chapter 2 literature review,
 *  kept together here so a visitor gets the full context behind the engine. */
export const WHY_POINTS: WhyPoint[] = [
  {
    icon: Users,
    stat: "76%",
    title: "of 1.8 million+ candidates scored below 200 in the 2024 UTME",
    text: "Subject choices made at age 14 or 15 decide which university courses students can apply for years later. A wrong combination disqualifies them, no matter how high they score.",
    source: "JAMB 2024 UTME results",
  },
  {
    icon: HeartHandshake,
    stat: "Less than 30%",
    title: "of Nigerian secondary students have access to a school counsellor",
    text: "Most stream decisions therefore rely on informal advice from parents, teachers, and peers, often shaped by prestige rather than demonstrated aptitude.",
    source: "Guidance & counselling research",
  },
  {
    icon: BookOpen,
    stat: "2025/26",
    title: "The NERDC reform adds trade and digital subjects",
    text: "The revised curriculum introduces a compulsory trade subject and Digital Technologies: two more decisions at age 14 or 15, with no Nigerian tool yet built to guide them.",
    source: "NERDC / Federal Ministry of Education",
  },
];
