import { api, ApiError } from "../api";

// Cancel a reservation. Returns true when it was cancelled.
// A booking with payments needs the owner or a manager, who also cancels the payments.
export async function cancelReservation(
  booking: { id: string; amountPaid: number; guest: { fullName: string } },
  canCancelPaid: boolean
): Promise<boolean> {
  const paid = Number(booking.amountPaid);
  let cancelPayments = false;

  if (paid > 0) {
    if (!canCancelPaid) {
      alert(
        `This booking has ${paid.toLocaleString()} ETB in payments. Ask the owner or a manager to cancel it.`
      );
      return false;
    }

    const confirmed = window.confirm(
      `This booking has ${paid.toLocaleString()} ETB in payments.\nCancelling it also cancels those payments and removes them from the Z Report.\nContinue?`
    );

    if (!confirmed) return false;

    cancelPayments = true;
  }

  const reason = window.prompt(
    `Cancel the reservation of ${booking.guest.fullName}? Write a short reason. You can leave it empty.`
  );

  if (reason === null) return false;

  try {
    await api.post(`/bookings/${booking.id}/cancel`, {
      reason: reason.trim() || undefined,
      cancelPayments,
    });
    return true;
  } catch (err) {
    alert(err instanceof ApiError ? err.message : "Could not cancel the reservation.");
    return false;
  }
}