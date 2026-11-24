import type { ComponentType } from "react";

export interface TemplateData {
  name?: string;
  renewal?: boolean;
  amount?: string;
  scans?: number;
  expires?: string;
  paymentId?: string;
  email?: string;
}

export interface TemplateEntry {
  component: ComponentType<TemplateData>;
  subject: string | ((data: TemplateData) => string);
  displayName?: string;
  previewData?: TemplateData;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as welcome } from "./welcome";
import { template as passReceipt } from "./pass-receipt";
import { template as newSignupAlert } from "./new-signup-alert";

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcome,
  "pass-receipt": passReceipt,
  "new-signup-alert": newSignupAlert,
  // Add templates here as they are created, e.g.:
  // 'welcome': welcomeTemplate,
};
