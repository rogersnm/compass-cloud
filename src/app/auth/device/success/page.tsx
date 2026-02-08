import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DeviceSuccessPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(37,99,235,0.12)_0%,_transparent_60%)]" />
      <div className="relative w-full max-w-md">
        <Card className="w-full text-center shadow-lg shadow-primary/5 border-border/60">
          <CardHeader>
            <div className="mx-auto mb-2 text-5xl text-primary">&#10003;</div>
            <CardTitle className="text-2xl">Device Authorized</CardTitle>
            <CardDescription>
              Your CLI has been authorized. You can close this tab.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
