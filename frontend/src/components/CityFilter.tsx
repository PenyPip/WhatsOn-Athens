import { useState } from "react";

const cities = ["All", "Athens", "Thessaloniki"];

const CityFilter = () => {
  const [active, setActive] = useState("All");

  return (
    <div className="flex items-center gap-2 py-4">
      {cities.map((city) => (
        <button
          key={city}
          onClick={() => setActive(city)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            active === city
              ? "bg-primary text-primary-foreground"
              : "glass-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {city}
        </button>
      ))}
    </div>
  );
};

export default CityFilter;
