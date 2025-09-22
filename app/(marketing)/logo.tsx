import Icon from "@/components/icon";

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Icon size={20} />
        <div className="from-accent-purple via-accent-pink to-accent-orange absolute inset-0 bg-gradient-to-r opacity-50 blur-xl" />
      </div>
      <span className={`font-display text-xl font-bold`}>VES</span>
    </div>
  );
}
