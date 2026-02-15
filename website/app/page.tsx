import { AgentCards } from "../components/agent-cards";
import { Footer } from "../components/footer";
import { GettingStarted } from "../components/getting-started";
import { Hero } from "../components/hero";
import { Integrations } from "../components/integrations";
import { Nav } from "../components/nav";
import { Pipeline } from "../components/pipeline";
import { TerminalShowcase } from "../components/terminal";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Pipeline />
        <TerminalShowcase />
        <AgentCards />
        <Integrations />
        <GettingStarted />
      </main>
      <Footer />
    </>
  );
}
