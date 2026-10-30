// Supabase says e.g. "you can only request this after 42 seconds". Default to 60.
export const waitSeconds = (msg: string) => Number(msg.match(/(\d+)\s*second/)?.[1]) || 60;
