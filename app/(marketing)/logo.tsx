import Icon from "@/components/icon";

export function Logo() {
  const sizeClasses = {
    sm: { icon: "w-6 h-6", text: "text-xl" },
    md: { icon: "w-8 h-8", text: "text-2xl" },
    lg: { icon: "w-10 h-10", text: "text-3xl" },
  };

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
