import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, QrCode } from "lucide-react";
import { createBooking, Showtime } from "@/lib/strapi";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  showtimes: Showtime[];
  preselectedShowtimeId?: number | null;
}

type Step = "select" | "details" | "confirm";

const BookingModal = ({ open, onClose, eventTitle, showtimes, preselectedShowtimeId }: BookingModalProps) => {
  const [step, setStep] = useState<Step>("select");
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(preselectedShowtimeId || null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const selectedShowtime = showtimes.find((s) => s.id === selectedShowtimeId);

  const handleSeatToggle = (seat: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : prev.length < 8 ? [...prev, seat] : prev
    );
  };

  const handleConfirm = async () => {
    if (!selectedShowtimeId || !userName || !userEmail) return;
    setLoading(true);
    try {
      const result = await createBooking({
        user_name: userName,
        user_email: userEmail,
        seat_numbers: selectedSeats,
        showtime_id: selectedShowtimeId,
      });
      setBooking(result);
      setStep("confirm");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedShowtimeId(preselectedShowtimeId || null);
    setSelectedSeats([]);
    setUserName("");
    setUserEmail("");
    setBooking(null);
    onClose();
  };

  // Generate seat grid (10x8)
  const rows = ["A","B","C","D","E","F","G","H"];
  const cols = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {step === "confirm" ? "Booking Confirmed!" : `Book — ${eventTitle}`}
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">Select a showtime</p>
              <div className="space-y-2">
                {showtimes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No showtimes available.</p>
                )}
                {showtimes.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedShowtimeId(st.id)}
                    className={`w-full text-left glass-card rounded-lg p-3 transition-all ${selectedShowtimeId === st.id ? "border-primary" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold">
                          {new Date(st.datetime).toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" })}
                          {" · "}
                          {new Date(st.datetime).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {st.venue && <p className="text-xs text-muted-foreground">{st.venue.name}</p>}
                      </div>
                      <span className="text-primary font-bold">€{st.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedShowtime && (
              <div>
                <p className="text-sm font-medium mb-2">Select seats <span className="text-muted-foreground">(max 8)</span></p>
                <div className="text-center mb-2">
                  <div className="inline-block border-b-2 border-primary/40 w-32 mb-3 text-xs text-muted-foreground">SCREEN</div>
                </div>
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    {rows.map((row) => (
                      <div key={row} className="flex gap-1 mb-1 items-center">
                        <span className="text-xs text-muted-foreground w-4">{row}</span>
                        {cols.map((col) => {
                          const seat = `${row}${col}`;
                          const taken = Math.random() < 0.25;
                          const selected = selectedSeats.includes(seat);
                          return (
                            <button
                              key={seat}
                              disabled={taken}
                              onClick={() => handleSeatToggle(seat)}
                              className={`w-6 h-6 rounded-sm text-xs transition-all ${
                                taken ? "bg-muted cursor-not-allowed opacity-40" :
                                selected ? "bg-primary text-primary-foreground" :
                                "bg-secondary hover:bg-secondary/80"
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-secondary inline-block" /> Available</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Selected</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted opacity-40 inline-block" /> Taken</span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedShowtimeId || selectedSeats.length === 0}
              onClick={() => setStep("details")}
            >
              Continue ({selectedSeats.length} seat{selectedSeats.length !== 1 ? "s" : ""})
            </Button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <div className="glass-card rounded-lg p-3 text-sm">
              <p className="font-semibold">{eventTitle}</p>
              {selectedShowtime && (
                <p className="text-muted-foreground text-xs mt-1">
                  {new Date(selectedShowtime.datetime).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
                  {" · "}
                  {new Date(selectedShowtime.datetime).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                  {selectedShowtime.venue ? ` · ${selectedShowtime.venue.name}` : ""}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">Seats: {selectedSeats.join(", ")}</p>
              {selectedShowtime && (
                <p className="text-primary font-bold mt-1">Total: €{(selectedShowtime.price * selectedSeats.length).toFixed(2)}</p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-sm">Full name</Label>
                <Input id="name" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Γιάννης Παπαδόπουλος" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input id="email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>Back</Button>
              <Button
                className="flex-1"
                disabled={!userName || !userEmail || loading}
                onClick={handleConfirm}
              >
                {loading ? "Confirming..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="w-12 h-12 text-primary mx-auto" />
            <div>
              <p className="font-display text-xl font-bold mb-1">You're in!</p>
              <p className="text-muted-foreground text-sm">Confirmation sent to {userEmail}</p>
            </div>
            <div className="glass-card rounded-lg p-4 inline-block">
              <QrCode className="w-20 h-20 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-mono">{booking?.qr_code || "WHATSON-CONFIRMED"}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>{selectedSeats.join(", ")}</p>
            </div>
            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
