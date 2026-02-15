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
  Tailwind,
  Text,
} from "@react-email/components";

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
                  backgroundColor: "#6c47ff",
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
