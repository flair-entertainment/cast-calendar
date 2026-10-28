export function SignOut({ dark = false }: { dark?: boolean }) {
  return (
    <form action="/auth/signout" method="post">
      <button className={`text-sm underline ${dark ? "text-beige" : "text-muted"}`}>Log out</button>
    </form>
  );
}
