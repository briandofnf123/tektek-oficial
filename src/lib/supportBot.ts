/**
 * Constants for the official TekTek Support bot.
 * Backed by a real auth.users row + profile created via migration.
 */
export const SUPPORT_BOT = {
  user_id: "00000000-0000-0000-0000-0000000000b0",
  username: "tektek_support",
  display_name: "TekTek Support",
  avatar_url: "https://api.dicebear.com/9.x/bottts/svg?seed=tektek-support",
  bio: "Bot oficial de suporte. Conta o que está rolando — respondo em segundos.",
  verified: true,
} as const;
