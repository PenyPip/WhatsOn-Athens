import { motion } from "framer-motion";
import { User, Heart, Star, Ticket } from "lucide-react";
import Footer from "@/components/Footer";

const Profile = () => {
  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl font-bold text-white">Προφίλ</h1>
          </motion.div>
        </div>
      </div>

      <div className="container max-w-2xl">
        <motion.div
          className="card-elevated p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold mb-2">Σύνδεση για περισσότερα</h2>
          <p className="text-muted-foreground text-sm mb-6">Συνδέσου για να αποθηκεύσεις αγαπημένα, να γράψεις κριτικές και να κάνεις κρατήσεις.</p>

          <div className="space-y-3 max-w-xs mx-auto">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-border text-sm font-medium hover:bg-secondary transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Σύνδεση με Google
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-border text-sm font-medium hover:bg-secondary transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Σύνδεση με Apple
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-border text-sm font-medium hover:bg-secondary transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><rect x="2" y="3" width="9" height="9" fill="#F25022"/><rect x="13" y="3" width="9" height="9" fill="#7FBA00"/><rect x="2" y="14" width="9" height="9" fill="#00A4EF"/><rect x="13" y="14" width="9" height="9" fill="#FFB900"/></svg>
              Σύνδεση με Microsoft
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {[
            { icon: Heart, title: "Αγαπημένα", desc: "Δεν υπάρχουν αποθηκεύσεις" },
            { icon: Star, title: "Κριτικές", desc: "Δεν έχεις γράψει κριτικές" },
            { icon: Ticket, title: "Κρατήσεις", desc: "Δεν υπάρχουν κρατήσεις" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="card-elevated p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
            >
              <item.icon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="font-display font-semibold mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
