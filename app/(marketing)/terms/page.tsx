import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use • VES AI",
  description: "Terms of Use for VES AI's AI-powered session analysis service.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="font-display mb-8 text-4xl font-bold">Terms of Use</h1>
      <p className="text-foreground-secondary mb-8">
        Last updated: January 2025
      </p>

      <div className="prose prose-invert max-w-none space-y-12">
        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            1. Acceptance of Terms
          </h2>
          <p className="text-foreground-secondary mb-4">
            By accessing and using VES (&quot;Visual Evaluation System&quot;), a
            service provided by Steppable Inc., you accept and agree to be bound
            by the terms and provision of this agreement. If you do not agree to
            abide by the above, please do not use this service.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            2. Description of Service
          </h2>
          <p className="text-foreground-secondary mb-4">
            VES provides AI-powered session analysis services that integrate
            with PostHog for session replay monitoring and Linear for issue
            tracking. Our service analyzes user sessions to identify bugs, UX
            issues, and product improvement opportunities.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            3. User Account
          </h2>
          <p className="text-foreground-secondary mb-4">
            To use VES, you must:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Register for an account using Google authentication</li>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Promptly notify us of any unauthorized use of your account</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            4. Acceptable Use Policy
          </h2>
          <p className="text-foreground-secondary mb-4">
            You agree not to use VES to:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>Violate any laws or regulations</li>
            <li>Infringe upon the rights of others</li>
            <li>Transmit malicious code or interfere with the service</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Use the service for any illegal or unauthorized purpose</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            5. Data Processing
          </h2>
          <p className="text-foreground-secondary mb-4">
            By using VES, you acknowledge that:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>
              We process session replay data from your PostHog integration
            </li>
            <li>
              AI analysis is performed on your session data to identify issues
            </li>
            <li>
              Suggestions are automatically created in your Linear workspace
            </li>
            <li>You maintain ownership of all your data</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            6. Subscription and Billing
          </h2>
          <p className="text-foreground-secondary mb-4">
            VES offers multiple subscription tiers with different session
            analysis limits:
          </p>
          <ul className="text-foreground-secondary ml-4 list-inside list-disc space-y-2">
            <li>1 hour of free analysis</li>
            <li>Monthly subscription billing</li>
            <li>No setup fees or hidden charges</li>
            <li>Cancel anytime with no penalties</li>
          </ul>
          <p className="text-foreground-secondary mt-4">
            Subscription fees are non-refundable except as required by law.
            Downgrades take effect at the next billing cycle.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            7. Intellectual Property
          </h2>
          <p className="text-foreground-secondary mb-4">
            The VES service, including all content, features, and functionality,
            is owned by Steppable Inc. and is protected by international
            copyright, trademark, patent, trade secret, and other intellectual
            property laws.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            8. Privacy
          </h2>
          <p className="text-foreground-secondary mb-4">
            Your use of VES is also governed by our Privacy Policy. Please
            review our Privacy Policy, which also governs the Site and informs
            users of our data collection practices.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            9. Disclaimers and Limitations
          </h2>
          <p className="text-foreground-secondary mb-4">
            VES is provided &quot;as is&quot; and &quot;as available&quot;
            without any warranties of any kind, either express or implied. We do
            not guarantee that the service will be uninterrupted, secure, or
            error-free.
          </p>
          <p className="text-foreground-secondary mb-4">
            In no event shall Steppable Inc. be liable for any indirect,
            incidental, special, consequential, or punitive damages resulting
            from your use of or inability to use the service.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            10. Indemnification
          </h2>
          <p className="text-foreground-secondary mb-4">
            You agree to defend, indemnify, and hold harmless Steppable Inc. and
            its affiliates, officers, directors, employees, and agents from any
            claims, liabilities, damages, losses, and expenses arising from your
            use of VES or violation of these Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            11. Termination
          </h2>
          <p className="text-foreground-secondary mb-4">
            We may terminate or suspend your account and access to VES
            immediately, without prior notice or liability, for any reason,
            including breach of these Terms. Upon termination, your right to use
            the service will immediately cease.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            12. Governing Law
          </h2>
          <p className="text-foreground-secondary mb-4">
            These Terms shall be governed by and construed in accordance with
            the laws of the United States and the State of Delaware, without
            regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            13. Changes to Terms
          </h2>
          <p className="text-foreground-secondary mb-4">
            We reserve the right to modify these terms at any time. We will
            notify users of any material changes via email or through the
            service. Your continued use of VES after such modifications
            constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-display mt-12 mb-4 text-2xl font-bold">
            14. Contact Information
          </h2>
          <p className="text-foreground-secondary mb-4">
            For questions about these Terms, please contact us at:
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
