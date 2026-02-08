import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Version History",
    description:
      "Every edit to tasks and documents creates a new version. Browse the full history, compare diffs, and never lose context.",
  },
  {
    title: "Task Dependencies",
    description:
      "Model work as a directed acyclic graph. Compass surfaces what to work on next based on dependency ordering.",
  },
  {
    title: "Multi-Org Support",
    description:
      "Invite teammates, manage roles, and switch between organizations. Scoped API keys keep integrations isolated.",
  },
  {
    title: "CLI-First Workflow",
    description:
      "Full-featured CLI with device auth, shell completions, and markdown-native task bodies. Designed for terminals.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-bold tracking-tight">Compass</span>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </nav>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Track tasks and documents
            <br />
            <span className="text-muted-foreground">with precision</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Headless project tracking with version history, dependency ordering,
            and a CLI built for developers. Markdown in, structured data out.
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="border-t bg-muted/40 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Built for engineers who ship
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {f.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        Compass Cloud
      </footer>
    </main>
  );
}
