import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DeviceSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 text-5xl text-primary">&#10003;</div>
          <CardTitle className="text-2xl">Device Authorized</CardTitle>
          <CardDescription>
            Your CLI has been authorized. You can close this tab.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
