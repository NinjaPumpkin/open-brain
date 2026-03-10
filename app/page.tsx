import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, Shield, Plug } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            <span className="text-xl font-bold">Open Brain</span>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/login?tab=signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Your AI that actually
          <br />
          <span className="text-primary">knows you</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          A personal AI assistant with persistent memory. Capture thoughts,
          documents, and ideas — then have intelligent conversations powered by
          everything you&apos;ve saved. Bring your own AI model.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/login?tab=signup">
            <Button size="lg">Start for free</Button>
          </Link>
        </div>

        <div className="mx-auto mt-24 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Brain,
              title: "Persistent Memory",
              desc: "Your AI remembers everything you tell it — thoughts, links, documents, images.",
            },
            {
              icon: MessageSquare,
              title: "Smart Chat",
              desc: "Converse naturally. It searches your memory and answers with what it knows about you.",
            },
            {
              icon: Shield,
              title: "Your Data, Your Keys",
              desc: "Bring your own API key. Your memories are isolated and encrypted. No one else can see them.",
            },
            {
              icon: Plug,
              title: "Multi-Source Capture",
              desc: "Save from Telegram, web, files, or directly in the app. Everything searchable in one place.",
            },
          ].map((feature) => (
            <div key={feature.title} className="text-left">
              <feature.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
