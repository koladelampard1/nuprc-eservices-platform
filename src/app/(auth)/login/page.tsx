import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md pt-16">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to NUPRC Platform</CardTitle>
          <CardDescription>Demo credentials are seeded. Auth.js integration is scaffolded for production hardening.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" type="email" placeholder="operator@deltaenergy.ng" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button className="w-full">Sign in (placeholder)</Button>
          <p className="text-xs text-muted-foreground">Next step: wire this form to Auth.js signIn() with credentials provider.</p>
        </CardContent>
      </Card>
    </div>
  );
}
