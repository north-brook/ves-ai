import { AgentCards } from "../components/agent-cards";
import { Footer } from "../components/footer";
import { GettingStarted } from "../components/getting-started";
import { Hero } from "../components/hero";
import { Integrations } from "../components/integrations";
import { Nav } from "../components/nav";
import { Pipeline } from "../components/pipeline";
import { Problem } from "../components/problem";
import { Solution } from "../components/solution";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Pipeline />
        <AgentCards />
        <Integrations />
        <GettingStarted />
      </main>
      <Footer />
    </>
  );
}
