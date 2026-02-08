export default function DeviceSuccessPage() {
  return (
    <div
      style={{
        maxWidth: 400,
        margin: "120px auto",
        textAlign: "center",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Device Authorized</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Your CLI has been authorized. You can close this tab.
      </p>
    </div>
  );
}
