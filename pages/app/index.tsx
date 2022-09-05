import { signOut } from "next-auth/react";

export default function App() {
  return (
    <div>
      <h1>App</h1>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
