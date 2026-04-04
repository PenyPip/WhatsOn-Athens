import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showtimes } from "@/data/mockData";
import { Calendar, Clock, MapPin, CheckCircle2 } from "lucide-react";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
}

type Step = 1 | 2 | 3 | 4;

const SEAT_ROWS = 6;
const SEAT_COLS = 10;

const BookingModal = ({ open, onClose, eventTitle }: BookingModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [selectedShowtime, setSelectedShowtime] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const unavailableSeats = ["A3", "A4", "B7", "C2", "C3", "D5", "E8", "F1", "F2"];

  const toggleSeat = (seat: string) => {
    if (unavailableSeats.includes(seat)) return;
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  };

  const reset = () => {
    setStep(1);
    setSelectedShowtime(null);
    setSelectedSeats([]);
    onClose();
  };

  const selectedShow = showtimes.find((s) => s.id === selectedShowtime);

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {step === 4 ? "Η Κράτηση Επιβεβαιώθηκε!" : `Κράτηση — ${eventTitle}`}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {step < 4 && (
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-secondary"}`} />
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {showtimes.map((st) => (
              <button
                key={st.id}
                onClick={() => { setSelectedShowtime(st.id); setStep(2); }}
                className={`w-full rounded-lg p-4 text-left transition-all border hover:border-primary ${
                  selectedShowtime === st.id ? "ring-1 ring-primary border-primary" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{new Date(st.datetime).toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(st.datetime).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {st.venue}
                    </p>
                    <p className="text-sm font-semibold text-primary mt-0.5">€{st.price}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs text-muted-foreground mb-4 text-center">Επιλογή Θέσης</p>
            <div className="flex flex-col items-center gap-1.5 mb-4">
              <div className="w-3/4 h-1 rounded-full bg-primary/30 mb-3" />
              <p className="text-[10px] text-muted-foreground mb-2">ΟΘΟΝΗ</p>
              {Array.from({ length: SEAT_ROWS }, (_, r) => {
                const row = String.fromCharCode(65 + r);
                return (
                  <div key={row} className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-4">{row}</span>
                    {Array.from({ length: SEAT_COLS }, (_, c) => {
                      const seat = `${row}${c + 1}`;
                      const isUnavailable = unavailableSeats.includes(seat);
                      const isSelected = selectedSeats.includes(seat);
                      return (
                        <button
                          key={seat}
                          onClick={() => toggleSeat(seat)}
                          disabled={isUnavailable}
                          className={`w-6 h-6 rounded text-[9px] font-medium transition-all ${
                            isUnavailable
                              ? "bg-muted text-muted-foreground/30 cursor-not-allowed"
                              : isSelected
                              ? "bg-primary text-primary-foreground scale-110"
                              : "bg-secondary text-secondary-foreground hover:bg-primary/20"
                          }`}
                        >
                          {c + 1}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground mb-4">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary inline-block" /> Διαθέσιμη</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary inline-block" /> Επιλεγμένη</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted inline-block" /> Κατειλημμένη</span>
            </div>
            <Button className="w-full" disabled={selectedSeats.length === 0} onClick={() => setStep(3)}>
              Συνέχεια με {selectedSeats.length} θέσ{selectedSeats.length !== 1 ? "εις" : "η"}
            </Button>
          </div>
        )}

        {step === 3 && selectedShow && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Εκδήλωση</span>
                <span className="font-medium">{eventTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ημερομηνία</span>
                <span>{new Date(selectedShow.datetime).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ώρα</span>
                <span>{new Date(selectedShow.datetime).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Χώρος</span>
                <span>{selectedShow.venue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Θέσεις</span>
                <span>{selectedSeats.join(", ")}</span>
              </div>
              <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm font-semibold">
                <span>Σύνολο</span>
                <span className="text-primary">€{selectedShow.price * selectedSeats.length}</span>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(4)}>
              Επιβεβαίωση & Πληρωμή
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">Η κράτησή σας επιβεβαιώθηκε.</p>
            <div className="w-32 h-32 mx-auto rounded-lg bg-secondary flex items-center justify-center">
              <span className="text-xs text-muted-foreground">QR Code</span>
            </div>
            <p className="text-xs text-muted-foreground">Δείξτε αυτό το QR code στον χώρο</p>
            <Button variant="outline" onClick={reset}>Τέλος</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
