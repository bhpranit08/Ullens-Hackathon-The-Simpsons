import type { Hazard, Location } from "@/lib/types";
export type MapProps = {
  hazards?: Hazard[];
  location?: Location;
  route?: Location[];
  selected?: Location;
  onSelect?: (p: Location) => void;
  height?: number;
};
export const kathmandu = { lat: 27.7172, lng: 85.324 };
