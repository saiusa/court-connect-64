import basketball from "@/assets/basketball.jpg";
import badminton from "@/assets/badminton.jpg";
import gym from "@/assets/gym.jpg";
import soccer from "@/assets/soccer.jpg";
import tennis from "@/assets/tennis.jpg";
import hero from "@/assets/hero.jpg";

const map: Record<string, string> = {
  "/src/assets/basketball.jpg": basketball,
  "/src/assets/badminton.jpg": badminton,
  "/src/assets/gym.jpg": gym,
  "/src/assets/soccer.jpg": soccer,
  "/src/assets/tennis.jpg": tennis,
  "/src/assets/hero.jpg": hero,
};

export function resolveFacilityImage(url?: string | null, sport?: string | null): string {
  if (url && map[url]) return map[url];
  if (url && /^https?:\/\//.test(url)) return url;
  const s = (sport || "").toLowerCase();
  if (s.includes("basket")) return basketball;
  if (s.includes("badm")) return badminton;
  if (s.includes("gym")) return gym;
  if (s.includes("soccer") || s.includes("foot")) return soccer;
  if (s.includes("tennis")) return tennis;
  return hero;
}
