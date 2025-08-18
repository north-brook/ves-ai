import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy • VES AI",
  description: "Privacy Policy for VES AI. Learn how we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display mb-8 text-4xl font-bold">Privacy Policy</h1>
      <p className="text-foreground-secondary mb-8">
        Last updated: January 2025
      </p>

      <div className="prose prose-invert max-w-none space-y-12">
        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            1. Introduction
          </h2>
          <p className="text-foreground-secondary mb-4">
            Steppable Inc. (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates VES (Visual
            Evaluation System) and is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our service.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            2. Information We Collect
          </h2>

          <h3 className="font-display mt-8 mb-3 text-xl font-semibold">
            Account Information
          </h3>
          <p className="text-foreground-secondary mb-4">
            When you sign up for VES, we collect:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Name and email address (via Google authentication)</li>
            <li>Google account identifier</li>
            <li>Company/organization name</li>
            <li>
              Billing information (processed securely through our payment
              provider)
            </li>
          </ul>

          <h3 className="font-display mt-8 mb-3 text-xl font-semibold">
            Integration Data
          </h3>
          <p className="text-foreground-secondary mb-4">
            Through your connected services, we access:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>PostHog session replay data and metadata</li>
            <li>Linear workspace information for ticket creation</li>
            <li>Authentication tokens for these services (stored securely)</li>
          </ul>

          <h3 className="font-display mt-8 mb-3 text-xl font-semibold">
            Usage Data
          </h3>
          <p className="text-foreground-secondary mb-4">
            We automatically collect:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Service usage patterns and feature interactions</li>
            <li>Analysis metrics and performance data</li>
            <li>Error logs and debugging information</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            3. How We Use Your Information
          </h2>
          <p className="text-foreground-secondary mb-4">
            We use the collected information to:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Provide and maintain the VES service</li>
            <li>Analyze session replays using AI to identify issues</li>
            <li>Create tickets in your Linear workspace</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send service-related notifications</li>
            <li>Improve and optimize our service</li>
            <li>Provide customer support</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            4. Data Processing and AI Analysis
          </h2>
          <p className="text-foreground-secondary mb-4">
            Our AI system processes session replay data to:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Identify bugs and technical issues</li>
            <li>Detect UX friction points</li>
            <li>Suggest product improvements</li>
            <li>Prioritize and deduplicate issues</li>
          </ul>
          <p className="text-foreground-secondary mt-4">
            AI analysis is performed on our secure servers. We do not use your
            data to train general AI models or share it with third-party AI
            services beyond what&apos;s necessary for providing VES functionality.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            5. Data Sharing and Disclosure
          </h2>
          <p className="text-foreground-secondary mb-4">
            We do not sell, trade, or rent your personal information. We may
            share your information only in these circumstances:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights, privacy, safety, or property</li>
            <li>
              With service providers who assist in operating VES (under strict
              confidentiality agreements)
            </li>
            <li>In connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            6. Data Security
          </h2>
          <p className="text-foreground-secondary mb-4">
            We implement appropriate technical and organizational measures to
            protect your data:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Encryption in transit (TLS/SSL) and at rest</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Access controls and authentication requirements</li>
            <li>Secure data centers with physical security measures</li>
            <li>Regular backups and disaster recovery procedures</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            7. Data Retention
          </h2>
          <p className="text-foreground-secondary mb-4">
            We retain your data for as long as necessary to provide our
            services:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Account information: Duration of account plus 30 days</li>
            <li>
              Session analysis data: 90 days or your configured retention period
            </li>
            <li>
              Billing records: As required by tax and accounting regulations
            </li>
            <li>Aggregated analytics: Indefinitely (anonymized)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            8. Your Rights and Choices
          </h2>
          <p className="text-foreground-secondary mb-4">
            You have the right to:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a portable format</li>
            <li>Opt-out of marketing communications</li>
            <li>Withdraw consent for data processing</li>
          </ul>
          <p className="text-foreground-secondary mt-4">
            To exercise these rights, contact us at privacy@ves.ai.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            9. Cookies and Tracking
          </h2>
          <p className="text-foreground-secondary mb-4">
            We use cookies and similar technologies to:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Maintain your session and authentication state</li>
            <li>Remember your preferences</li>
            <li>Analyze service usage (via privacy-focused analytics)</li>
          </ul>
          <p className="text-foreground-secondary mt-4">
            We do not use third-party tracking cookies or advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            10. International Data Transfers
          </h2>
          <p className="text-foreground-secondary mb-4">
            Your information may be transferred to and processed in countries
            other than your own. We ensure appropriate safeguards are in place
            to protect your information in accordance with this Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            11. Children&apos;s Privacy
          </h2>
          <p className="text-foreground-secondary mb-4">
            VES is not intended for use by individuals under the age of 18. We
            do not knowingly collect personal information from children under
            18. If we become aware of such collection, we will delete that
            information immediately.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            12. California Privacy Rights
          </h2>
          <p className="text-foreground-secondary mb-4">
            California residents have additional rights under the California
            Consumer Privacy Act (CCPA), including:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Right to know what personal information is collected</li>
            <li>Right to know if personal information is sold or disclosed</li>
            <li>Right to opt-out of the sale of personal information</li>
            <li>Right to non-discrimination for exercising privacy rights</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            13. GDPR Compliance
          </h2>
          <p className="text-foreground-secondary mb-4">
            For users in the European Economic Area (EEA), we process data under
            the following legal bases:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Contract: To provide our services</li>
            <li>Consent: For optional features and marketing</li>
            <li>Legitimate interests: For service improvement and security</li>
            <li>Legal obligations: To comply with applicable laws</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            14. Changes to This Policy
          </h2>
          <p className="text-foreground-secondary mb-4">
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new Privacy Policy on
            this page and updating the &quot;Last updated&quot; date. Your continued use
            of VES after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            15. Contact Information
          </h2>
          <p className="text-foreground-secondary mb-4">
            For privacy-related questions or concerns, contact us at:
          </p>
          <p className="text-foreground-secondary">
            Steppable Inc.
            <br />
            Email: team@ves.ai
            <br />
            Website: https://ves.ai
          </p>
        </section>
      </div>
    </div>
  );
}
