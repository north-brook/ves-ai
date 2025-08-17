import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import {
  Plug,
  Eye,
  ListChecks,
  Bug,
  Lightbulb,
  Zap,
  Activity,
} from "lucide-react";

const url = process.env.APP_URL || "https://ves.ai";

interface InviteEmailProps {
  inviterName: string;
  projectName: string;
}

export default function InviteEmail({
  inviterName,
  projectName,
}: InviteEmailProps) {
  const loginUrl = `${url}/login`;

  return (
    <Html>
      <Tailwind>
        <Head />
        <Preview>
          {inviterName} invited you to {projectName} on VES AI
        </Preview>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto my-8 max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {/* Logo Section */}
            <Section className="mb-8">
              <Img
                src={`${url}/icon.png`}
                alt="VES AI"
                width={80}
                height={80}
                className="mx-auto"
              />
              <Text className="mt-3 text-center text-2xl font-bold text-gray-900">
                VES AI
              </Text>
            </Section>

            {/* Main Heading */}
            <Heading className="mb-6 text-center text-3xl font-semibold text-gray-900">
              You're invited to {projectName}
            </Heading>

            <Text className="mb-8 text-center text-lg text-gray-600">
              {inviterName} has invited you to collaborate on VES AI.
            </Text>

            {/* CTA Button */}
            <Section className="mb-8 text-center">
              <Button
                href={loginUrl}
                style={{
                  display: "inline-block",
                  borderRadius: "8px",
                  background:
                    "linear-gradient(to right, #6c47ff, #ff4d94, #ff8a3d)",
                  padding: "16px 32px",
                  fontWeight: "600",
                  color: "white",
                  textDecoration: "none",
                }}
              >
                Accept Invitation & Sign In
              </Button>
            </Section>

            {/* URL Fallback */}
            <Text className="mb-3 text-center text-sm text-gray-500">
              or copy and paste this URL into your browser:
            </Text>

            <Section className="mb-8 text-center">
              <div
                style={{
                  display: "inline-block",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "9999px",
                  padding: "8px 16px",
                }}
              >
                <Text
                  className="font-mono text-xs text-gray-600"
                  style={{ margin: 0 }}
                >
                  {loginUrl}
                </Text>
              </div>
            </Section>

            <Hr className="my-8 border-gray-200" />

            {/* How it Works Section */}
            <Section className="mb-8">
              <Heading className="mb-4 text-xl font-semibold text-gray-900">
                How It Works
              </Heading>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #6c47ff, #ff4d94)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Plug size={18} color="white" />
                  </div>
                  <div style={{ paddingTop: "4px" }}>
                    <Text className="font-semibold text-gray-900" style={{ margin: 0, marginBottom: "2px" }}>
                      1. Connect PostHog
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ margin: 0 }}>
                      We instantly start watching every session replay.
                    </Text>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #ff4d94, #ff8a3d)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={18} color="white" />
                  </div>
                  <div style={{ paddingTop: "4px" }}>
                    <Text className="font-semibold text-gray-900" style={{ margin: 0, marginBottom: "2px" }}>
                      2. AI Review
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ margin: 0 }}>
                      Every session is analyzed for bugs, friction points, and opportunities.
                    </Text>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #ff8a3d, #6c47ff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ListChecks size={18} color="white" />
                  </div>
                  <div style={{ paddingTop: "4px" }}>
                    <Text className="font-semibold text-gray-900" style={{ margin: 0, marginBottom: "2px" }}>
                      3. Action in Linear
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ margin: 0 }}>
                      Clear, prioritized tickets appear in your backlog automatically.
                    </Text>
                  </div>
                </div>
              </div>
            </Section>

            <Hr className="my-8 border-gray-200" />

            {/* Why Use VES Section */}
            <Section className="mb-8">
              <Heading className="mb-4 text-xl font-semibold text-gray-900">
                Why Use VES
              </Heading>

              <Section className="space-y-3 rounded-lg bg-gray-50 p-6">
                <div className="flex gap-3">
                  <Bug 
                    size={20} 
                    color="#6c47ff" 
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div style={{ paddingTop: "2px" }}>
                    <Text className="font-semibold text-gray-900" style={{ margin: 0, marginBottom: "2px" }}>
                      Catch every issue
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ margin: 0 }}>
                      No more relying on random QA or user complaints
                    </Text>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Lightbulb 
                    size={20} 
                    color="#ff4d94" 
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div style={{ paddingTop: "2px" }}>
                    <Text className="font-semibold text-gray-900" style={{ margin: 0, marginBottom: "2px" }}>
                      Ship better features
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ margin: 0 }}>
                      Ideas come from real user behavior
                    </Text>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Zap 
                    size={20} 
                    color="#ff8a3d" 
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div style={{ paddingTop: "2px" }}>
                    <Text className="font-semibold text-gray-900" style={{ margin: 0, marginBottom: "2px" }}>
                      Save PM time
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ margin: 0 }}>
                      AI handles the review work for you
                    </Text>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Activity 
                    size={20} 
                    color="#6c47ff" 
                    style={{ flexShrink: 0, marginTop: "2px" }}
                  />
                  <div style={{ paddingTop: "2px" }}>
                    <Text className="font-semibold text-gray-900" style={{ margin: 0, marginBottom: "2px" }}>
                      No workflow changes
                    </Text>
                    <Text className="text-sm text-gray-600" style={{ margin: 0 }}>
                      Everything appears in Linear
                    </Text>
                  </div>
                </div>
              </Section>
            </Section>

            <Hr className="mb-6 border-gray-200" />

            {/* Footer */}
            <Section>
              <Text className="mb-2 text-center text-sm text-gray-500">
                Questions? Reach out to us at{" "}
                <Link
                  href="mailto:team@ves.ai"
                  className="text-purple-600 underline"
                >
                  team@ves.ai
                </Link>
              </Text>

              <Text className="text-center text-xs text-gray-400">
                VES AI - Watch every session, catch every bug, ship better
                features faster
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Preview props for development
InviteEmail.PreviewProps = {
  inviterName: "Sarah Johnson",
  projectName: "Acme Dashboard",
} as InviteEmailProps;