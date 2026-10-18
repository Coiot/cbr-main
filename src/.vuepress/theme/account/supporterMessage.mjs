export const EXPIRED_SUPPORTER_MESSAGE = 'Thank you for supporting CBR! Your supporter access has ended, but you can donate again anytime to bring back your perks. Your saved preferences are still here.';
export function supporterMessage(access) {
  if (access?.allowed) return 'Supporter account. Thank you!';
  if (access?.status === 'expired') return EXPIRED_SUPPORTER_MESSAGE;
  return 'No current donation access was found for this email. If you donated recently, sign in with your Ko-fi payment email and check again.';
}
