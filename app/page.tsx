import { redirect } from "next/navigation";

// Root page — redirect to incident list.
export default function Home() {
  redirect("/incidents");
}
