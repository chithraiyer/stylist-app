import { getSettings } from "@/lib/auth";

export default async function Privacy() {
  const s = await getSettings();
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h2>Privacy &amp; your photos</h2>
      <p className="muted">We take your photos seriously. Here is exactly what happens to them.</p>
      <div className="section">
        <h4>Who can see your photos</h4>
        <ul>
          <li>You. Your photos are stored in private storage that is never public and has no shareable link.</li>
          <li>{s.stylist_name}, <b>only</b> if you ask her for a personal review of that look.</li>
          <li>No other user can ever see your photos, your requests or your feedback.</li>
        </ul>
      </div>
      <div className="section">
        <h4>How photos are used</h4>
        <ul>
          <li>Photos are shrunk on your device before upload.</li>
          <li>For your instant first look, your photos are sent to an AI service (Anthropic's Claude) to analyse. They are used only to answer your request and are not used for advertising.</li>
          <li>When we show your photos to you, we use temporary links that expire after an hour.</li>
        </ul>
      </div>
      <div className="section">
        <h4>Your feedback</h4>
        <ul>
          <li>Your ratings and comments are visible to {s.stylist_name}, with your name, so she can improve her advice.</li>
          <li>Feedback is also summarised, <b>without names or photos</b>, into general style rules that improve suggestions for everyone.</li>
        </ul>
      </div>
      <div className="section">
        <h4>Payments</h4>
        <ul>
          <li>Payments are handled by Stripe. We never see or store your card details.</li>
        </ul>
      </div>
      <div className="section">
        <h4>Deleting your data</h4>
        <ul>
          <li>Ask {s.stylist_name} at any time and your account, photos and history will be deleted.</li>
        </ul>
      </div>
    </div>
  );
}
