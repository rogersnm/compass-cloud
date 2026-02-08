import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GitCommitHorizontal,
  GitBranch,
  Building2,
  Terminal,
} from "lucide-react";

const features = [
  {
    icon: GitCommitHorizontal,
    title: "Version History",
    description:
      "Every edit to tasks and documents creates a new version. Browse the full history, compare diffs, and never lose context.",
  },
  {
    icon: GitBranch,
    title: "Task Dependencies",
    description:
      "Model work as a directed acyclic graph. Compass surfaces what to work on next based on dependency ordering.",
  },
  {
    icon: Building2,
    title: "Multi-Org Support",
    description:
      "Invite teammates, manage roles, and switch between organizations. Scoped API keys keep integrations isolated.",
  },
  {
    icon: Terminal,
    title: "CLI-First Workflow",
    description:
      "Full-featured CLI with device auth, shell completions, and markdown-native task bodies. Designed for terminals.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-border/60 px-6 py-4 shadow-[0_1px_3px_0_rgba(37,99,235,0.04)]">
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

      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center gap-10 px-6 py-28 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background to-accent/40" />
        <div className="relative mx-auto max-w-2xl space-y-5">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Project tracking
            <br />
            <span className="text-primary">built for developers</span>
          </h1>
          <p className="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground">
            Version history, dependency ordering, and a CLI-first workflow.
            Markdown in, structured data out.
          </p>
        </div>
        <div className="relative flex gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Everything you need to ship
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <Card
                key={f.title}
                className="transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
              >
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
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

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground/60">Compass Cloud</p>
        <p className="mt-1">
          Built for developers &middot; &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
