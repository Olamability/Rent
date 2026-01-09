const stats = [
  { value: "$2.5B+", label: "Rent Collected" },
  { value: "50K+", label: "Properties Managed" },
  { value: "99.9%", label: "Uptime Guarantee" },
  { value: "4.9/5", label: "Customer Rating" },
];

const Stats = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-primary">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-accent mb-1 sm:mb-2">
                {stat.value}
              </div>
              <div className="text-primary-foreground/70 text-xs sm:text-sm lg:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
