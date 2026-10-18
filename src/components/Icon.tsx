import {
  BadgeDollarSign, Bath, Bike, Sailboat, Briefcase, Calendar, Camera, Check, ChevronDown, Clock, Coffee, Compass, Flag, Headset, Heart, Home, Landmark, Lamp, MapPin,
  Mountain, Palette, TreePalm, Plane, RefreshCw, Search, Ship, ShieldCheck, ShoppingBag, Sparkles, Star, Sun, Sunset, TrainFront, Trees, User, Users, Utensils, Waves, X, Footprints, Bus,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  "badge-dollar": BadgeDollarSign, bath: Bath, bike: Bike, boat: Sailboat, briefcase: Briefcase, calendar: Calendar, camera: Camera, check: Check, chevron: ChevronDown,
  clock: Clock, coffee: Coffee, compass: Compass, flag: Flag, headset: Headset, heart: Heart, home: Home, landmark: Landmark, lamp: Lamp, pin: MapPin, mountain: Mountain,
  palette: Palette, palmtree: TreePalm, plane: Plane, refresh: RefreshCw, search: Search, ship: Ship, shield: ShieldCheck, shopping: ShoppingBag, sparkles: Sparkles,
  star: Star, sun: Sun, sunset: Sunset, train: TrainFront, trees: Trees, user: User, users: Users, utensils: Utensils, waves: Waves, x: X,
  walking: Footprints, coach: Bus, flight: Plane, cruise: Ship,
};

export function Icon({ name, className = "size-5", label }: { name: string; className?: string; label?: string }) {
  const C = map[name] ?? Compass;
  return <C className={className} aria-hidden={label ? undefined : true} aria-label={label} strokeWidth={1.75} />;
}
