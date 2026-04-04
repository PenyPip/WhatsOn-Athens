import { useState } from "react";

const cities = ["Όλα", "Αθήνα", "Θεσσαλονίκη"];

const CityFilter = () => {
  const [active, setActive] = useState("Όλα");

  return (
    <div className="flex items-center gap-2 py-4">
      {cities.map((city) => (
        <button
          key={city}
          onClick={() => setActive(city)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
            active === city
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary hover:text-primary"
          }`}
        >
          {city}
        </button>
      ))}
    </div>
  );
};

export default CityFilter;
