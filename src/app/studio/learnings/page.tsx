import { getSettings } from "@/lib/auth";
import LearningsEditor from "./LearningsEditor";

export default async function Learnings() {
  const s = await getSettings();
  return (
    <div className="card">
      <h3>Learnings for everyone</h3>
      <p className="small muted">
        These rules are added to every AI first look for all clients. “Draft from feedback” has the AI summarise
        patterns in client feedback, without names or photos. Edit the draft, then save. Each client's own feedback is
        also used automatically to personalise their next looks.
      </p>
      <LearningsEditor initial={s.learnings} />
    </div>
  );
}
