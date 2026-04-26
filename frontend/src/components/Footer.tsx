const Footer = () => {
  return (
    <footer className="section-black py-12 mt-16 border-t border-white/10">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <span className="font-display text-xl font-bold text-white">37°N</span>
            <span className="text-white/30 text-xs ml-2 uppercase tracking-widest">Athens</span>
            <p className="text-white/40 text-xs mt-3 leading-relaxed">Ο οδηγός σου για ψυχαγωγία και γαστρονομία στην Αθήνα.</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Εξερεύνηση</h4>
            <div className="space-y-2 text-sm">
              <a href="/movies" className="block text-white/60 hover:text-white transition-colors">Ταινίες</a>
              <a href="/theater" className="block text-white/60 hover:text-white transition-colors">Θέατρο</a>
              <a href="/dining" className="block text-white/60 hover:text-white transition-colors">Φαγητό</a>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Περιεχόμενο</h4>
            <div className="space-y-2 text-sm">
              <a href="/reviews" className="block text-white/60 hover:text-white transition-colors">Κριτικές</a>
              <a href="/venues" className="block text-white/60 hover:text-white transition-colors">Χώροι</a>
              <a href="/profile" className="block text-white/60 hover:text-white transition-colors">Προφίλ</a>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Social</h4>
            <div className="space-y-2 text-sm">
              <span className="block text-white/60">Instagram</span>
              <span className="block text-white/60">Facebook</span>
              <span className="block text-white/60">Twitter</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 text-center">
          <p className="text-xs text-white/30">© 2024 37°N Athens. Με ❤️ από την Αθήνα.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
